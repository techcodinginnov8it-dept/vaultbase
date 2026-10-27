import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CredentialViewer } from "@/components/credential-viewer";
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Back to dashboard</Link>
      <div className="rounded-lg border p-6">
          <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.custom_type || item.item_type}</p>
            <h1 className="mt-2 text-3xl font-semibold">{item.title}</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2"><span className="text-sm text-muted-foreground">Updated {new Date(item.updated_at).toLocaleDateString()}</span><EditItemDialog id={item.id} title={item.title} itemType={item.item_type} customType={item.custom_type} collectionId={item.collection_id} description={item.description} urls={initialUrls} tags={initialTags} hasCredentials={Boolean(credential?.encrypted_payload && credential.salt && credential.iv)} /></div>
        </div>
        {item.description ? <p className="mt-6 whitespace-pre-wrap text-muted-foreground">{item.description}</p> : null}
        {item.collections?.[0]?.name ? <p className="mt-6 text-sm">Collection: <span className="font-medium">{item.collections[0].name}</span></p> : null}
        {item.item_links?.length ? (
          <div className="mt-6">
            <h2 className="font-medium">Links</h2>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {item.item_links.map((link) => <li key={link.url}><a className="text-blue-600 hover:underline" href={link.url} target="_blank" rel="noreferrer">{link.label}: {link.url}</a></li>)}
            </ul>
          </div>
        ) : null}
        {item.item_tags?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
              {item.item_tags.map((relation) => relation.tags?.[0] ? <span key={relation.tags[0].name} className="rounded-full bg-muted px-3 py-1 text-xs">{relation.tags[0].name}</span> : null)}
          </div>
        ) : null}
        {attachments.length ? (
          <div className="mt-6">
            <h2 className="font-medium">Attachments</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="overflow-hidden rounded-lg border bg-muted/20">
                  {attachment.signedUrl && attachment.mime_type.startsWith("image/") ? <img src={attachment.signedUrl} alt={attachment.original_name} className="aspect-video w-full object-cover" /> : null}
                  {attachment.signedUrl && attachment.mime_type.startsWith("video/") ? <video src={attachment.signedUrl} controls className="aspect-video w-full bg-black" /> : null}
                  <div className="flex items-center justify-between gap-3 p-3"><span className="truncate text-sm">{attachment.original_name}</span><div className="flex shrink-0 items-center gap-1">{attachment.signedUrl ? <a href={attachment.signedUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Open</a> : <span className="text-xs text-muted-foreground">Unavailable</span>}<DeleteAttachmentButton attachmentId={attachment.id} /></div></div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {credential?.encrypted_payload && credential.salt && credential.iv ? (
          <CredentialViewer
            itemId={item.id}
            encryptedPayload={credential.encrypted_payload}
            salt={credential.salt}
            iv={credential.iv}
          />
        ) : null}
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
