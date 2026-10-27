import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { connection } from "next/server";
import { Suspense } from "react";

async function AuthHeader() {
  await connection();
  return <AuthButton />;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-muted/20 lg:flex">
      <DashboardSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="hidden h-16 items-center justify-end gap-6 border-b bg-background/95 px-6 backdrop-blur lg:flex">
          {!hasEnvVars ? <p className="mr-4 text-xs text-destructive">Supabase configuration required</p> : null}
          <div className="flex items-center gap-3 rounded-full border bg-muted/30 py-1 pl-3 pr-1 text-sm text-muted-foreground">
            <span>Appearance</span>
            <ThemeSwitcher />
          </div>
          <Suspense>
            <AuthHeader />
          </Suspense>
        </header>
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 p-4 sm:p-6 lg:p-8 2xl:px-10">
            {children}
          </div>
        </div>
        <footer className="flex items-center justify-between border-t px-6 py-5 text-xs text-muted-foreground">
          <p>Vaultbase · Secure, searchable information management</p>
        </footer>
      </div>
    </main>
  );
}
