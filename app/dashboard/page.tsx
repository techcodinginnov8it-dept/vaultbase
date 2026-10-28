import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, ExternalLink, FileText, FolderKanban, Search, ShieldCheck, Sparkles } from "lucide-react";

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
    <div className="flex flex-col gap-7 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 rounded-3xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Private workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your items</h1>
          <p className="text-muted-foreground">Save contacts, accounts, projects, links, and notes in one searchable place.</p>
          <div className="flex flex-wrap gap-2 pt-2"><span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" />Ready to organize</span><span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />Private by default</span></div>
        </div>
        {items?.length ? <NewItemDialog /> : null}
      </div>

      <form className="flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm sm:flex-row" method="get">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={query}
          placeholder="Search titles and descriptions..."
          className="h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        </div><button className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90" type="submit">Search</button>
      </form>

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b bg-muted/20 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your workspace</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{query ? `Results for “${query}”` : "Recent items"}</h2><p className="mt-1 text-sm text-muted-foreground">{query ? "Matching items without a collection" : "Unassigned items ready to organize"}</p></div>
            <span className="inline-flex w-fit items-center rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">{items?.length ?? 0} {items?.length === 1 ? "item" : "items"}</span>
          </div>
          <div className="flex flex-col gap-5 p-5 sm:p-6">
          {error ? <p className="rounded-md border border-red-300 p-4 text-sm text-red-600">{error.message}</p> : null}
          {!error && !items?.length ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></span><h3 className="mt-4 font-semibold">No items to show yet</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Create your first item, then organize it into a collection when you are ready.</p><div className="mt-5"><NewItemDialog buttonLabel="Create your first item" /></div></div>
          ) : null}
          {items?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => (
            <article key={item.id} className="group flex min-h-[245px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <Link href={"/dashboard/" + item.id} className="flex flex-1 flex-col p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
                <span className="mt-4 inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{item.custom_type || item.item_type}</span>
                <h3 className="mt-4 line-clamp-2 text-lg font-semibold tracking-tight">{item.title}</h3>
                {item.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.description}</p> : <p className="mt-2 text-sm italic text-muted-foreground">No description added.</p>}
                {item.item_links?.[0] ? <span className="mt-auto flex min-w-0 items-center gap-2 pt-5 text-sm text-blue-600"><ExternalLink className="h-4 w-4 shrink-0" /><span className="truncate">{item.item_links[0].url}</span></span> : <span className="mt-auto pt-5 text-sm text-muted-foreground">Open item details</span>}
              </Link>
              <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">{item.collections?.[0]?.name ? <><FolderKanban className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{item.collections[0].name}</span></> : "No collection"}</span>
                <div className="flex shrink-0 items-center gap-2"><span className="text-[11px] text-muted-foreground">{new Date(item.updated_at).toLocaleDateString()}</span><AssignCollectionDialog itemId={item.id} currentCollectionId={item.collection_id} currentCollectionName={item.collections?.[0]?.name} /></div>
              </div>
            </article>
          ))}</div> : null}
          </div>
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
