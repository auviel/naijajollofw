import { kvGet } from "@/lib/kv";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

const KEY_SOUND = "kitchen.pref.sound";
const KEY_HAPTIC = "kitchen.pref.haptic";

const bumpSource = require("../../../assets/sounds/bump.wav");

let bumpPlayer: AudioPlayer | null = null;
let soundReady: Promise<AudioPlayer | null> | null = null;

async function prefs() {
  const [s, h] = await Promise.all([kvGet(KEY_SOUND), kvGet(KEY_HAPTIC)]);
  return {
    sound: s == null ? true : s === "1",
    haptic: h == null ? true : h === "1",
  };
}

async function ensureBumpPlayer(): Promise<AudioPlayer | null> {
  if (bumpPlayer) return bumpPlayer;
  if (!soundReady) {
    soundReady = (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: false,
          shouldPlayInBackground: false,
          interruptionMode: "mixWithOthers",
        });
        const player = createAudioPlayer(bumpSource);
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

/** Confirm bump without looking — haptic + short click (respects prefs). */
export async function insistBumpConfirm() {
  const { sound, haptic } = await prefs();
  if (haptic) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  if (sound) {
    try {
      const player = await ensureBumpPlayer();
      if (!player) return;
      await player.seekTo(0);
      player.play();
    } catch {
      // Sound is best-effort; bump still succeeds.
    }
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
