import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/form-submit-button";
import { requireUserId } from "@/lib/auth";
import { updateProfile } from "./actions";

type SettingsPageProps = {
  searchParams: Promise<{ saved?: string }>;
};

async function SettingsContent({ searchParams }: SettingsPageProps) {
  const { supabase, userId } = await requireUserId();
  const { saved } = await searchParams;
  const [{ data: claims }, { data: profile }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);

  const email = typeof claims?.claims?.email === "string" ? claims.claims.email : "";

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <p className="text-sm text-muted-foreground">Account preferences</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your profile and Vaultbase preferences.</p>
      </div>

      {saved === "1" ? <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Your profile was updated.</p> : null}

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-medium">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">This information is shown only inside your account.</p>
        <form action={updateProfile} className="mt-6 flex w-full max-w-2xl flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <input value={email} readOnly className="h-10 rounded-md border bg-muted px-3 text-sm text-muted-foreground" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Display name
            <input name="display_name" defaultValue={profile?.display_name ?? ""} maxLength={100} placeholder="Your name" className="h-10 rounded-md border bg-background px-3 text-sm" />
          </label>
          <div>
            <FormSubmitButton pendingLabel="Saving profile...">Save profile</FormSubmitButton>
          </div>
        </form>
      </section>

      <section className="flex flex-col items-start justify-between gap-5 rounded-lg border bg-card p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-medium">Security</h2>
          <p className="mt-1 text-sm text-muted-foreground">Reset your password through a secure email link.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/auth/forgot-password">Reset password</Link>
        </Button>
      </section>
    </div>
  );
}

function SettingsFallback() {
  return (
    <div className="flex w-full max-w-[1200px] flex-col gap-8 animate-pulse">
      <div className="h-12 w-64 rounded-md bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
      <div className="h-28 rounded-lg bg-muted" />
    </div>
  );
}

export default function SettingsPage({ searchParams }: SettingsPageProps) {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
}
