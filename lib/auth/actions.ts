"use server";

import { signOut } from "@/lib/auth/index";

export async function signOutStaff() {
  await signOut({ redirectTo: "/login" });
}
