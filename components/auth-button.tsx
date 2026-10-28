import Link from "next/link";
import { connection } from "next/server";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  // Auth state depends on request cookies and must be resolved at request time.
  await connection();
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 items-center gap-1.5 rounded-full border bg-muted/30 px-4 py-2 text-sm">
        <span className="text-muted-foreground">Hey,</span>
        <span className="max-w-[220px] truncate font-medium" title={user.email}>{user.email}</span>
        <span className="text-muted-foreground">!</span>
      </div>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
