"use client";

import {
  FolderKanban,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Collections", href: "/dashboard/collections", icon: FolderKanban },
  { label: "Settings", href: "/settings", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">V</span>
          Vaultbase
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <p className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Workspace</p>
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard" || (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/collections"))
            : item.href === "/dashboard/collections"
              ? pathname === "/dashboard/collections" || pathname.startsWith("/dashboard/collections/")
              : pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <p className="text-xs leading-5 text-muted-foreground">Keep your information organized, searchable, and private.</p>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 overflow-y-auto border-r bg-card lg:block">
        <Suspense fallback={<SidebarFallback />}>
          <SidebarContent />
        </Suspense>
      </aside>

      <div className="z-30 flex h-16 shrink-0 items-center border-b bg-background/95 px-4 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setOpen(true)}>
          <Menu />
        </Button>
        <Link href="/dashboard" className="ml-3 font-semibold">Vaultbase</Link>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span>Appearance</span>
          <ThemeSwitcher />
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 bg-card shadow-xl animate-in slide-in-from-left duration-300">
            <Button variant="ghost" size="icon" aria-label="Close navigation" className="absolute right-3 top-3" onClick={() => setOpen(false)}>
              <X />
            </Button>
            <Suspense fallback={<SidebarFallback />}>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </Suspense>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SidebarFallback() {
  return (
    <div className="flex h-full flex-col animate-pulse">
      <div className="h-16 border-b px-5 py-5">
        <div className="h-6 w-28 rounded bg-muted" />
      </div>
      <div className="flex-1 space-y-3 p-4">
        <div className="h-10 rounded bg-muted" />
        <div className="h-9 rounded bg-muted" />
        <div className="h-9 rounded bg-muted" />
      </div>
    </div>
  );
}
