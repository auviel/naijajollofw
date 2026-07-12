import bcrypt from "bcryptjs";
import { customerRepository } from "@/lib/db/repositories/customer.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { dinerRegisterSchema } from "@/lib/domain/diner/validation";
import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";
import { sendEmailInBackground } from "@/lib/integrations/email/send";
import { buildWelcomeEmail } from "@/lib/integrations/email/templates";
import { verifyTurnstileToken } from "@/lib/integrations/turnstile/verify";
import { assertPasswordNotPwned } from "@/lib/integrations/hibp/pwned-passwords";
import { ensureCustomerForDiner } from "@/lib/services/customer/ensure-customer-for-diner";
import { sendDinerEmailVerification } from "@/lib/services/diner/email-verification";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
import { AppError } from "@/lib/utils/errors";
import { normalizeCanadianPhone } from "@/lib/utils/phone";
import { logger } from "@/lib/utils/logger";

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
  await assertPasswordNotPwned(parsed.password);

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
      "Could not create this account. If you already have one, sign in instead.",
      409,
    );
  }

  const storeId = await resolvePublicStoreId();
  const passwordHash = await bcrypt.hash(parsed.password, 12);

  // Refuse linking if phone already belongs to another diner account
  const phoneCustomer = await customerRepository.findByPhone(storeId, phoneE164);
  if (phoneCustomer) {
    const linked = await userRepository.findByCustomerId(phoneCustomer.id);
    if (linked) {
      throw new AppError(
        "CONFLICT",
        "Could not create this account. If you already have one, sign in instead.",
        409,
      );
    }
  }

  const user = await userRepository.createDiner({
    storeId,
    email,
    name: parsed.name.trim(),
    passwordHash,
    phoneE164,
  });

  try {
    await ensureCustomerForDiner({
      userId: user.id,
      storeId,
      name: user.name,
      phoneE164,
    });
  } catch (error) {
    logger.error("diner.register.link_customer_failed", {
      userId: user.id,
      error,
    });
    throw error;
  }

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

  try {
    await sendDinerEmailVerification({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    logger.error("email_verify.send_on_register_failed", {
      userId: user.id,
      error,
    });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phoneE164: user.phoneE164 ?? phoneE164,
  };
}
