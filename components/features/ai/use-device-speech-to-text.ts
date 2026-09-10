"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  item: (index: number) => SpeechRecognitionAlternativeLike | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    item: (index: number) => SpeechRecognitionResultLike | null;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isDeviceSpeechToTextSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

function pickSpeechLang(): string {
  if (typeof navigator === "undefined") return "en-NG";
  const preferred = navigator.languages ?? [navigator.language];
  for (const tag of preferred) {
    const lower = tag.toLowerCase();
    if (lower.startsWith("en")) return tag;
  }
  return "en-NG";
}

/** 0–1 voice energy for listening UI (smoothed). */
function rmsFromTimeDomain(data: Uint8Array): number {
  let sum = 0;
  for (const sample of data) {
    const v = (sample - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

export function useDeviceSpeechToText(options: {
  enabled: boolean;
  onTranscript: (text: string) => void;
}) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => isDeviceSpeechToTextSupported(),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const finalsRef = useRef("");
  const onTranscriptRef = useRef(options.onTranscript);
  const meterStreamRef = useRef<MediaStream | null>(null);
  const meterCtxRef = useRef<AudioContext | null>(null);
  const meterRafRef = useRef(0);
  const meterFallbackRef = useRef(0);
  const levelSmoothRef = useRef(0);

  useEffect(() => {
    onTranscriptRef.current = options.onTranscript;
  }, [options.onTranscript]);

  const stopMeter = useCallback(() => {
    if (meterRafRef.current) {
      cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = 0;
    }
    if (meterFallbackRef.current) {
      window.clearInterval(meterFallbackRef.current);
      meterFallbackRef.current = 0;
    }
    meterStreamRef.current?.getTracks().forEach((t) => t.stop());
    meterStreamRef.current = null;
    const ctx = meterCtxRef.current;
    meterCtxRef.current = null;
    if (ctx) void ctx.close().catch(() => undefined);
    levelSmoothRef.current = 0;
    setLevel(0);
  }, []);

  const startMeter = useCallback(async () => {
    stopMeter();
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      meterFallbackRef.current = window.setInterval(() => {
        setLevel(0.12 + Math.random() * 0.1);
      }, 140);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      meterStreamRef.current = stream;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      meterCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        const rms = rmsFromTimeDomain(data);
        const boosted = Math.min(1, Math.pow(rms * 5.5, 0.85));
        const smoothed = levelSmoothRef.current * 0.55 + boosted * 0.45;
        levelSmoothRef.current = smoothed;
        setLevel(Math.max(0.06, smoothed));
        meterRafRef.current = requestAnimationFrame(tick);
      };
      meterRafRef.current = requestAnimationFrame(tick);
    } catch {
      meterFallbackRef.current = window.setInterval(() => {
        setLevel(0.12 + Math.random() * 0.12);
      }, 140);
    }
  }, [stopMeter]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    stopMeter();
    if (!rec) {
      setListening(false);
      return;
    }
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, [stopMeter]);

  const start = useCallback(
    (currentInput: string) => {
      const Ctor = getSpeechRecognitionConstructor();
      if (!Ctor || !options.enabled) {
        setSpeechError("Voice input is not supported in this browser.");
        return;
      }

      setSpeechError(null);
      recognitionRef.current?.abort();
      stopMeter();

      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = pickSpeechLang();

      baseTextRef.current = currentInput.trimEnd();
      finalsRef.current = "";

      recognition.onresult = (event) => {
        let interim = "";
        let finals = finalsRef.current;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results.item(i);
          if (!result) continue;
          const piece = result.item(0)?.transcript ?? "";
          if (result.isFinal) {
            finals = `${finals} ${piece}`.trim();
            finalsRef.current = finals;
          } else {
            interim += piece;
          }
        }
        const spoken = `${finals} ${interim}`.trim();
        const next = [baseTextRef.current, spoken].filter(Boolean).join(" ");
        onTranscriptRef.current(next);
      };

      recognition.onerror = (event) => {
        if (event.error === "aborted" || event.error === "no-speech") {
          stopMeter();
          setListening(false);
          return;
        }
        if (event.error === "not-allowed") {
          setSpeechError("Microphone permission is blocked.");
        } else {
          setSpeechError("Could not hear that. Try again.");
        }
        stopMeter();
        setListening(false);
      };

      recognition.onend = () => {
        stopMeter();
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setListening(true);
        void startMeter();
      } catch {
        setSpeechError("Could not start voice input.");
        stopMeter();
        setListening(false);
      }
    },
    [options.enabled, startMeter, stopMeter],
  );

  const toggle = useCallback(
    (currentInput: string) => {
      if (listening) {
        stop();
        return;
      }
      start(currentInput);
    },
    [listening, start, stop],
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      stopMeter();
    };
  }, [stopMeter]);

  return {
    supported,
    listening,
    /** 0–1 mic energy while listening — drive wave animation. */
    level,
    speechError,
    clearSpeechError: () => setSpeechError(null),
    toggle,
    stop,
  };
}
