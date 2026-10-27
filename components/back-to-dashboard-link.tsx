import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackToDashboardLink() {
  return (
    <Link
      href="/dashboard"
      prefetch={false}
      className="inline-flex w-fit items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to dashboard
    </Link>
  );
}
