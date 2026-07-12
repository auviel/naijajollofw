import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { requireVerifiedDiner } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { dinerChangePasswordSchema } from "@/lib/domain/diner/validation";
import { assertPasswordNotPwned } from "@/lib/integrations/hibp/pwned-passwords";
import { AppError } from "@/lib/utils/errors";

function passwordsMatch(password: string, confirmPassword: string): boolean {
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(confirmPassword, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function changeDinerPassword(input: unknown): Promise<void> {
  const diner = await requireVerifiedDiner();
  const parsed = dinerChangePasswordSchema.parse(input);

  if (!passwordsMatch(parsed.password, parsed.confirmPassword)) {
    throw new AppError("VALIDATION_ERROR", "Passwords do not match.", 400);
  }

  await assertPasswordNotPwned(parsed.password);

  const user = await userRepository.findById(diner.id);
  if (!user || user.role !== "DINER") {
    throw new AppError("FORBIDDEN", "Diner account required", 403);
  }

  const currentOk = await bcrypt.compare(
    parsed.currentPassword,
    user.passwordHash,
  );
  if (!currentOk) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Current password is incorrect.",
      400,
    );
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);
  // sessionVersion increments inside updatePasswordHash
  await userRepository.updatePasswordHash(user.id, passwordHash);
}
