import bcrypt from "bcryptjs";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { dinerRegisterSchema } from "@/lib/domain/diner/validation";
import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";
import { sendEmailInBackground } from "@/lib/integrations/email/send";
import { buildWelcomeEmail } from "@/lib/integrations/email/templates";
import { verifyTurnstileToken } from "@/lib/integrations/turnstile/verify";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
import { AppError } from "@/lib/utils/errors";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

export type RegisteredDiner = {
  id: string;
  email: string;
  name: string;
  phoneE164: string;
};

export type RegisterDinerOptions = {
  remoteIp?: string | null;
};

export async function registerDiner(
  input: unknown,
  options: RegisterDinerOptions = {},
): Promise<RegisteredDiner> {
  const parsed = dinerRegisterSchema.parse(input);
  await verifyTurnstileToken(parsed.turnstileToken, options.remoteIp);

  const phoneE164 = normalizeCanadianPhone(parsed.phone);
  if (!phoneE164) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Enter a valid Canadian phone number.",
      400,
    );
  }

  const email = parsed.email.toLowerCase();
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError(
      "CONFLICT",
      "An account with that email already exists. Sign in instead.",
      409,
    );
  }

  const storeId = await resolvePublicStoreId();
  const passwordHash = await bcrypt.hash(parsed.password, 12);
  const user = await userRepository.createDiner({
    storeId,
    email,
    name: parsed.name.trim(),
    passwordHash,
    phoneE164,
  });

  const welcome = buildWelcomeEmail({
    name: user.name,
    accountUrl: `${getAppBaseUrl()}/account`,
  });
  sendEmailInBackground({
    to: user.email,
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
    idempotencyKey: `welcome/${user.id}`,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phoneE164: user.phoneE164 ?? phoneE164,
  };
}
