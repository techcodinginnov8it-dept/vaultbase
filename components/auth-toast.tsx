"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

const AUTH_TOAST_EVENT = "vaultbase:auth-toast";
const AUTH_TOAST_KEY = "vaultbase-auth-toast";

export function showAuthToast(message: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_TOAST_KEY, message);
  window.dispatchEvent(new CustomEvent(AUTH_TOAST_EVENT));
}

export function AuthToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const readMessage = () => {
      const nextMessage = window.sessionStorage.getItem(AUTH_TOAST_KEY);
      if (!nextMessage) return;
      window.sessionStorage.removeItem(AUTH_TOAST_KEY);
      setMessage(nextMessage);
      window.setTimeout(() => setMessage(null), 4000);
    };

    readMessage();
    window.addEventListener(AUTH_TOAST_EVENT, readMessage);
    return () => window.removeEventListener(AUTH_TOAST_EVENT, readMessage);
  }, []);

  if (!message) return null;

  return (
    <div role="status" aria-live="polite" className="fixed right-4 top-4 z-[100] flex max-w-sm items-center gap-3 rounded-lg border border-emerald-500/30 bg-card px-4 py-3 text-sm shadow-xl animate-in fade-in slide-in-from-top-2">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button type="button" aria-label="Dismiss notification" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setMessage(null)}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
