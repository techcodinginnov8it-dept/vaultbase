"use client";

import { FileText, Pencil, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { registerAttachments, updateItem } from "@/app/dashboard/actions";
import { AttachmentPicker } from "@/components/attachment-picker";
import { DynamicFieldsEditor } from "@/components/dynamic-fields-editor";
import { ItemTypeSelect } from "@/components/item-type-select";
import { RepeatableLinksEditor, type ItemLinkValue } from "@/components/repeatable-links-editor";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { DynamicField } from "@/lib/item-fields";
import { uploadAttachments } from "@/lib/client-attachments";

type Collection = { id: string; name: string };
type ExistingAttachment = { id: string; originalName: string; mimeType: string; sizeBytes: number };
type EditItemDialogProps = { id: string; title: string; itemType: string; customType: string | null; collectionId: string | null; description: string | null; links?: ItemLinkValue[]; urls?: string[]; tags: string; dynamicFields?: DynamicField[]; hasCredentials?: boolean; attachments?: ExistingAttachment[] };
type EditItemState = { error: string | null; saved: boolean };

export function EditItemDialog(props: EditItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionLoadError, setCollectionLoadError] = useState<string | null>(null);
  const [itemType, setItemType] = useState(props.itemType);
  const [selectedCollectionId, setSelectedCollectionId] = useState(props.collectionId ?? "");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, isPending] = useActionState<EditItemState, FormData>(async (_previous, formData) => {
    try {
      formData.delete("attachments");
      await updateItem(formData);
      if (selectedFiles.length) {
        const uploaded = await uploadAttachments(props.id, selectedFiles, (completed, total, fileName) => {
          setUploadStatus(`Uploading ${completed} of ${total}: ${fileName}`);
        });
        const attachmentForm = new FormData();
        attachmentForm.set("item_id", props.id);
        attachmentForm.set("attachments_json", JSON.stringify(uploaded));
        await registerAttachments(attachmentForm);
      }
      setUploadStatus(null);
      return { error: null, saved: true };
    } catch (caught: unknown) {
      setUploadStatus(null);
      return { error: caught instanceof Error ? caught.message : "Unable to update item.", saved: false };
    }
  }, { error: null, saved: false });

  useEffect(() => {
    if (!open) return;
    const loadCollections = async () => {
      const { data, error } = await createClient().from("collections").select("id, name").order("name");
      setCollections(data ?? []);
      setCollectionLoadError(error ? "Collections could not be loaded. The current collection will remain unchanged unless you select another." : null);
    };
    void loadCollections();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (state.saved) setOpen(false);
  }, [state.saved]);

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => { setItemType(props.itemType); setSelectedCollectionId(props.collectionId ?? ""); setOpen(true); }}><Pencil className="h-4 w-4" />Edit item</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close edit item dialog" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="edit-item-title" aria-describedby="edit-item-description" className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
            <Button ref={closeButtonRef} variant="ghost" size="icon" aria-label="Close" className="absolute right-3 top-3" onClick={() => setOpen(false)}><X /></Button>
            <div className="shrink-0 border-b bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 pr-16 sm:p-7 sm:pr-16"><div className="max-w-xl"><h2 id="edit-item-title" className="text-xl font-semibold tracking-tight sm:text-2xl">Edit item</h2><p id="edit-item-description" className="mt-1 text-sm leading-6 text-muted-foreground">Update the item details and organization.</p></div></div>
            <form action={formAction} className="min-h-0 flex-1 overflow-y-auto"><div className="flex flex-col gap-6 p-5 sm:p-7">
              <input type="hidden" name="item_id" value={props.id} />
              <section className="space-y-4"><div><h3 className="text-sm font-semibold">Basic information</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Update the name, type, and organization for this item.</p></div>
                <label className="flex flex-col gap-2 text-sm font-medium">Title<input name="title" required maxLength={200} defaultValue={props.title} className="h-11 rounded-lg border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-medium"><span className="flex min-h-8 flex-col"><span>Item type</span><span className="text-xs font-normal text-muted-foreground">Choose a template</span></span><ItemTypeSelect name="item_type" value={itemType} onChange={setItemType} /></label>
                  {itemType === "custom" ? <label className="flex min-w-0 flex-col gap-2 text-sm font-medium"><span className="flex min-h-8 flex-col"><span>Custom item type</span><span className="text-xs font-normal text-muted-foreground">e.g. API credential or vendor</span></span><input name="custom_item_type" required maxLength={100} defaultValue={props.customType ?? ""} placeholder="Enter a custom type" className="h-11 rounded-lg border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label> : <div className="hidden sm:block" aria-hidden="true" />}
                </div>
                <DynamicFieldsEditor itemType={itemType} initialFields={props.dynamicFields} />
                <label className="flex flex-col gap-2 text-sm font-medium">Collection<select name="collection_id" value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)} className="h-11 rounded-lg border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="">No collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
              </section>
              {collectionLoadError ? <p role="alert" className="text-xs text-destructive">{collectionLoadError}</p> : null}
              <section className="space-y-4 border-t pt-6"><div><h3 className="text-sm font-semibold">Details</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Keep the description, links, tags, and files up to date.</p></div>
                <label className="flex flex-col gap-2 text-sm font-medium">Description<textarea name="description" maxLength={500} rows={4} defaultValue={props.description ?? ""} className="min-h-28 resize-y rounded-lg border bg-background px-3 py-2 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
                <RepeatableLinksEditor initialLinks={props.links ?? (props.urls ?? []).map((url) => ({ label: "", url }))} />
                <label className="flex flex-col gap-2 text-sm font-medium">Tags<span className="text-xs font-normal text-muted-foreground">Separate multiple tags with commas</span><input name="tags" defaultValue={props.tags} placeholder="work, important, finance" className="h-11 rounded-lg border bg-background px-3 text-sm font-normal" /></label>
              </section>
              {props.hasCredentials ? <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-medium">One credential set is protected for this item</p><p className="mt-1 leading-6 text-muted-foreground">To edit the username/email or password, save this item first, then unlock the Credentials section below with your vault passphrase. For another account, create a separate item in the same collection.</p><a href="#credentials" onClick={() => setOpen(false)} className="mt-2 inline-block font-medium text-primary hover:underline">Go to credentials</a></div> : null}
              {props.attachments?.length ? <div className="space-y-2 rounded-xl border bg-muted/20 p-4"><div><p className="text-sm font-medium">Existing attachments</p><p className="mt-1 text-xs text-muted-foreground">These files are already saved with this item.</p></div><div className="grid gap-2 sm:grid-cols-2">{props.attachments.map((attachment) => <div key={attachment.id} className="flex min-w-0 items-center gap-2 rounded-lg border bg-background p-2.5"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 truncate text-xs font-medium">{attachment.originalName}</span><span className="shrink-0 text-[11px] text-muted-foreground">{attachment.mimeType.split("/").pop()?.toUpperCase()}</span></div>)}</div><p className="text-xs text-muted-foreground">To remove an existing file, use the delete action on the item details page.</p></div> : null}
              <AttachmentPicker isPending={isPending} onFilesChange={setSelectedFiles} /><p className="text-xs text-muted-foreground">New files are added to this item. Existing files remain unchanged unless deleted from the item detail page.</p>
              {uploadStatus ? <p role="status" className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{uploadStatus}</p> : null}
              {state.error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
            </div><div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-card/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-7"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button></div></form>
          </div>
        </div>
      ) : null}
    </>
  );
}
