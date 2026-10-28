export const collectionColors = [
  { value: "slate", label: "Slate", swatch: "#cbd5e1", foreground: "#334155", classes: "bg-slate-200 text-slate-700" },
  { value: "blue", label: "Blue", swatch: "#bfdbfe", foreground: "#1d4ed8", classes: "bg-blue-100 text-blue-700" },
  { value: "violet", label: "Violet", swatch: "#ddd6fe", foreground: "#6d28d9", classes: "bg-violet-100 text-violet-700" },
  { value: "emerald", label: "Emerald", swatch: "#a7f3d0", foreground: "#047857", classes: "bg-emerald-100 text-emerald-700" },
  { value: "amber", label: "Amber", swatch: "#fde68a", foreground: "#b45309", classes: "bg-amber-100 text-amber-700" },
  { value: "rose", label: "Rose", swatch: "#fecdd3", foreground: "#be123c", classes: "bg-rose-100 text-rose-700" },
  { value: "cyan", label: "Cyan", swatch: "#a5f3fc", foreground: "#0e7490", classes: "bg-cyan-100 text-cyan-700" },
  { value: "orange", label: "Orange", swatch: "#fed7aa", foreground: "#c2410c", classes: "bg-orange-100 text-orange-700" },
] as const;

export function getCollectionColor(color: string | null | undefined) {
  return collectionColors.find((option) => option.value === color) ?? collectionColors[0];
}
