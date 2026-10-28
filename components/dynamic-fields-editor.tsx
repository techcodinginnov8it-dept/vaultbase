"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { dynamicFieldTypes, getFieldTemplates, type DynamicField, type DynamicFieldType } from "@/lib/item-fields";

type DynamicFieldsEditorProps = {
  itemType: string;
  initialFields?: DynamicField[];
};

function newField(overrides: Partial<DynamicField> = {}): DynamicField {
  return { id: crypto.randomUUID(), label: "", type: "text", value: "", ...overrides };
}

function fieldsForType(itemType: string, current: DynamicField[]) {
  const templates = getFieldTemplates(itemType);
  const currentByLabel = new Map(current.map((field) => [field.label.trim().toLowerCase(), field]));
  const templateLabels = new Set(templates.map((field) => field.label.toLowerCase()));
  const standardFields = templates.map((template) => currentByLabel.get(template.label.toLowerCase()) ?? newField(template));
  const additionalFields = current.filter((field) => !templateLabels.has(field.label.trim().toLowerCase()));
  return [...standardFields, ...additionalFields];
}

export function DynamicFieldsEditor({ itemType, initialFields = [] }: DynamicFieldsEditorProps) {
  const [fields, setFields] = useState<DynamicField[]>(() => fieldsForType(itemType, initialFields));
  const previousType = useRef(itemType);

  useEffect(() => {
    if (previousType.current === itemType) return;
    const previousTemplateLabels = new Set(getFieldTemplates(previousType.current).map((field) => field.label.toLowerCase()));
    previousType.current = itemType;
    setFields((current) => fieldsForType(itemType, current.filter((field) => !previousTemplateLabels.has(field.label.trim().toLowerCase()))));
  }, [itemType]);

  const updateField = (id: string, changes: Partial<DynamicField>) => {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...changes } : field));
  };

  return (
    <section className="space-y-4 rounded-xl border bg-muted/20 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-left text-sm font-semibold">Additional fields <span className="font-normal text-muted-foreground">(optional)</span></h3>
          <p className="mt-1 text-left text-xs leading-5 text-muted-foreground">Add safe details specific to this item type. Do not store passwords, tokens, or secret keys here.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => setFields((current) => [...current, newField()])} disabled={fields.length >= 30}>
          <Plus className="h-4 w-4" /> Add field
        </Button>
      </div>
      {fields.length ? <div className="space-y-3">{fields.map((field) => (
        <div key={field.id} className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_9rem_minmax(0,1.2fr)_auto] sm:items-center">
          <input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} maxLength={100} placeholder="Field name" aria-label="Custom field name" className="h-10 rounded-md border bg-background px-3 text-sm" />
          <select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as DynamicFieldType })} aria-label="Custom field type" className="h-10 rounded-md border bg-background px-3 text-sm">
            {dynamicFieldTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {field.type === "checkbox" ? <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={field.value === "true"} onChange={(event) => updateField(field.id, { value: String(event.target.checked) })} />Enabled</label> : <input type={field.type} value={field.value} onChange={(event) => updateField(field.id, { value: event.target.value })} maxLength={2000} placeholder="Value" aria-label="Custom field value" className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm" />}
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${field.label || "custom field"}`} onClick={() => setFields((current) => current.filter((candidate) => candidate.id !== field.id))}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
        </div>
      ))}</div> : <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">No additional fields. Use Add field if you need more details.</div>}
      <input type="hidden" name="dynamic_fields" value={JSON.stringify(fields)} />
    </section>
  );
}
