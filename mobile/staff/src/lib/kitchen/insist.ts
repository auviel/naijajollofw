import { kvGet } from "@/lib/kv";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

const KEY_SOUND = "kitchen.pref.sound";
const KEY_HAPTIC = "kitchen.pref.haptic";

let bumpSound: Audio.Sound | null = null;
let soundLoading: Promise<void> | null = null;

async function prefs() {
  const [s, h] = await Promise.all([kvGet(KEY_SOUND), kvGet(KEY_HAPTIC)]);
  return {
    sound: s == null ? true : s === "1",
    haptic: h == null ? true : h === "1",
  };
}

async function ensureBumpSound() {
  if (bumpSound) return;
  if (!soundLoading) {
    soundLoading = (async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/bump.wav"),
        { shouldPlay: false, volume: 0.7 },
      );
      bumpSound = sound;
    })().finally(() => {
      soundLoading = null;
    });
  }
  await soundLoading;
}

/** Confirm bump without looking — haptic + short click (respects prefs). */
export async function insistBumpConfirm() {
  const { sound, haptic } = await prefs();
  if (haptic) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  if (sound) {
    try {
      await ensureBumpSound();
      await bumpSound?.replayAsync();
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
