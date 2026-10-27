import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Paperclip,
  Tags,
} from "lucide-react";

import { CredentialViewer } from "@/components/credential-viewer";
import { BackToDashboardLink } from "@/components/back-to-dashboard-link";
import { DeleteAttachmentButton } from "@/components/delete-attachment-button";
import { EditItemDialog } from "@/components/edit-item-dialog";
import { requireUserId } from "@/lib/auth";

async function ItemContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await requireUserId();
  const { data: item, error } = await supabase
    .from("items")
    .select("id, title, item_type, custom_type, collection_id, description, updated_at, created_at, collections(name), item_links(url, label), item_tags(tags(name, color)), item_credentials(encrypted_payload, salt, iv), attachments(id, storage_path, original_name, mime_type, size_bytes)")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (error || !item) notFound();
  const credential = Array.isArray(item.item_credentials) ? item.item_credentials[0] : item.item_credentials;
  const attachments = await Promise.all((item.attachments ?? []).map(async (attachment) => {
    const { data } = await supabase.storage.from("item-attachments").createSignedUrl(attachment.storage_path, 600);
    return { ...attachment, signedUrl: data?.signedUrl ?? null };
  }));
  const initialUrls = item.item_links?.map((link) => link.url) ?? [];
  const initialTags = (item.item_tags ?? []).flatMap((relation) => relation.tags?.[0]?.name ? [relation.tags[0].name] : []).join(", ");
  const itemType = item.custom_type || item.item_type;
  const collectionName = item.collections?.[0]?.name;
  const hasCredential = Boolean(credential?.encrypted_payload && credential.salt && credential.iv);
  const formattedUpdatedAt = new Date(item.updated_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <BackToDashboardLink />
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-primary/[0.08] via-card to-card px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground">
                  {itemType}
                </span>
                {collectionName ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {collectionName}
                  </span>
                ) : null}
              </div>
              <div>
                <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">{item.title}</h1>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Updated {formattedUpdatedAt}
                </p>
              </div>
              {item.description ? <p className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground sm:text-base">{item.description}</p> : <p className="text-sm italic text-muted-foreground">No description added yet.</p>}
            </div>
            <div className="shrink-0">
              <EditItemDialog id={item.id} title={item.title} itemType={item.item_type} customType={item.custom_type} collectionId={item.collection_id} description={item.description} urls={initialUrls} tags={initialTags} hasCredentials={hasCredential} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t bg-muted/20 sm:grid-cols-4">
          <div className="border-b p-4 sm:border-b-0 sm:border-r"><p className="text-2xl font-semibold">{item.item_links?.length ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Saved links</p></div>
          <div className="border-b p-4 sm:border-b-0 sm:border-r"><p className="text-2xl font-semibold">{attachments.length}</p><p className="mt-1 text-xs text-muted-foreground">Attachments</p></div>
          <div className="border-r p-4"><p className="text-2xl font-semibold">{item.item_tags?.length ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Tags</p></div>
          <div className="p-4"><p className="text-2xl font-semibold">{hasCredential ? "Yes" : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Credentials</p></div>
         </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
        <div className="space-y-6">
          {hasCredential ? (
            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><KeyRound className="h-5 w-5" /></div>
                <div><h2 className="font-semibold">Credentials</h2><p className="text-sm text-muted-foreground">Protected account details</p></div>
              </div>
              <CredentialViewer itemId={item.id} encryptedPayload={credential.encrypted_payload} salt={credential.salt} iv={credential.iv} />
            </section>
          ) : null}

          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600"><Link2 className="h-5 w-5" /></div><div><h2 className="font-semibold">Links</h2><p className="text-sm text-muted-foreground">Websites and references for this item</p></div></div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{item.item_links?.length ?? 0}</span>
            </div>
            {item.item_links?.length ? <div className="space-y-3">{item.item_links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"><span className="min-w-0"><span className="block truncate text-sm font-medium">{link.label || "Saved link"}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{link.url}</span></span><ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>)}</div> : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"><Link2 className="mx-auto mb-2 h-5 w-5" />No links added yet.</div>}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Tags className="h-5 w-5" /></div><div><h2 className="font-semibold">Tags</h2><p className="text-sm text-muted-foreground">Ways to find this item</p></div></div>
            {item.item_tags?.length ? <div className="flex flex-wrap gap-2">{item.item_tags.map((relation) => relation.tags?.[0] ? <span key={relation.tags[0].name} className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium">{relation.tags[0].name}</span> : null)}</div> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No tags added yet.</p>}
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Paperclip className="h-5 w-5" /></div><div><h2 className="font-semibold">Attachments</h2><p className="text-sm text-muted-foreground">Images, videos, and files</p></div></div>
            {attachments.length ? <div className="space-y-3">{attachments.map((attachment) => <div key={attachment.id} className="overflow-hidden rounded-xl border bg-muted/20">{attachment.signedUrl && attachment.mime_type.startsWith("image/") ? <img src={attachment.signedUrl} alt={attachment.original_name} className="aspect-video w-full object-cover" /> : null}{attachment.signedUrl && attachment.mime_type.startsWith("video/") ? <video src={attachment.signedUrl} controls className="aspect-video w-full bg-black" /> : null}<div className="flex items-center justify-between gap-3 p-3"><span className="flex min-w-0 items-center gap-2 text-sm"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{attachment.original_name}</span></span><div className="flex shrink-0 items-center gap-2">{attachment.signedUrl ? <a href={attachment.signedUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Open</a> : <span className="text-xs text-muted-foreground">Unavailable</span>}<DeleteAttachmentButton attachmentId={attachment.id} /></div></div></div>)}</div> : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"><ImageIcon className="mx-auto mb-2 h-5 w-5" />No attachments added yet.</div>}
          </section>
        </div>
      </div>
    </div>
  );
}

function ItemFallback() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 animate-pulse">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="h-72 rounded-lg bg-muted" />
    </div>
  );
}

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ItemFallback />}>
      <ItemContent params={params} />
    </Suspense>
  );
}
