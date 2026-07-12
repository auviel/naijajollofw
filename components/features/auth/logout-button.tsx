import { signOutStaff } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={signOutStaff}>
      <Button
        type="submit"
        variant="ghost"
        className="h-auto px-0 py-0 text-xs text-text-tertiary hover:text-foreground"
      >
        Sign out
      </Button>
    </form>
  );
}
