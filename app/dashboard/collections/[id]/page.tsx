import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { NewItemDialog } from "@/components/new-item-dialog";
import { EditCollectionDialog } from "@/components/edit-collection-dialog";
import { requireUserId } from "@/lib/auth";

async function CollectionContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await requireUserId();
  const { data: collection, error } = await supabase
    .from("collections")
    .select("id, name, collection_type, description, items(id, title, item_type, custom_type, description, updated_at)")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (error || !collection) notFound();

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <Link
          href="/dashboard/collections"
          className="inline-flex w-fit items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to collections
        </Link>
        <p className="mt-6 text-sm text-muted-foreground">Collection</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{collection.name}</h1>
              <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{collection.collection_type}</span>
            </div>
            {collection.description ? <p className="mt-2 text-muted-foreground">{collection.description}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <EditCollectionDialog id={collection.id} name={collection.name} type={collection.collection_type} description={collection.description} />
            <NewItemDialog defaultCollectionId={collection.id} buttonLabel="Add item" />
          </div>
        </div>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Items</h2>
        {!collection.items?.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No items in this collection yet. Create an item from the dashboard and select this collection.</div> : null}
        {collection.items?.map((item) => (
          <Link key={item.id} href={"/dashboard/" + item.id} className="rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{item.custom_type || item.item_type}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(item.updated_at).toLocaleDateString()}</span>
            </div>
            {item.description ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.description}</p> : null}
          </Link>
        ))}
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
