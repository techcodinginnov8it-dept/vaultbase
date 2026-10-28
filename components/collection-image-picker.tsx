"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const maxImageBytes = 5 * 1024 * 1024;

export function CollectionImagePicker({ currentImageUrl, allowRemove = false }: { currentImageUrl?: string | null; allowRemove?: boolean }) {
  const [preview, setPreview] = useState(currentImageUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      event.currentTarget.setCustomValidity("Please choose an image file.");
      return;
    }
    if (file.size > maxImageBytes) {
      setError("Collection images must be 5 MB or smaller.");
      event.currentTarget.setCustomValidity("Collection images must be 5 MB or smaller.");
      return;
    }
    setError(null);
    event.currentTarget.setCustomValidity("");
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-primary/10 text-primary">
          {preview ? <img src={preview} alt="Collection preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
        </div>
        <div className="min-w-0"><p className="text-sm font-medium">Collection image <span className="font-normal text-muted-foreground">(optional)</span></p><p className="mt-1 text-xs text-muted-foreground">Use a square image up to 5 MB. The default folder icon is used when none is uploaded.</p></div>
      </div>
      <input name="collection_image" type="file" accept="image/*" onChange={handleChange} className="h-auto rounded-lg border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm" />
      {allowRemove && currentImageUrl ? <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name="remove_collection_image" value="true" className="h-4 w-4 rounded border" /> Remove current image</label> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /> Uploading a new image replaces the current one.</p>
    </div>
  );
}
