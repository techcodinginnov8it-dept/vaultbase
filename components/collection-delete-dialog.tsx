"use client";

import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { deleteCollection } from "@/app/dashboard/collection-actions";
import { Button } from "@/components/ui/button";

type CollectionDeleteDialogProps = {
  collectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function CollectionDeleteDialog({ collectionId, open, onOpenChange, onDeleted }: CollectionDeleteDialogProps) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onOpenChange, open]);

  function handleDelete() {
    setError(null);
    const formData = new FormData();
    formData.set("id", collectionId);
    startTransition(async () => {
      try {
        await deleteCollection(formData);
        onOpenChange(false);
        if (onDeleted) onDeleted();
        else {
          router.replace("/dashboard/collections");
          router.refresh();
        }
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : "Unable to delete collection.");
      }
    });
  }

  if (!open) return null;

  return createPortal(<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <button className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-label="Close delete confirmation" onClick={() => { if (!isPending) onOpenChange(false); }} />
    <div role="alertdialog" aria-modal="true" aria-labelledby="delete-collection-title" aria-describedby="delete-collection-description" className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <Button ref={closeButtonRef} type="button" variant="ghost" size="icon" aria-label="Close" className="absolute right-3 top-3" disabled={isPending} onClick={() => onOpenChange(false)}><X /></Button>
      <div className="flex items-start gap-4 pr-8"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><AlertTriangle className="h-5 w-5" /></div><div><h2 id="delete-collection-title" className="text-lg font-semibold">Delete collection?</h2><p id="delete-collection-description" className="mt-2 text-sm leading-5 text-muted-foreground">The collection and its image will be removed. Your items will stay safe and become unassigned.</p></div></div>
      {error ? <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>{isPending ? <Loader2 className="animate-spin" /> : <Trash2 className="h-4 w-4" />} {isPending ? "Deleting..." : "Delete collection"}</Button></div>
    </div>
  </div>, document.body);
}
