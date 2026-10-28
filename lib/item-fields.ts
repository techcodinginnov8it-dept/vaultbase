export type DynamicFieldType = "text" | "email" | "url" | "number" | "date" | "checkbox";

export type DynamicField = {
  id: string;
  label: string;
  type: DynamicFieldType;
  value: string;
};

type FieldTemplate = Pick<DynamicField, "label" | "type">;

const templates: Record<string, FieldTemplate[]> = {
  account: [
    { label: "Service name", type: "text" },
    { label: "Login URL", type: "url" },
    { label: "Recovery email", type: "email" },
    { label: "Recovery phone", type: "text" },
    { label: "Two-factor authentication", type: "checkbox" },
  ],
  contact: [
    { label: "Full name", type: "text" },
    { label: "Email", type: "email" },
    { label: "Phone", type: "text" },
    { label: "Company", type: "text" },
    { label: "Job title", type: "text" },
  ],
  project: [
    { label: "Status", type: "text" },
    { label: "Owner or team", type: "text" },
    { label: "Target deadline", type: "date" },
    { label: "Repository URL", type: "url" },
    { label: "Documentation URL", type: "url" },
  ],
  bookmark: [
    { label: "Website title", type: "text" },
    { label: "Source or site", type: "text" },
    { label: "Summary", type: "text" },
  ],
  note: [
    { label: "Topic", type: "text" },
    { label: "Reminder date", type: "date" },
  ],
  document: [
    { label: "Document number", type: "text" },
    { label: "Document date", type: "date" },
    { label: "Owner or issuer", type: "text" },
  ],
  task: [
    { label: "Status", type: "text" },
    { label: "Priority", type: "text" },
    { label: "Due date", type: "date" },
    { label: "Owner", type: "text" },
  ],
  event: [
    { label: "Event date", type: "date" },
    { label: "Location", type: "text" },
    { label: "Organizer", type: "text" },
  ],
  subscription: [
    { label: "Provider", type: "text" },
    { label: "Plan", type: "text" },
    { label: "Renewal date", type: "date" },
    { label: "Cost", type: "number" },
  ],
  vendor: [
    { label: "Company name", type: "text" },
    { label: "Contact email", type: "email" },
    { label: "Contact phone", type: "text" },
    { label: "Contract renewal", type: "date" },
  ],
};

export const dynamicFieldTypes: { value: DynamicFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Yes / No" },
];

export function getFieldTemplates(itemType: string) {
  return templates[itemType] ?? [];
}

export function parseDynamicFields(value: unknown): DynamicField[] {
  const rawFields = value && typeof value === "object" && !Array.isArray(value) && "fields" in value
    ? (value as { fields?: unknown }).fields
    : value;

  if (!Array.isArray(rawFields)) return [];

  return rawFields.flatMap((field, index) => {
    if (!field || typeof field !== "object") return [];
    const candidate = field as Record<string, unknown>;
    const label = typeof candidate.label === "string" ? candidate.label.trim().slice(0, 100) : "";
    const type = dynamicFieldTypes.some((option) => option.value === candidate.type)
      ? candidate.type as DynamicFieldType
      : "text";
    const value = typeof candidate.value === "string" ? candidate.value.slice(0, 2000) : "";
    if (!label || !value) return [];
    return [{ id: typeof candidate.id === "string" ? candidate.id.slice(0, 80) : `field-${index}`, label, type, value }];
  }).slice(0, 30);
}

export function parseNormalizedFields(value: unknown): DynamicField[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const definitionValue = row.item_field_definitions;
    const definition = Array.isArray(definitionValue) ? definitionValue[0] : definitionValue;
    if (!definition || typeof definition !== "object") return [];
    const candidate = definition as Record<string, unknown>;
    const label = typeof candidate.label === "string" ? candidate.label.trim().slice(0, 100) : "";
    const type = dynamicFieldTypes.some((option) => option.value === candidate.field_type)
      ? candidate.field_type as DynamicFieldType
      : "text";
    const fieldValue = typeof row.value_text === "string" ? row.value_text.slice(0, 2000) : "";
    if (!label || !fieldValue) return [];
    return [{ id: typeof candidate.field_key === "string" ? candidate.field_key : `field-${index}`, label, type, value: fieldValue }];
  });
}

export function parseDynamicFieldsJson(value: string) {
  if (!value) return [];
  try {
    const fields = parseDynamicFields(JSON.parse(value));
    if (fields.some((field) => /password|passphrase|secret|token|api\s*key|private\s*key/i.test(field.label))) {
      throw new Error("Passwords, tokens, and secret keys must use the protected credentials flow.");
    }
    return fields;
  } catch {
    throw new Error("Custom fields contain invalid data or sensitive credential labels.");
  }
}
