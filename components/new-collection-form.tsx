"use client";

import { FolderPlus, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createCollection } from "@/app/dashboard/collection-actions";
import { CollectionTypeField } from "@/components/collection-type-field";
import { CollectionImagePicker } from "@/components/collection-image-picker";
import { CollectionColorField } from "@/components/collection-color-field";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Button } from "@/components/ui/button";

type CollectionFormState = {
  error: string | null;
  collectionId?: string;
};

const initialState: CollectionFormState = { error: null };

export function NewCollectionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, isPending] = useActionState<CollectionFormState, FormData>(
    async (_previousState, formData) => {
      try {
        const collectionId = await createCollection(formData);
        return { error: null, collectionId };
      } catch (caught: unknown) {
        return {
          error: caught instanceof Error ? caught.message : "Unable to create collection.",
        };
      }
    },
    initialState,
  );

  useEffect(() => {
    if (state.collectionId) router.push("/dashboard/collections/" + state.collectionId);
  }, [router, state.collectionId]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <Button className="w-fit gap-2" onClick={() => setOpen(true)}><FolderPlus className="h-4 w-4" /> Create collection</Button>
      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close new collection dialog" onClick={() => setOpen(false)} />
        <div role="dialog" aria-modal="true" aria-labelledby="new-collection-title" className="relative z-10 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 rounded-2xl border bg-card p-5 shadow-2xl sm:p-6">
          <Button ref={closeButtonRef} variant="ghost" size="icon" aria-label="Close" className="absolute right-3 top-3" onClick={() => setOpen(false)}><X /></Button>
          <div className="pr-10"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><FolderPlus className="h-5 w-5" /></span><div><h2 id="new-collection-title" className="text-xl font-semibold">Create collection</h2><p className="mt-1 text-sm text-muted-foreground">Create a focused space for related items.</p></div></div></div>
          <form action={formAction} className="mt-6 flex max-h-[calc(100vh-12rem)] flex-col gap-4 overflow-y-auto pr-1">
            <label className="flex flex-col gap-2 text-sm font-medium">Collection name<input name="name" required maxLength={100} placeholder="e.g. Work accounts" className="h-11 rounded-lg border bg-background px-3 text-sm font-normal" /></label>
            <CollectionTypeField />
            <label className="flex flex-col gap-2 text-sm font-medium">Description<span className="text-xs font-normal text-muted-foreground">Optional</span><textarea name="description" maxLength={500} rows={4} placeholder="What belongs in this collection?" className="rounded-lg border bg-background px-3 py-2 text-sm font-normal" /></label>
            <CollectionColorField />
            <CollectionImagePicker />
            {state.error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><FormSubmitButton pendingLabel="Creating collection..." disabled={isPending}>Create collection</FormSubmitButton></div>
          </form>
        </div>
      </div> : null}
    </>
  );
}
