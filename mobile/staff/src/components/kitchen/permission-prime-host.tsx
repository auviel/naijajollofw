import { useAuth } from "@/lib/auth";
import { PermissionPrimeSheet } from "@/components/kitchen/permission-prime-sheet";
import { kvGet, kvSet } from "@/lib/kv";
import {
  getStaffPushPermissionStatus,
  registerStaffPushDevice,
} from "@/lib/push";
import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

const KEY_PRIMED = "kitchen.pref.notif.primed";
const KEY_PUSH = "kitchen.pref.push";

export function PermissionPrimeHost({
  onVisibilityChange,
}: {
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const evaluate = useCallback(async () => {
    if (loading || !user || Platform.OS === "web") {
      setVisible(false);
      return;
    }
    const primed = await kvGet(KEY_PRIMED);
    if (primed) {
      setVisible(false);
      return;
    }
    const status = await getStaffPushPermissionStatus();
    if (status !== "undetermined") {
      // Already decided at OS level — don't nag; mark primed so we never flash.
      await kvSet(KEY_PRIMED, status);
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [loading, user]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  const dismissPrimed = useCallback(async (value: string) => {
    await kvSet(KEY_PRIMED, value);
    setVisible(false);
  }, []);

  const onLater = useCallback(() => {
    void dismissPrimed("later");
  }, [dismissPrimed]);

  const onAllow = useCallback(async () => {
    setBusy(true);
    try {
      await kvSet(KEY_PUSH, "1");
      await registerStaffPushDevice();
      await dismissPrimed("allow");
    } finally {
      setBusy(false);
    }
  }, [dismissPrimed]);

  if (!visible) return null;

  return (
    <PermissionPrimeSheet
      busy={busy}
      onAllow={() => void onAllow()}
      onLater={onLater}
    />
  );
}
