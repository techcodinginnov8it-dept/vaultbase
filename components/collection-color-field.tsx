"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { collectionColors } from "@/lib/collection-colors";

export function CollectionColorField({ initialColor = "slate" }: { initialColor?: string }) {
  const [color, setColor] = useState(collectionColors.some((option) => option.value === initialColor) ? initialColor : "slate");
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">Folder color</legend>
      <input type="hidden" name="collection_color" value={color} />
      <div className="flex flex-wrap gap-3">
        {collectionColors.map((option) => <button key={option.value} type="button" title={option.label} aria-label={`Use ${option.label} folder color`} aria-pressed={color === option.value} style={{ backgroundColor: option.swatch, color: option.foreground }} className={cn("flex h-12 w-12 items-center justify-center rounded-xl border-2 border-transparent shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", color === option.value && "border-foreground ring-2 ring-foreground/20")} onClick={() => setColor(option.value)}><span className="sr-only">{option.label}</span>{color === option.value ? <Check className="h-5 w-5" /> : null}</button>)}
      </div>
      <p className="text-xs font-normal text-muted-foreground">Selected color: <span className="font-semibold text-foreground">{collectionColors.find((option) => option.value === color)?.label ?? "Slate"}</span>. This color is used for the folder icon and collection card accent.</p>
    </fieldset>
  );
}
