import Link from "next/link";
import { Suspense } from "react";

import { CollectionSearch } from "@/components/collection-search";
import { NewCollectionForm } from "@/components/new-collection-form";
import { requireUserId } from "@/lib/auth";

type CollectionsPageProps = {
  searchParams: Promise<{ q?: string; type?: string }>;
};

async function CollectionsContent({ searchParams }: CollectionsPageProps) {
  const { supabase, userId } = await requireUserId();
  const { q = "", type = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const allowedTypes = ["general", "work", "personal", "finance", "projects", "bookmarks", "custom"];
  const collectionType = allowedTypes.includes(type) ? type : "";
  let collectionsQuery = supabase
    .from("collections")
    .select("id, name, collection_type, description, created_at, items(count)")
    .eq("owner_id", userId)
    .order("name");
  if (query) {
    const safeQuery = query.replace(/[(),]/g, " ");
    collectionsQuery = collectionsQuery.or("name.ilike.%" + safeQuery + "%,description.ilike.%" + safeQuery + "%");
  }
  if (collectionType && collectionType !== "custom") {
    collectionsQuery = collectionsQuery.eq("collection_type", collectionType);
  } else if (collectionType === "custom") {
    collectionsQuery = collectionsQuery.not("collection_type", "in", "(general,work,personal,finance,projects,bookmarks)");
  }
  const { data: collections, error } = await collectionsQuery;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <p className="text-sm text-muted-foreground">Workspace organization</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Collections</h1>
        <p className="mt-2 text-muted-foreground">Group related items into focused workspaces.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Your collections</h2>
            <span className="text-sm text-muted-foreground">{collections?.length ?? 0} shown</span>
          </div>
          <CollectionSearch initialQuery={query} initialType={collectionType} />
          {error ? <p className="rounded-md border border-red-300 p-4 text-sm text-red-600">{error.message}</p> : null}
          {!error && !collections?.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{query ? "No collections match your search." : "No collections yet. Create one to organize your items."}</div> : null}
          {collections?.map((collection) => {
            const itemCount = Array.isArray(collection.items) ? collection.items[0]?.count ?? 0 : 0;
            return (
              <Link key={collection.id} href={"/dashboard/collections/" + collection.id} className="rounded-lg border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{collection.name}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{collection.collection_type}</span>
                    </div>
                    {collection.description ? <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p> : null}
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                </div>
              </Link>
            );
          })}
        </section>
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-xl font-medium">New collection</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a focused space for related items.</p>
          <NewCollectionForm />
        </section>
      </div>
    </div>
  );
}

function CollectionsFallback() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-10 w-64 rounded-md bg-muted" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-64 rounded-lg bg-muted" />
        <div className="h-72 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function CollectionsPage({ searchParams }: CollectionsPageProps) {
  return (
    <Suspense fallback={<CollectionsFallback />}>
      <CollectionsContent searchParams={searchParams} />
    </Suspense>
  );
}
