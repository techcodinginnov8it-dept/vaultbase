"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { showAuthToast } from "@/components/auth-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const supabase = createClient();
    // Clear the current browser session immediately. This avoids waiting for
    // the global session-revocation request on slower production networks.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      showAuthToast(`Unable to log out: ${error.message}`);
      setIsLoading(false);
      return;
    }
    showAuthToast("You have been logged out successfully.");
    window.location.replace("/auth/login");
  };

  return (
    <Button
      onClick={logout}
      disabled={isLoading}
      className="min-w-[92px]"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          Logging out...
        </>
      ) : (
        "Logout"
      )}
    </Button>
  );
}
