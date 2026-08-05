import { getSessionUser } from "@/lib/auth/session";
import { pushDeviceRepository } from "@/lib/db/repositories/push-device.repository";
import {
  registerPushDeviceSchema,
  unregisterPushDeviceSchema,
} from "@/lib/domain/auth/mobile";
import { AppError } from "@/lib/utils/errors";

export async function registerPushDevice(input: unknown) {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  const parsed = registerPushDeviceSchema.parse(input);
  if (user.mobileApp && user.mobileApp !== parsed.app) {
    throw new AppError("FORBIDDEN", "Token app does not match device app.", 403);
  }

  if (parsed.app === "staff" && user.role !== "STORE_MANAGER") {
    throw new AppError("FORBIDDEN", "Staff account required.", 403);
  }
  if (parsed.app === "diner" && user.role !== "DINER") {
    throw new AppError("FORBIDDEN", "Diner account required.", 403);
  }

  return pushDeviceRepository.upsert({
    userId: user.id,
    expoPushToken: parsed.expoPushToken,
    platform: parsed.platform,
    app: parsed.app,
  });
}

export async function unregisterPushDevice(input: unknown) {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }
  const parsed = unregisterPushDeviceSchema.parse(input);
  await pushDeviceRepository.deleteForUser(user.id, parsed.expoPushToken);
  return { ok: true as const };
}
