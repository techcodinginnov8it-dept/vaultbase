"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { showAuthToast } from "@/components/auth-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsLoading(false);
      return;
    }
    showAuthToast("You have been logged out successfully.");
    router.push("/auth/login");
  };

  return <Button onClick={logout} disabled={isLoading}>{isLoading ? <><Loader2 className="animate-spin" /> Logging out...</> : "Logout"}</Button>;
}
