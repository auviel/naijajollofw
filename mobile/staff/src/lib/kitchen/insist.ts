import { kvGet } from "@/lib/kv";
import * as Haptics from "expo-haptics";

const KEY_SOUND = "kitchen.pref.sound";
const KEY_HAPTIC = "kitchen.pref.haptic";
const INSIST_INTERVAL_MS = 2_000;

const bumpSource = require("../../../assets/sounds/bump.wav");

type BumpPlayer = {
  volume: number;
  play: () => void;
  seekTo: (seconds: number) => Promise<void>;
};

let bumpPlayer: BumpPlayer | null = null;
let soundReady: Promise<BumpPlayer | null> | null = null;
let insistTimer: ReturnType<typeof setInterval> | null = null;
let insistPulseBusy = false;

async function prefs() {
  const [s, h] = await Promise.all([kvGet(KEY_SOUND), kvGet(KEY_HAPTIC)]);
  return {
    sound: s == null ? true : s === "1",
    haptic: h == null ? true : h === "1",
  };
}

async function ensureBumpPlayer(): Promise<BumpPlayer | null> {
  if (bumpPlayer) return bumpPlayer;
  if (!soundReady) {
    soundReady = (async () => {
      try {
        // Dynamic import so Expo Go never hard-fails on a missing AV native module.
        const audio = await import("expo-audio");
        await audio.setAudioModeAsync({
          playsInSilentMode: false,
          shouldPlayInBackground: false,
          interruptionMode: "mixWithOthers",
        });
        const player = audio.createAudioPlayer(bumpSource);
        player.volume = 0.7;
        bumpPlayer = player;
        return player;
      } catch {
        return null;
      }
    })().finally(() => {
      soundReady = null;
    });
  }
  return soundReady;
}

async function playBumpClick() {
  try {
    const player = await ensureBumpPlayer();
    if (!player) return;
    await player.seekTo(0);
    player.play();
  } catch {
    // Sound is best-effort.
  }
}

async function insistPulse() {
  if (insistPulseBusy) return;
  insistPulseBusy = true;
  try {
    const { sound, haptic } = await prefs();
    if (haptic) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (sound) {
      await playBumpClick();
    }
  } finally {
    insistPulseBusy = false;
  }
}

/** Confirm bump without looking — haptic + short click (respects prefs). */
export async function insistBumpConfirm() {
  const { sound, haptic } = await prefs();
  if (haptic) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  if (sound) {
    await playBumpClick();
  }
}

export async function insistError() {
  const { haptic } = await prefs();
  if (haptic) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export async function insistSuccess() {
  const { haptic } = await prefs();
  if (haptic) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/** Loop short chime + light haptic while insist overlay is up. */
export function startInsistAlertLoop() {
  if (insistTimer) return;
  void insistPulse();
  insistTimer = setInterval(() => {
    void insistPulse();
  }, INSIST_INTERVAL_MS);
}

export function stopInsistAlertLoop() {
  if (!insistTimer) return;
  clearInterval(insistTimer);
  insistTimer = null;
}
