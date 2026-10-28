"use client";

import { Pencil, X } from "lucide-react";
import { useState } from "react";

import { updateCollection } from "@/app/dashboard/collection-actions";
import { CollectionTypeField } from "@/components/collection-type-field";
import { CollectionImagePicker } from "@/components/collection-image-picker";
import { CollectionColorField } from "@/components/collection-color-field";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/form-submit-button";

type EditCollectionDialogProps = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  imageUrl?: string | null;
  color?: string;
};

export function EditCollectionDialog({ id, name, type, description, imageUrl, color }: EditCollectionDialogProps) {
  const [open, setOpen] = useState(false);

  async function submit(formData: FormData) {
    await updateCollection(formData);
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Edit collection
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close edit collection dialog" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="edit-collection-title" className="relative z-10 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 rounded-xl border bg-card p-6 shadow-2xl">
            <Button variant="ghost" size="icon" aria-label="Close" className="absolute right-3 top-3" onClick={() => setOpen(false)}>
              <X />
            </Button>
            <div className="pr-8">
              <h2 id="edit-collection-title" className="text-xl font-semibold">Edit collection</h2>
              <p className="mt-1 text-sm text-muted-foreground">Update how this collection is organized.</p>
            </div>
            <form action={submit} className="mt-6 flex flex-col gap-4">
              <input type="hidden" name="id" value={id} />
              <label className="flex flex-col gap-2 text-sm font-medium">
                Collection name
                <input name="name" required maxLength={100} defaultValue={name} className="h-10 rounded-md border bg-background px-3 text-sm font-normal" />
              </label>
              <CollectionTypeField initialType={type} />
              <label className="flex flex-col gap-2 text-sm font-medium">
                Description
                <textarea name="description" maxLength={500} rows={4} defaultValue={description ?? ""} placeholder="Optional description" className="rounded-md border bg-background px-3 py-2 text-sm font-normal" />
              </label>
              <CollectionColorField initialColor={color} />
              <CollectionImagePicker currentImageUrl={imageUrl} allowRemove />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <FormSubmitButton pendingLabel="Saving changes...">Save changes</FormSubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
