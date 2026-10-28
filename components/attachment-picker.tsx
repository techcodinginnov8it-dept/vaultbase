"use client";

/* eslint-disable @next/next/no-img-element */
import { FilePlus2, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";

const maxAttachmentCount = 10;
const maxAttachmentBytes = 200 * 1024 * 1024;

function fileLimit(file: File) {
  if (file.type.startsWith("image/")) return 10 * 1024 * 1024;
  if (file.type.startsWith("video/")) return 100 * 1024 * 1024;
  return 25 * 1024 * 1024;
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isSupported(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/") || ["application/pdf", "text/plain", "text/csv"].includes(file.type);
}

export function AttachmentPicker({ isPending = false, onFilesChange }: { isPending?: boolean; onFilesChange?: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextPreviews: Record<string, string> = {};
    files.forEach((file) => {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        nextPreviews[`${file.name}-${file.size}-${file.lastModified}`] = URL.createObjectURL(file);
      }
    });
    setPreviews(nextPreviews);
    return () => Object.values(nextPreviews).forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function syncInput(nextFiles: File[]) {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    nextFiles.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
  }

  function validate(nextFiles: File[]) {
    if (nextFiles.length > maxAttachmentCount) return `You can select up to ${maxAttachmentCount} files.`;
    if (nextFiles.reduce((total, file) => total + file.size, 0) > maxAttachmentBytes) return "The total attachment limit is 200 MB.";
    const invalidType = nextFiles.find((file) => !isSupported(file));
    if (invalidType) return `${invalidType.name} is not a supported image, video, PDF, TXT, or CSV file.`;
    const tooLarge = nextFiles.find((file) => file.size > fileLimit(file));
    if (tooLarge) return `${tooLarge.name} is larger than the allowed file size.`;
    return null;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    const validationError = validate(nextFiles);
    setError(validationError);
    event.currentTarget.setCustomValidity(validationError ?? "");
    if (validationError) {
      setFiles([]);
      onFilesChange?.([]);
      event.currentTarget.value = "";
      return;
    }
    setFiles(nextFiles);
    onFilesChange?.(nextFiles);
  }

  function removeFile(fileToRemove: File) {
    const nextFiles = files.filter((file) => file !== fileToRemove);
    setFiles(nextFiles);
    setError(null);
    onFilesChange?.(nextFiles);
    syncInput(nextFiles);
    inputRef.current?.setCustomValidity("");
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-sm font-medium">
        <span className="flex items-center gap-2"><UploadCloud className="h-4 w-4 text-primary" /> Attach files</span>
        <input ref={inputRef} type="file" multiple accept="image/*,video/*,application/pdf,text/plain,text/csv" onChange={handleChange} className="h-auto rounded-lg border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm" />
      </label>
      <p className="text-xs font-normal text-muted-foreground">Select up to 10 files and 200 MB total. Images up to 10 MB, videos up to 100 MB, and documents up to 25 MB.</p>
      {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{error}</p> : null}
      {files.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file) => {
            const key = `${file.name}-${file.size}-${file.lastModified}`;
            const preview = previews[key];
            return <div key={key} className="flex min-w-0 items-center gap-3 rounded-lg border bg-background p-2">
              {preview && file.type.startsWith("image/") ? <img src={preview} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" /> : null}
              {preview && file.type.startsWith("video/") ? <video src={preview} muted className="h-12 w-12 shrink-0 rounded-md bg-black object-cover" /> : null}
              {!preview ? <FilePlus2 className="h-5 w-5 shrink-0 text-muted-foreground" /> : null}
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{file.name}</span><span className="text-xs text-muted-foreground">{formatSize(file.size)}</span></span>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${file.name}`} className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFile(file)}><Trash2 className="h-4 w-4" /></Button>
            </div>;
          })}
        </div>
      ) : null}
      {isPending && files.length ? <p className="text-xs font-medium text-primary">Uploading {files.length} attachment{files.length === 1 ? "" : "s"}… Please keep this window open.</p> : null}
    </div>
  );
}
