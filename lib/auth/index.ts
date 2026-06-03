import type { UserRole } from "@/lib/domain/auth/types";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { authConfig } from "@/lib/auth/auth.config";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await userRepository.findByEmail(parsed.data.email);
        if (!user) {
          return null;
        }

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          storeId: user.storeId,
          storeName: user.store.name,
          role: user.role as UserRole,
        };
      },
    }),
  ],
});
