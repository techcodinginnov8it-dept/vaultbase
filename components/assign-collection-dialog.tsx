"use client";

import { FolderKanban } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { assignItemToCollection } from "@/app/dashboard/collection-item-actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Collection = { id: string; name: string };

type AssignCollectionDialogProps = {
  itemId: string;
  currentCollectionId?: string | null;
  currentCollectionName?: string | null;
};

export function AssignCollectionDialog({
  itemId,
  currentCollectionId,
  currentCollectionName,
}: AssignCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [collectionLoadError, setCollectionLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setCollectionLoadError(null);
    setIsLoadingCollections(true);
    const loadCollections = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("collections").select("id, name").order("name");
      if (error) {
        setCollections([]);
        setCollectionLoadError("Collections could not be loaded. Try again or save this item without a collection.");
      } else {
        setCollections(data ?? []);
      }
      setIsLoadingCollections(false);
    };
    void loadCollections();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPending, open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await assignItemToCollection(formData);
        setOpen(false);
        router.refresh();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Unable to update the collection.");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <FolderKanban />
        {currentCollectionName ? "Move collection" : "Add to collection"}
      </Button>
      {open ? createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close collection dialog" onClick={() => !isPending && setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby={"assign-collection-" + itemId} className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in-95 rounded-xl border bg-card p-6 shadow-2xl">
            <h2 id={"assign-collection-" + itemId} className="text-xl font-semibold">Add to collection</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose where this item should be organized.</p>
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <input type="hidden" name="item_id" value={itemId} />
              <select name="collection_id" defaultValue={currentCollectionId ?? ""} disabled={isLoadingCollections || isPending} className="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="">No collection</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </select>
              {isLoadingCollections ? <p className="text-xs text-muted-foreground">Loading collections...</p> : null}
              {collectionLoadError ? <p role="alert" className="text-xs text-destructive">{collectionLoadError}</p> : null}
              {submitError ? <p role="alert" className="text-xs text-destructive">{submitError}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoadingCollections || isPending}>{isPending ? "Saving..." : "Save collection"}</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
