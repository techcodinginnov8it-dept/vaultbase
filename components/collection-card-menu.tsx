"use client";

import { Check, MoreHorizontal, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateCollectionColor } from "@/app/dashboard/collection-actions";
import { CollectionDeleteDialog } from "@/components/collection-delete-dialog";
import { Button } from "@/components/ui/button";
import { collectionColors } from "@/lib/collection-colors";
import { cn } from "@/lib/utils";

export function CollectionCardMenu({ collectionId, currentColor = "slate" }: { collectionId: string; currentColor?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeColor(color: string) {
    setError(null);
    const formData = new FormData();
    formData.set("id", collectionId);
    formData.set("collection_color", color);
    startTransition(async () => {
      try {
        await updateCollectionColor(formData);
        setOpen(false);
        router.refresh();
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : "Unable to update color.");
      }
    });
  }

  function deleteCardCollection() { setOpen(false); setDeleteOpen(true); }

  return <div className="relative" onClick={(event) => event.stopPropagation()}>
    <Button type="button" variant="ghost" size="icon" aria-label="Collection actions" aria-expanded={open} className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground" disabled={isPending} onClick={() => setOpen((current) => !current)}><MoreHorizontal className="h-5 w-5" /></Button>
    {open ? <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl" onClick={(event) => event.stopPropagation()}>
      <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Change folder color</p>
      <div className="grid grid-cols-4 gap-1 p-1">
        {collectionColors.map((option) => <button key={option.value} type="button" title={option.label} aria-label={`Use ${option.label} color`} style={{ backgroundColor: option.swatch, color: option.foreground }} className={cn("flex h-9 w-9 items-center justify-center rounded-lg border-2 border-transparent", currentColor === option.value && "border-foreground")} disabled={isPending} onClick={() => changeColor(option.value)}>{currentColor === option.value ? <Check className="h-4 w-4" /> : null}</button>)}
      </div>
      <div className="my-1 border-t" />
      <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-destructive hover:bg-destructive/10" disabled={isPending} onClick={deleteCardCollection}><Trash2 className="h-4 w-4" /> Delete collection</button>
      {error ? <p role="alert" className="px-2 pt-2 text-xs text-destructive">{error}</p> : null}
    </div> : null}
    <CollectionDeleteDialog collectionId={collectionId} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={() => router.refresh()} />
  </div>;
}
