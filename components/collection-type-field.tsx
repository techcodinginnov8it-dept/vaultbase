"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDown, Check } from "lucide-react";
import { CollectionTypeIcon } from "@/components/collection-type-icon";
import { collectionTypeOptions } from "@/lib/collection-types";
import { cn } from "@/lib/utils";

type CollectionTypeFieldProps = {
  initialType?: string;
};

export function CollectionTypeField({ initialType = "general" }: CollectionTypeFieldProps) {
  const initialIsPredefined = collectionTypeOptions.some((option) => option.value === initialType);
  const [type, setType] = useState(initialIsPredefined ? initialType : "other");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = collectionTypeOptions.find((option) => option.value === type);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <label className="text-sm font-medium">Collection type</label>
      <input type="hidden" name="collection_type" value={type} />
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex h-11 items-center gap-3 rounded-lg border bg-background px-3 text-left text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><CollectionTypeIcon type={type} className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate font-medium">{selected?.label ?? "Custom type"}</span><span className="block truncate text-xs text-muted-foreground">{selected?.description ?? "Your custom collection type"}</span></span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div role="listbox" aria-label="Collection type options" className="z-20 grid max-h-64 gap-1 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-lg">
        {collectionTypeOptions.map((option) => <button key={option.value} type="button" role="option" aria-selected={type === option.value} onClick={() => { setType(option.value); setOpen(false); }} className={cn("flex items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-muted", type === option.value && "bg-primary/10 text-primary")}><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground", type === option.value && "bg-primary text-primary-foreground")}><CollectionTypeIcon type={option.value} className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{option.label}</span><span className="block truncate text-xs text-muted-foreground">{option.description}</span></span>{type === option.value ? <Check className="h-4 w-4" /> : null}</button>)}
        <button type="button" role="option" aria-selected={type === "other"} onClick={() => { setType("other"); setOpen(false); }} className={cn("flex items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-muted", type === "other" && "bg-primary/10 text-primary")}><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground", type === "other" && "bg-primary text-primary-foreground")}><CollectionTypeIcon type="other" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">Other</span><span className="block text-xs text-muted-foreground">Create your own collection type</span></span>{type === "other" ? <Check className="h-4 w-4" /> : null}</button>
      </div> : null}
      {type === "other" ? (
        <input
          name="custom_collection_type"
          required
          maxLength={50}
          defaultValue={initialIsPredefined ? "" : initialType}
          placeholder="Type your collection type"
          className="h-10 rounded-lg border bg-background px-3 text-sm"
          autoFocus
        />
      ) : null}
    </div>
  );
}
