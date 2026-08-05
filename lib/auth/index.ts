import { authConfig } from "@/lib/auth/auth.config";
import { verifyUserCredentials } from "@/lib/auth/verify-credentials";
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
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  turnstileToken: z.string().optional(),
});

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

          const user = await verifyUserCredentials(email, parsed.data.password);
          if (!user) {
            await recordLoginFailure(email, ip);
            return null;
          }

          await clearLoginFailures(email, ip);

          return user;
        } catch (error) {
          logger.error("auth.authorize_unexpected", { error });
          return null;
        }
      },
    }),
  ],
});
