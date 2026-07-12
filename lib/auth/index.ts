import type { UserRole } from "@/lib/domain/auth/types";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { authConfig } from "@/lib/auth/auth.config";
import { isTurnstileEnabled } from "@/lib/integrations/turnstile/config";
import { verifyTurnstileToken } from "@/lib/integrations/turnstile/verify";
import {
  clearLoginFailures,
  getLoginChallengeState,
  recordLoginFailure,
} from "@/lib/services/auth/login-protection";
import { getRequestIp } from "@/lib/utils/request-ip";
import { isAppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  turnstileToken: z.string().optional(),
});

/** Precomputed bcrypt hash so missing-user paths still pay compare cost. */
const DUMMY_PASSWORD_HASH =
  "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile", type: "text" },
      },
      authorize: async (credentials) => {
        try {
          const parsed = credentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            return null;
          }

          const email = parsed.data.email.toLowerCase();
          const ip = await getRequestIp();
          const challenge = await getLoginChallengeState(email, ip);

          if (challenge.ipBlocked) {
            logger.info("auth.login_ip_blocked");
            return null;
          }

          // Only enforce Turnstile when Siteverify is actually configured.
          // Never lock out users when the secret/site key is missing.
          if (challenge.requiresTurnstile && isTurnstileEnabled()) {
            try {
              await verifyTurnstileToken(
                parsed.data.turnstileToken || undefined,
                ip,
              );
            } catch (error) {
              if (!isAppError(error) || error.code !== "VALIDATION_ERROR") {
                logger.info("auth.turnstile_failed_on_login");
              }
              await recordLoginFailure(email, ip);
              return null;
            }
          }

          const user = await userRepository.findByEmail(email);
          const passwordValid = await bcrypt.compare(
            parsed.data.password,
            user?.passwordHash ?? DUMMY_PASSWORD_HASH,
          );

          if (!user || !passwordValid) {
            await recordLoginFailure(email, ip);
            return null;
          }

          await clearLoginFailures(email, ip);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            storeId: user.storeId,
            storeName: user.store?.name ?? "Store",
            role: user.role as UserRole,
            phoneE164: user.phoneE164 ?? null,
            sessionVersion: user.sessionVersion ?? 0,
          };
        } catch (error) {
          logger.error("auth.authorize_unexpected", { error });
          return null;
        }
      },
    }),
  ],
});
