import Link from "next/link";
import { Suspense } from "react";

import { NewItemDialog } from "@/components/new-item-dialog";
import { AssignCollectionDialog } from "@/components/assign-collection-dialog";
import { requireUserId } from "@/lib/auth";

type DashboardPageProps = {
  searchParams: Promise<{ q?: string }>;
};

async function DashboardContent({ searchParams }: DashboardPageProps) {
  const { supabase, userId } = await requireUserId();
  const { q = "" } = await searchParams;
  const query = q.trim();

  let itemsQuery = supabase
    .from("items")
    .select("id, title, item_type, custom_type, description, updated_at, collection_id, collections(name), item_links(url, label)")
    .eq("owner_id", userId)
    .eq("is_archived", false)
    .is("collection_id", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (query) {
    const safeQuery = query.replace(/[(),]/g, " ");
    itemsQuery = itemsQuery.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  }

  const { data: items, error } = await itemsQuery;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Private workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your items</h1>
          <p className="text-muted-foreground">Save contacts, accounts, projects, links, and notes in one searchable place.</p>
        </div>
        <NewItemDialog />
      </div>

      <form className="flex gap-2" method="get">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search titles and descriptions..."
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <button className="rounded-md bg-primary px-4 text-sm text-primary-foreground" type="submit">Search</button>
      </form>

      <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">{query ? `Results for “${query}”` : "Recent items"}</h2>
            <span className="text-sm text-muted-foreground">{items?.length ?? 0} shown</span>
          </div>
          {error ? <p className="rounded-md border border-red-300 p-4 text-sm text-red-600">{error.message}</p> : null}
          {!error && !items?.length ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No items found yet. Create your first item.</div>
          ) : null}
          {items?.map((item) => (
            <div key={item.id} className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <Link href={"/dashboard/" + item.id} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{item.custom_type || item.item_type}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(item.updated_at).toLocaleDateString()}</span>
                </div>
                {item.description ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.description}</p> : null}
                {item.item_links?.[0] ? <p className="mt-3 truncate text-sm text-blue-600">{item.item_links[0].url}</p> : null}
              </Link>
              <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
                {item.collections?.[0]?.name ? <span className="text-xs text-muted-foreground">Collection: {item.collections[0].name}</span> : <span className="text-xs text-muted-foreground">No collection</span>}
                <AssignCollectionDialog itemId={item.id} currentCollectionId={item.collection_id} currentCollectionName={item.collections?.[0]?.name} />
              </div>
            </div>
          ))}
      </section>
    </div>
  );
}

function DashboardFallback() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-10 w-64 rounded-md bg-muted" />
      <div className="h-10 w-full rounded-md bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
