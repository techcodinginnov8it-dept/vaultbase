"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { predefinedCollectionTypes } from "@/lib/collection-types";

type CollectionSearchProps = {
  initialQuery: string;
  initialType: string;
};

export function CollectionSearch({ initialQuery, initialType }: CollectionSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [type, setType] = useState(initialType);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = value.trim();
      const params = new URLSearchParams();
      if (nextQuery) params.set("q", nextQuery);
      if (type) params.set("type", type);
      const queryString = params.toString();
      const url = queryString ? `/dashboard/collections?${queryString}` : "/dashboard/collections";

      startTransition(() => router.replace(url, { scroll: false }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [router, type, value]);

  return (
    <form className="mb-2 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => event.preventDefault()} role="search">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search collections..."
          aria-label="Search collections"
          className="h-10 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none transition-colors focus:border-primary"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear collection search"
            onClick={() => setValue("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <select
        value={type}
        onChange={(event) => setType(event.target.value)}
        aria-label="Filter collections by type"
        className="h-10 rounded-md border bg-background px-3 text-sm sm:w-40"
      >
        <option value="">All types</option>
        {predefinedCollectionTypes.map((value) => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
        <option value="custom">Custom types</option>
      </select>
      <span className="sr-only" aria-live="polite">
        {isPending ? "Searching collections" : "Collection search updated"}
      </span>
    </form>
  );
}
