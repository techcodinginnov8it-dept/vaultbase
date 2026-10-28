"use client";

import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { showAuthToast } from "@/components/auth-toast";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError) throw signInError;
      showAuthToast("Signed in successfully.");
      router.replace("/dashboard");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500 ${className ?? ""}`} {...props}>
      <Card className="rounded-2xl border-border/70 bg-card/95 shadow-xl shadow-black/10 backdrop-blur">
        <CardHeader className="items-center space-y-4 pb-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></div>
          <div className="space-y-1"><CardTitle className="text-2xl tracking-tight">Welcome back</CardTitle><CardDescription>Sign in to continue to your private workspace.</CardDescription></div>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-lg" /></div>
              <div className="grid gap-2"><div className="flex items-center"><Label htmlFor="password">Password</Label><Link href="/auth/forgot-password" className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Forgot password?</Link></div><PasswordInput id="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-lg" /></div>
              {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="h-11 w-full rounded-lg shadow-sm transition-transform hover:-translate-y-0.5" disabled={isLoading}>{isLoading ? "Signing in..." : "Sign in"}</Button>
            </div>
            <div className="mt-6 text-center text-sm text-muted-foreground">Don&apos;t have an account? <Link href="/auth/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">Sign up</Link></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
