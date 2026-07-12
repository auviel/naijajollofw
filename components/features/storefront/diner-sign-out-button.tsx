"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "@/components/ui/icons";

export function DinerSignOutButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-9 w-full gap-2 px-3"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      Sign out
    </Button>
  );
}
