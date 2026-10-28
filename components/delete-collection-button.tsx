"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { CollectionDeleteDialog } from "@/components/collection-delete-dialog";
import { Button } from "@/components/ui/button";

export function DeleteCollectionButton({ collectionId }: { collectionId: string }) {
  const [open, setOpen] = useState(false);

  return <><Button type="button" variant="destructive" className="gap-2" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" /> Delete collection</Button><CollectionDeleteDialog collectionId={collectionId} open={open} onOpenChange={setOpen} /></>;
}
