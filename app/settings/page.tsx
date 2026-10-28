import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, LockKeyhole, Settings2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/profile-form";
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
    supabase.from("profiles").select("display_name, avatar_path").eq("id", userId).maybeSingle(),
  ]);
  const { data: avatarData } = profile?.avatar_path ? await supabase.storage.from("profile-images").createSignedUrl(profile.avatar_path, 600) : { data: null };

  const email = typeof claims?.claims?.email === "string" ? claims.claims.email : "";

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 animate-in fade-in duration-500">
      <div className="flex flex-col gap-5 rounded-3xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4 sm:gap-5"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm"><Settings2 className="h-7 w-7" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account preferences</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1><p className="mt-2 text-sm text-muted-foreground">Manage your profile and Vaultbase preferences.</p></div></div>
        <div className="flex items-center gap-2 rounded-full border bg-background/70 px-3 py-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-600" />Account protected</div>
      </div>

      {saved === "1" ? <p className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />Your profile was updated successfully.</p> : null}

      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
        <ProfileForm email={email} initialName={profile?.display_name ?? ""} initialAvatarUrl={avatarData?.signedUrl} action={updateProfile} />
      </section>

      <section className="flex flex-col items-start justify-between gap-5 rounded-3xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:p-7">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><LockKeyhole className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">Security</h2><p className="mt-1 text-sm text-muted-foreground">Reset your password through a secure email link.</p></div></div>
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
