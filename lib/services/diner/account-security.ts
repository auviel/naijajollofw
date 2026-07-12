import bcrypt from "bcryptjs";
import { dinerChangeEmailSchema } from "@/lib/domain/diner/validation";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { sendDinerEmailVerification } from "@/lib/services/diner/email-verification";
import { AppError } from "@/lib/utils/errors";

export async function changeDinerEmail(
  userId: string,
  input: unknown,
): Promise<{ email: string }> {
  const parsed = dinerChangeEmailSchema.parse(input);
  const email = parsed.email.toLowerCase();

  const user = await userRepository.findById(userId);
  if (!user || user.role !== "DINER") {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  const ok = await bcrypt.compare(parsed.password, user.passwordHash);
  if (!ok) {
    throw new AppError("VALIDATION_ERROR", "Password is incorrect.", 400);
  }

  if (email === user.email) {
    return { email };
  }

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError(
      "VALIDATION_ERROR",
      "That email is already in use.",
      400,
    );
  }

  const updated = await userRepository.updateEmail(userId, email);
  await sendDinerEmailVerification({
    id: updated.id,
    email: updated.email,
    name: updated.name,
  });
  return { email: updated.email };
}
