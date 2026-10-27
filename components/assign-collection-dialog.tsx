"use client";

import { FolderKanban } from "lucide-react";
import { useEffect, useState } from "react";

import { assignItemToCollection } from "@/app/dashboard/collection-item-actions";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/form-submit-button";
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

  useEffect(() => {
    if (!open) return;
    const loadCollections = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("collections").select("id, name").order("name");
      setCollections(data ?? []);
    };
    void loadCollections();
  }, [open]);

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
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close collection dialog" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby={"assign-collection-" + itemId} className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in-95 rounded-xl border bg-card p-6 shadow-2xl">
            <h2 id={"assign-collection-" + itemId} className="text-xl font-semibold">Add to collection</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose where this item should be organized.</p>
            <form action={assignItemToCollection} className="mt-5 flex flex-col gap-4">
              <input type="hidden" name="item_id" value={itemId} />
              <select name="collection_id" defaultValue={currentCollectionId ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="">No collection</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </select>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <FormSubmitButton pendingLabel="Saving...">Save collection</FormSubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
