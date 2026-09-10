"use client";

import { cn } from "@/lib/utils/cn";

/** Bar layout mirrors Hugeicons AudioWave01Icon (24×24). */
const BARS = [
  { x: 3, gain: 0.45 },
  { x: 6, gain: 0.75 },
  { x: 9, gain: 1 },
  { x: 12, gain: 0.9 },
  { x: 15, gain: 0.65 },
  { x: 18, gain: 0.8 },
  { x: 21, gain: 0.4 },
] as const;

type AmakaVoiceWaveProps = {
  /** 0–1 mic energy from speech metering */
  level: number;
  className?: string;
};

/** AudioWave-style bars that grow with voice input so listening feels alive. */
export function AmakaVoiceWave({ level, className }: AmakaVoiceWaveProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("h-4 w-4", className)}>
      {BARS.map((bar) => {
        const height = Math.min(18, 3.5 + level * 14 * bar.gain);
        const y = 12 - height / 2;
        return (
          <line
            key={bar.x}
            x1={bar.x}
            x2={bar.x}
            y1={y}
            y2={y + height}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
