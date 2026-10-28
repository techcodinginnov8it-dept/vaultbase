import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, FolderKanban } from "lucide-react";

import { CollectionSearch } from "@/components/collection-search";
import { NewCollectionForm } from "@/components/new-collection-form";
import { requireUserId } from "@/lib/auth";
import { getCollectionColor } from "@/lib/collection-colors";
import { collectionTypeOptions, predefinedCollectionTypes } from "@/lib/collection-types";
import { CollectionTypeIcon } from "@/components/collection-type-icon";
import { CollectionCardMenu } from "@/components/collection-card-menu";

type CollectionsPageProps = {
  searchParams: Promise<{ q?: string; type?: string }>;
};

async function CollectionsContent({ searchParams }: CollectionsPageProps) {
  const { supabase, userId } = await requireUserId();
  const { q = "", type = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const allowedTypes = [...predefinedCollectionTypes, "custom"];
  const collectionType = allowedTypes.includes(type) ? type : "";
  const summaryQuery = supabase
    .from("collections")
    .select("collection_type")
    .eq("owner_id", userId);
  let collectionsQuery = supabase
    .from("collections")
    .select("id, name, collection_type, description, cover_path, color, created_at, items(count)")
    .eq("owner_id", userId)
    .order("name");
  if (query) {
    const safeQuery = query.replace(/[(),]/g, " ");
    collectionsQuery = collectionsQuery.or("name.ilike.%" + safeQuery + "%,description.ilike.%" + safeQuery + "%");
  }
  if (collectionType && collectionType !== "custom") {
    collectionsQuery = collectionsQuery.eq("collection_type", collectionType);
  } else if (collectionType === "custom") {
    collectionsQuery = collectionsQuery.not("collection_type", "in", `(${predefinedCollectionTypes.join(",")})`);
  }
  const [{ data: rawCollections, error }, { data: summaryRows, error: summaryError }] = await Promise.all([
    collectionsQuery,
    summaryQuery,
  ]);
  const collections = await Promise.all((rawCollections ?? []).map(async (collection) => {
    const { data } = collection.cover_path ? await supabase.storage.from("collection-images").createSignedUrl(collection.cover_path, 600) : { data: null };
    return { ...collection, imageUrl: data?.signedUrl ?? null };
  }));
  const summaryCounts = new Map<string, number>();
  for (const row of summaryRows ?? []) {
    summaryCounts.set(row.collection_type, (summaryCounts.get(row.collection_type) ?? 0) + 1);
  }
  const customCount = [...summaryCounts.entries()]
    .filter(([value]) => !predefinedCollectionTypes.includes(value as (typeof predefinedCollectionTypes)[number]))
    .reduce((total, [, count]) => total + count, 0);
  const summaryTypes = [
    { value: "", label: "All collections", count: summaryRows?.length ?? 0 },
    ...collectionTypeOptions.map((option) => ({ value: option.value, label: option.label, count: summaryCounts.get(option.value) ?? 0 })),
    { value: "custom", label: "Custom", count: customCount },
  ];
  const summaryHref = (value: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (value) params.set("type", value);
    const queryString = params.toString();
    return queryString ? "/dashboard/collections?" + queryString : "/dashboard/collections";
  };

  return (
    <div className="flex flex-col gap-7 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 rounded-3xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace organization</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Collections</h1>
          <p className="mt-2 text-muted-foreground">Group related items into focused workspaces.</p>
        </div>
        <NewCollectionForm />
      </div>
      <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="collection-summary-title">
        <div className="flex items-center justify-between gap-4">
          <div><h2 id="collection-summary-title" className="text-xl font-medium">Collection overview</h2><p className="mt-1 text-sm text-muted-foreground">See how your collections are organized by type.</p></div>
          <FolderKanban className="hidden h-6 w-6 text-muted-foreground sm:block" />
        </div>
        {summaryError ? <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">Collection type counts are temporarily unavailable.</p> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {summaryTypes.map((summary) => (
            <Link key={summary.value || "all"} href={summaryHref(summary.value)} className={`group min-h-[88px] rounded-2xl border bg-background/70 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md ${collectionType === summary.value ? "border-primary bg-primary/[0.04] ring-2 ring-primary/15" : ""}`}>
              <div className="flex items-start justify-between gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><CollectionTypeIcon type={summary.value || "general"} className="h-4 w-4" /></span><span className="text-xl font-semibold tracking-tight">{summary.count}</span></div>
              <p className="mt-2 truncate text-xs font-medium text-muted-foreground group-hover:text-foreground">{summary.label}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-medium">Your collections</h2><p className="mt-1 text-sm text-muted-foreground">{collections?.length ?? 0} {collections?.length === 1 ? "collection" : "collections"} shown</p></div>
          <FolderKanban className="hidden h-6 w-6 text-muted-foreground sm:block" />
        </div>
        <CollectionSearch initialQuery={query} initialType={collectionType} />
        {error ? <p className="rounded-md border border-red-300 p-4 text-sm text-red-600">{error.message}</p> : null}
        {!error && !collections?.length ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">{query ? "No collections match your search." : "No collections yet. Create one to organize your items."}</div> : null}
        {collections?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{collections.map((collection) => {
          const itemCount = Array.isArray(collection.items) ? collection.items[0]?.count ?? 0 : 0;
          return <article key={collection.id} className="group relative flex min-h-[190px] flex-col overflow-visible rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <Link href={"/dashboard/collections/" + collection.id} className="flex flex-1 flex-col rounded-t-2xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <div className="flex items-start justify-between gap-4"><span style={{ backgroundColor: getCollectionColor(collection.color).swatch, color: getCollectionColor(collection.color).foreground }} className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl">{collection.imageUrl ? <img src={collection.imageUrl} alt="" className="h-full w-full object-cover" /> : <CollectionTypeIcon type={collection.collection_type} className="h-10 w-10" />}</span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
              <div className="mt-5"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{collection.name}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{collection.collection_type}</span></div>{collection.description ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{collection.description}</p> : <p className="mt-2 text-sm italic text-muted-foreground">No description added.</p>}</div>
            </Link>
            <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground"><span>{itemCount} {itemCount === 1 ? "item" : "items"}</span><div className="flex items-center gap-2"><span className="font-medium text-primary">Open collection</span><CollectionCardMenu collectionId={collection.id} currentColor={collection.color} /></div></div>
          </article>;
        })}</div> : null}
      </section>
    </div>
  );
}

function CollectionsFallback() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-10 w-64 rounded-md bg-muted" />
      <div className="h-12 w-40 rounded-lg bg-muted" />
      <div className="h-64 rounded-2xl bg-muted" />
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
