"use client";

import { Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export type ItemLinkValue = { label: string; url: string };
type LinkRow = ItemLinkValue & { id: string };

function newRow(value: ItemLinkValue = { label: "", url: "" }): LinkRow {
  return { ...value, id: crypto.randomUUID() };
}

export function RepeatableLinksEditor({ initialLinks = [] }: { initialLinks?: ItemLinkValue[] }) {
  const [rows, setRows] = useState<LinkRow[]>(() => {
    const saved = initialLinks.filter((link) => link.url.trim());
    return saved.length ? saved.map(newRow) : [newRow()];
  });

  function updateRow(id: string, key: keyof ItemLinkValue, value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
  }

  function removeRow(id: string) {
    setRows((current) => {
      const next = current.filter((row) => row.id !== id);
      return next.length ? next : [newRow()];
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Links</p>
          <p className="text-xs font-normal text-muted-foreground">Add as many labeled URLs as you need.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => setRows((current) => [...current, newRow()])}>
          <Plus className="h-4 w-4" /> Add another link
        </Button>
      </div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1.5 text-xs font-medium">
              Link label
              <input name="link_label" value={row.label} onChange={(event) => updateRow(row.id, "label", event.target.value)} maxLength={100} placeholder={`Link ${index + 1}`} className="h-10 rounded-md border bg-background px-3 text-sm font-normal" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium">
              URL
              <input name="urls" type="url" value={row.url} onChange={(event) => updateRow(row.id, "url", event.target.value)} placeholder="https://example.com" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" />
            </label>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove link ${index + 1}`} className="text-muted-foreground hover:text-destructive" onClick={() => removeRow(row.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> Only HTTP and HTTPS links are accepted.</p>
    </div>
  );
}
