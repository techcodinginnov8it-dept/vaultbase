"use client";

import {
  Bookmark,
  CalendarDays,
  ContactRound,
  FileText,
  FolderKanban,
  KeyRound,
  ListTodo,
  Package,
  ReceiptText,
  Sparkles,
  Store,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ItemTypeOption = { value: string; label: string; description: string; icon: LucideIcon };

export const itemTypeOptions: ItemTypeOption[] = [
  { value: "contact", label: "Contact", description: "People and contact details", icon: ContactRound },
  { value: "account", label: "Account", description: "Login and account information", icon: KeyRound },
  { value: "project", label: "Project", description: "Projects and workspaces", icon: FolderKanban },
  { value: "bookmark", label: "Bookmark", description: "Saved websites and references", icon: Bookmark },
  { value: "note", label: "Note", description: "Notes and reminders", icon: FileText },
  { value: "document", label: "Document", description: "Documents and records", icon: Package },
  { value: "task", label: "Task", description: "Tasks and to-dos", icon: ListTodo },
  { value: "event", label: "Event", description: "Dates and appointments", icon: CalendarDays },
  { value: "subscription", label: "Subscription", description: "Subscriptions and renewals", icon: ReceiptText },
  { value: "vendor", label: "Vendor", description: "Vendors and providers", icon: Store },
  { value: "custom", label: "Create new item type…", description: "Define your own item type", icon: Sparkles },
];

type ItemTypeSelectProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
};

export function ItemTypeSelect({ name, value, onChange }: ItemTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = itemTypeOptions.find((option) => option.value === value) ?? itemTypeOptions[0];
  const SelectedIcon = selected.icon;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button type="button" aria-haspopup="listbox" aria-expanded={open} className="flex h-11 w-full items-center gap-3 rounded-lg border bg-background px-3 text-left text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" onClick={() => setOpen((current) => !current)}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><SelectedIcon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate font-medium">{selected.label}</span><span className="block truncate text-xs text-muted-foreground">{selected.description}</span></span>
        <span className={cn("text-muted-foreground transition-transform", open && "rotate-180")}>⌄</span>
      </button>
      {open ? (
        <div role="listbox" aria-label="Item type options" className="absolute left-0 top-[calc(100%+0.5rem)] z-30 max-h-72 w-full overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
          {itemTypeOptions.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === value;
            return <button key={option.value} type="button" role="option" aria-selected={isSelected} className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted", isSelected && "bg-primary/10 text-primary")} onClick={() => { onChange(option.value); setOpen(false); }}>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground", isSelected && "bg-primary text-primary-foreground")}><OptionIcon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{option.label}</span><span className="block truncate text-xs text-muted-foreground">{option.description}</span></span>
              {isSelected ? <Tag className="h-4 w-4 shrink-0" /> : null}
            </button>;
          })}
        </div>
      ) : null}
    </div>
  );
}
