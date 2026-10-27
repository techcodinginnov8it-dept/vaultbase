"use client";

import { Pencil, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { updateItem } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Collection = { id: string; name: string };
type EditItemDialogProps = { id: string; title: string; itemType: string; customType: string | null; collectionId: string | null; description: string | null; urls: string[]; tags: string; hasCredentials?: boolean };
type EditItemState = { error: string | null; saved: boolean };

export function EditItemDialog(props: EditItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [itemType, setItemType] = useState(props.itemType);
  const [state, formAction, isPending] = useActionState<EditItemState, FormData>(async (_previous, formData) => {
    try {
      await updateItem(formData);
      return { error: null, saved: true };
    } catch (caught: unknown) {
      return { error: caught instanceof Error ? caught.message : "Unable to update item.", saved: false };
    }
  }, { error: null, saved: false });

  useEffect(() => {
    if (!open) return;
    const loadCollections = async () => {
      const { data } = await createClient().from("collections").select("id, name").order("name");
      setCollections(data ?? []);
    };
    void loadCollections();
  }, [open]);

  useEffect(() => {
    if (state.saved) setOpen(false);
  }, [state.saved]);

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => { setItemType(props.itemType); setOpen(true); }}><Pencil className="h-4 w-4" />Edit item</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close edit item dialog" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="edit-item-title" className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-card shadow-2xl sm:max-h-[calc(100vh-4rem)]">
            <Button variant="ghost" size="icon" aria-label="Close" className="absolute right-3 top-3" onClick={() => setOpen(false)}><X /></Button>
            <div className="shrink-0 border-b p-5 pr-16 sm:p-6 sm:pr-16"><h2 id="edit-item-title" className="text-xl font-semibold">Edit item</h2><p className="mt-1 text-sm text-muted-foreground">Update the item details and organization.</p></div>
            <form action={formAction} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"><div className="flex flex-col gap-4">
              <input type="hidden" name="item_id" value={props.id} />
              <label className="flex flex-col gap-2 text-sm font-medium">Title<input name="title" required maxLength={200} defaultValue={props.title} className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Item type<select name="item_type" value={itemType} onChange={(event) => setItemType(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-normal"><option value="custom">Custom</option><option value="contact">Contact</option><option value="account">Account</option><option value="project">Project</option><option value="bookmark">Bookmark</option></select></label>
              {itemType === "custom" ? <label className="flex flex-col gap-2 text-sm font-medium">Custom item type<input name="custom_item_type" required maxLength={100} defaultValue={props.customType ?? ""} placeholder="e.g. API credential" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label> : null}
              <label className="flex flex-col gap-2 text-sm font-medium">Collection<select name="collection_id" defaultValue={props.collectionId ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm font-normal"><option value="">No collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Description<textarea name="description" maxLength={500} rows={4} defaultValue={props.description ?? ""} className="rounded-md border bg-background px-3 py-2 text-sm font-normal" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Links<textarea name="urls" rows={3} defaultValue={props.urls.join("\n")} placeholder="One URL per line" className="rounded-md border bg-background px-3 py-2 text-sm font-normal" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Tags<input name="tags" defaultValue={props.tags} placeholder="Tags, separated by commas" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label>
              {props.hasCredentials ? <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"><p className="font-medium">Credentials are protected</p><p className="mt-1 text-muted-foreground">To edit the username/email or password, save this item first, then unlock the Credentials section below with your vault passphrase.</p><a href="#credentials" onClick={() => setOpen(false)} className="mt-2 inline-block font-medium text-primary hover:underline">Go to credentials</a></div> : null}
              <label className="flex flex-col gap-2 text-sm font-medium">Add attachments<input name="attachments" type="file" multiple accept="image/*,video/*,application/pdf,text/plain,text/csv" className="h-auto rounded-md border bg-background px-3 py-2 text-sm font-normal" /><span className="text-xs font-normal text-muted-foreground">This updates the same item. New files are added; delete existing files from the item detail page if you want to replace them.</span></label>
              {state.error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
              <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button></div>
            </div></form>
          </div>
        </div>
      ) : null}
    </>
  );
}
