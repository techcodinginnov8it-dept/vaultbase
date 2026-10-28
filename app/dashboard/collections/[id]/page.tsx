import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowUpRight, CalendarDays, FileText, Layers3, Sparkles } from "lucide-react";

import { NewItemDialog } from "@/components/new-item-dialog";
import { EditCollectionDialog } from "@/components/edit-collection-dialog";
import { requireUserId } from "@/lib/auth";
import { getCollectionColor } from "@/lib/collection-colors";
import { DeleteCollectionButton } from "@/components/delete-collection-button";
import { CollectionTypeIcon } from "@/components/collection-type-icon";

async function CollectionContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await requireUserId();
  const { data: collection, error } = await supabase
    .from("collections")
    .select("id, name, collection_type, description, cover_path, color, items(id, title, item_type, custom_type, description, updated_at)")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (error || !collection) notFound();
  const { data: imageData } = collection.cover_path ? await supabase.storage.from("collection-images").createSignedUrl(collection.cover_path, 600) : { data: null };
  const items = collection.items ?? [];
  const itemTypes = new Set(items.map((item) => item.custom_type || item.item_type));
  const latestItem = items.reduce<string | null>((latest, item) => (!latest || item.updated_at > latest ? item.updated_at : latest), null);
  const collectionColor = getCollectionColor(collection.color);

  return (
    <div className="flex flex-col gap-7 animate-in fade-in duration-500">
      <div className="flex flex-col gap-5">
        <Link
          href="/dashboard/collections"
          className="inline-flex w-fit items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All collections
        </Link>
        <div className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: collectionColor.swatch }} />
          <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
              <span style={{ backgroundColor: collectionColor.swatch, color: collectionColor.foreground }} className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm sm:h-24 sm:w-24">
                {imageData?.signedUrl ? <img src={imageData.signedUrl} alt="" className="h-full w-full object-cover" /> : <CollectionTypeIcon type={collection.collection_type} className="h-10 w-10 sm:h-12 sm:w-12" />}
              </span>
              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Collection</p>
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{collection.collection_type}</span>
                </div>
                <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight sm:text-4xl">{collection.name}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{collection.description || "A focused space for related items."}</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap lg:justify-end">
              <EditCollectionDialog id={collection.id} name={collection.name} type={collection.collection_type} description={collection.description} imageUrl={imageData?.signedUrl ?? null} color={collection.color} />
              <NewItemDialog defaultCollectionId={collection.id} buttonLabel="Add item" />
              <DeleteCollectionButton collectionId={collection.id} />
            </div>
          </div>
          <div className="grid border-t bg-muted/20 sm:grid-cols-3">
            <div className="flex items-center gap-3 border-b px-5 py-4 sm:border-b-0 sm:border-r"><Layers3 className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold leading-none">{items.length}</p><p className="mt-1 text-xs text-muted-foreground">{items.length === 1 ? "Item" : "Items"}</p></div></div>
            <div className="flex items-center gap-3 border-b px-5 py-4 sm:border-b-0 sm:border-r"><FileText className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold leading-none">{itemTypes.size}</p><p className="mt-1 text-xs text-muted-foreground">Item {itemTypes.size === 1 ? "type" : "types"}</p></div></div>
            <div className="flex items-center gap-3 px-5 py-4"><CalendarDays className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold leading-none">{latestItem ? new Date(latestItem).toLocaleDateString() : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Last updated</p></div></div>
          </div>
        </div>
      </div>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-semibold tracking-tight">Items in this collection</h2><p className="mt-1 text-sm text-muted-foreground">Keep related information together and easy to find.</p></div><span className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? "item" : "items"}</span></div>
        {!items.length ? <div className="flex flex-col items-center rounded-3xl border border-dashed bg-card px-6 py-14 text-center shadow-sm"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-7 w-7" /></span><h3 className="mt-4 text-lg font-semibold">Start organizing this collection</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Add your first item to keep accounts, links, notes, files, and other information together.</p><div className="mt-5"><NewItemDialog defaultCollectionId={collection.id} buttonLabel="Add first item" /></div></div> : null}
        {items.length ? <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => (
          <Link key={item.id} href={"/dashboard/" + item.id} className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold group-hover:text-primary">{item.title}</h3><p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.custom_type || item.item_type}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>{item.description ? <p className="mt-4 line-clamp-2 text-sm leading-5 text-muted-foreground">{item.description}</p> : <p className="mt-4 text-sm italic text-muted-foreground">No description added.</p>}<div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground"><span>{new Date(item.updated_at).toLocaleDateString()}</span><span className="inline-flex items-center gap-1 text-primary">Open item <ArrowUpRight className="h-3 w-3" /></span></div></div></div>
          </Link>
        ))}</div> : null}
      </section>
    </div>
  );
}

function CollectionFallback() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-10 w-72 rounded-md bg-muted" />
      <div className="h-48 rounded-lg bg-muted" />
    </div>
  );
}

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CollectionFallback />}>
      <CollectionContent params={params} />
    </Suspense>
  );
}
