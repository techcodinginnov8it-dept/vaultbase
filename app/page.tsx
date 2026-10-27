import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href="/" className="flex items-center gap-2 tracking-tight">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground" aria-hidden="true">V</span>
                Vaultbase
              </Link>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <div className="flex-1 flex w-full max-w-5xl flex-col justify-center gap-8 p-5">
          <section className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Private information workspace</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Keep your important information organized.</h1>
            <p className="mt-6 text-lg text-muted-foreground">Vaultbase helps you save contacts, accounts, projects, links, notes, and files in one searchable workspace.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hasEnvVars ? (
                <Link href="/dashboard" className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">Open dashboard</Link>
              ) : (
                <EnvVarWarning />
              )}
              <Link href="/auth/sign-up" className="rounded-md border px-5 py-3 text-sm font-medium hover:bg-muted">Create an account</Link>
            </div>
          </section>
          <section className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-lg border p-4"><p className="font-medium text-foreground">Organize</p><p className="mt-2">Use collections, item types, and tags.</p></div>
            <div className="rounded-lg border p-4"><p className="font-medium text-foreground">Search</p><p className="mt-2">Find saved information by title or description.</p></div>
            <div className="rounded-lg border p-4"><p className="font-medium text-foreground">Private by default</p><p className="mt-2">Your records are protected by account ownership and RLS.</p></div>
          </section>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>Vaultbase · Secure, searchable information management</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
