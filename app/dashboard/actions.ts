"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { parseDynamicFieldsJson, type DynamicField } from "@/lib/item-fields";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function linkEntries(formData: FormData) {
  const urls = formData.getAll("urls").filter((value): value is string => typeof value === "string");
  const labels = formData.getAll("link_label").filter((value): value is string => typeof value === "string");
  return urls.flatMap((value, index) => value.split(/\r?\n/).map((url) => ({ label: (labels[index] ?? "").trim().slice(0, 100) || "Link", url: url.trim() })).filter((entry) => entry.url));
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const allowedAttachmentTypes = new Set(["application/pdf", "text/plain", "text/csv"]);

function attachmentLimit(mimeType: string) {
  if (mimeType.startsWith("image/")) return 10 * 1024 * 1024;
  if (mimeType.startsWith("video/")) return 100 * 1024 * 1024;
  return 25 * 1024 * 1024;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "file";
}

const maxAttachmentCount = 10;
const maxAttachmentBytesPerRequest = 200 * 1024 * 1024;

function fieldKey(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `field-${crypto.randomUUID().slice(0, 8)}`;
}

async function getOrCreateItemType(supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"], userId: string, itemType: string, customType: string) {
  const typeKey = itemType === "custom" ? `custom-${fieldKey(customType)}` : itemType;
  const typeQuery = supabase.from("item_types").select("id").eq("type_key", typeKey);
  const { data: systemType } = itemType === "custom"
    ? { data: null }
    : await typeQuery.is("owner_id", null).eq("is_system", true).maybeSingle();
  if (systemType?.id) return systemType.id as string;

  const { data: ownType } = await supabase.from("item_types").select("id").eq("owner_id", userId).eq("type_key", typeKey).maybeSingle();
  if (ownType?.id) return ownType.id as string;
  const { data: createdType, error } = await supabase.from("item_types").insert({
    owner_id: userId,
    type_key: typeKey,
    label: itemType === "custom" ? customType : itemType,
    description: itemType === "custom" ? "User-defined item type" : null,
    icon: itemType,
    is_system: false,
  }).select("id").single();
  if (error || !createdType) throw new Error(error?.message || "Unable to save the item type.");
  return createdType.id as string;
}

async function syncNormalizedFields(
  supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"],
  userId: string,
  itemId: string,
  itemTypeId: string,
  fields: DynamicField[],
) {
  const [{ data: systemDefinitions }, { data: ownDefinitions }] = await Promise.all([
    supabase.from("item_field_definitions").select("id, label, field_type").eq("item_type_id", itemTypeId).is("owner_id", null).eq("is_system", true),
    supabase.from("item_field_definitions").select("id, label, field_type").eq("item_type_id", itemTypeId).eq("owner_id", userId).eq("is_system", false),
  ]);
  const definitions = [...(systemDefinitions ?? []), ...(ownDefinitions ?? [])];
  const values = [] as { definitionId: string; value: string }[];

  for (const field of fields) {
    let definition = definitions.find((candidate) => candidate.label.trim().toLowerCase() === field.label.trim().toLowerCase());
    if (!definition) {
      const { data: createdDefinition, error } = await supabase.from("item_field_definitions").insert({
        item_type_id: itemTypeId,
        owner_id: userId,
        field_key: fieldKey(field.label),
        label: field.label,
        field_type: field.type,
        position: definitions.length,
        is_system: false,
      }).select("id, label, field_type").single();
      if (error || !createdDefinition) throw new Error(error?.message || "Unable to save the custom field definition.");
      definition = createdDefinition;
      definitions.push(definition);
    }
    values.push({ definitionId: definition.id as string, value: field.value });
  }

  const { error: deleteError } = await supabase.from("item_field_values").delete().eq("item_id", itemId).eq("owner_id", userId);
  if (deleteError) throw new Error(deleteError.message);
  if (!values.length) return;
  const { error: valueError } = await supabase.from("item_field_values").insert(values.map((value) => ({
    item_id: itemId,
    owner_id: userId,
    field_definition_id: value.definitionId,
    value_text: value.value,
  })));
  if (valueError) throw new Error(valueError.message);
}

async function removeUploadedFiles(supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"], paths: string[]) {
  if (paths.length) await supabase.storage.from("item-attachments").remove(paths);
}

function attachmentMetadata(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Attachment metadata is invalid.");
  }
  if (!Array.isArray(parsed) || parsed.length > maxAttachmentCount) throw new Error(`You can upload up to ${maxAttachmentCount} files at a time.`);
  return parsed.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Attachment metadata is invalid.");
    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id : "";
    const storagePath = typeof candidate.storagePath === "string" ? candidate.storagePath : "";
    const originalName = typeof candidate.originalName === "string" ? candidate.originalName.trim().slice(0, 255) : "";
    const mimeType = typeof candidate.mimeType === "string" ? candidate.mimeType.trim().slice(0, 100) : "";
    const sizeBytes = typeof candidate.sizeBytes === "number" ? candidate.sizeBytes : 0;
    if (!id || !storagePath || !originalName || !mimeType || !Number.isInteger(sizeBytes) || sizeBytes <= 0) throw new Error("Attachment metadata is invalid.");
    return { id, storagePath, originalName, mimeType, sizeBytes };
  });
}

export async function registerAttachments(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const itemId = textValue(formData, "item_id");
  const attachments = attachmentMetadata(textValue(formData, "attachments_json"));
  if (!itemId || !attachments.length) return;

  const { data: item, error: itemError } = await supabase.from("items").select("id").eq("id", itemId).eq("owner_id", userId).maybeSingle();
  if (itemError || !item) throw new Error("Item not found.");
  const totalBytes = attachments.reduce((total, attachment) => total + attachment.sizeBytes, 0);
  if (totalBytes > maxAttachmentBytesPerRequest) throw new Error("Attachments are too large. The total upload limit is 200 MB.");

  for (const attachment of attachments) {
    const supported = attachment.mimeType.startsWith("image/") || attachment.mimeType.startsWith("video/") || allowedAttachmentTypes.has(attachment.mimeType);
    if (!supported || attachment.sizeBytes > attachmentLimit(attachment.mimeType)) throw new Error(`Unsupported or oversized attachment: ${attachment.originalName}`);
    if (!attachment.storagePath.startsWith(`${userId}/${itemId}/`) || !attachment.storagePath.includes(`/${attachment.id}-`)) throw new Error("Invalid attachment storage path.");
  }

  const { error } = await supabase.from("attachments").insert(attachments.map((attachment) => ({
    id: attachment.id,
    item_id: itemId,
    owner_id: userId,
    storage_path: attachment.storagePath,
    original_name: attachment.originalName,
    mime_type: attachment.mimeType,
    size_bytes: attachment.sizeBytes,
  })));
  if (error) {
    await removeUploadedFiles(supabase, attachments.map((attachment) => attachment.storagePath));
    throw new Error(error.message || "Unable to save attachment metadata.");
  }
  revalidatePath("/dashboard/" + itemId);
}

export async function removeItemAfterAttachmentFailure(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const itemId = textValue(formData, "item_id");
  if (!itemId) throw new Error("Item is required.");
  const { error } = await supabase.from("items").delete().eq("id", itemId).eq("owner_id", userId);
  if (error) throw new Error(error.message || "Unable to roll back the item.");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/collections");
}

function validateAttachments(files: File[]) {
  if (files.length > maxAttachmentCount) throw new Error(`You can upload up to ${maxAttachmentCount} files at a time.`);
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > maxAttachmentBytesPerRequest) throw new Error("Attachments are too large. The total upload limit is 200 MB.");
  for (const file of files) {
    const supported = file.type.startsWith("image/") || file.type.startsWith("video/") || allowedAttachmentTypes.has(file.type);
    if (!supported) throw new Error(`Unsupported attachment type: ${file.name}`);
    if (file.size > attachmentLimit(file.type)) throw new Error(`Attachment is too large: ${file.name}`);
  }
}

export async function createItem(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const title = textValue(formData, "title");
  const description = textValue(formData, "description");
  const itemType = textValue(formData, "item_type") || "custom";
  const customType = textValue(formData, "custom_item_type");
  const dynamicFields = parseDynamicFieldsJson(textValue(formData, "dynamic_fields"));
  const collectionId = textValue(formData, "collection_id") || null;
  const linkValues = linkEntries(formData);
  if (!linkValues.length) {
    const legacyUrl = textValue(formData, "url");
    if (legacyUrl) linkValues.push({ label: "Link", url: legacyUrl });
  }
  const encryptedPayload = textValue(formData, "encrypted_payload");
  const credentialSalt = textValue(formData, "credential_salt");
  const credentialIv = textValue(formData, "credential_iv");
  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  const tagValues = textValue(formData, "tags")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, 20);

  if (!title || title.length > 200) throw new Error("Title is required and must be 200 characters or fewer.");
  if (encryptedPayload && (!credentialSalt || !credentialIv)) throw new Error("Credential encryption data is incomplete.");
  if (!['contact', 'account', 'project', 'bookmark', 'note', 'document', 'task', 'event', 'subscription', 'vendor', 'custom'].includes(itemType)) {
    throw new Error("Invalid item type.");
  }
  if (itemType === "custom" && (!customType || customType.length > 100)) {
    throw new Error("Custom item type is required and must be 100 characters or fewer.");
  }

  const safeLinks = linkValues.map((entry) => ({ ...entry, url: safeUrl(entry.url) }));
  if (safeLinks.some((link) => !link.url)) throw new Error("Links must use http:// or https://.");

  validateAttachments(files);

  if (collectionId) {
    const { data: collection, error: collectionError } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (collectionError || !collection) throw new Error("Invalid collection.");
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert({
      owner_id: userId,
      collection_id: collectionId,
      title,
      item_type: itemType,
      custom_type: itemType === "custom" ? customType : null,
      description: description || null,
      structured_data: { fields: dynamicFields },
    })
    .select("id")
    .single();

  if (itemError || !item) throw new Error(itemError?.message || "Unable to create item.");

  const uploadedPaths: string[] = [];
  try {
    const itemTypeId = await getOrCreateItemType(supabase, userId, itemType, customType);
    const { error: typeLinkError } = await supabase.from("items").update({ item_type_id: itemTypeId }).eq("id", item.id).eq("owner_id", userId);
    if (typeLinkError) throw new Error(typeLinkError.message);
    await syncNormalizedFields(supabase, userId, item.id, itemTypeId, dynamicFields);

    for (const safeLink of safeLinks) {
      if (safeLink.url) {
        const { error } = await supabase.from("item_links").insert({ item_id: item.id, owner_id: userId, label: safeLink.label, url: safeLink.url });
        if (error) throw new Error(error.message);
      }
    }

    if (encryptedPayload) {
      const { error } = await supabase.from("item_credentials").insert({ item_id: item.id, owner_id: userId, encrypted_payload: encryptedPayload, salt: credentialSalt, iv: credentialIv });
      if (error) throw new Error(error.message);
    }

    for (const file of files) {
      const attachmentId = crypto.randomUUID();
      const storagePath = `${userId}/${item.id}/${attachmentId}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("item-attachments").upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message || `Unable to upload ${file.name}.`);
      uploadedPaths.push(storagePath);

      const { error: attachmentError } = await supabase.from("attachments").insert({ id: attachmentId, item_id: item.id, owner_id: userId, storage_path: storagePath, original_name: file.name, mime_type: file.type, size_bytes: file.size });
      if (attachmentError) throw new Error(attachmentError.message || `Unable to save ${file.name}.`);
    }

    for (const name of tagValues) {
      const { data: tag, error: tagError } = await supabase.from("tags").upsert({ owner_id: userId, name }, { onConflict: "owner_id,name" }).select("id").single();
      if (tagError || !tag) throw new Error(tagError?.message || "Unable to create tag.");
      const { error: relationError } = await supabase.from("item_tags").insert({ item_id: item.id, tag_id: tag.id, owner_id: userId });
      if (relationError) throw new Error(relationError.message);
    }
  } catch (caught: unknown) {
    await removeUploadedFiles(supabase, uploadedPaths);
    await supabase.from("items").delete().eq("id", item.id).eq("owner_id", userId);
    throw caught;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/collections");
  if (collectionId) revalidatePath("/dashboard/collections/" + collectionId);
  return item.id;
}

export async function updateItem(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const itemId = textValue(formData, "item_id");
  const title = textValue(formData, "title");
  const description = textValue(formData, "description");
  const itemType = textValue(formData, "item_type") || "custom";
  const customType = textValue(formData, "custom_item_type");
  const dynamicFields = parseDynamicFieldsJson(textValue(formData, "dynamic_fields"));
  const collectionId = textValue(formData, "collection_id") || null;
  const linkValues = linkEntries(formData);
  if (!linkValues.length) {
    const legacyUrl = textValue(formData, "url");
    if (legacyUrl) linkValues.push({ label: "Link", url: legacyUrl });
  }
  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  const tagValues = textValue(formData, "tags")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, 20);

  if (!itemId) throw new Error("Item is required.");
  if (!title || title.length > 200) throw new Error("Title is required and must be 200 characters or fewer.");
  if (!["contact", "account", "project", "bookmark", "note", "document", "task", "event", "subscription", "vendor", "custom"].includes(itemType)) throw new Error("Invalid item type.");
  if (itemType === "custom" && (!customType || customType.length > 100)) throw new Error("Custom item type is required and must be 100 characters or fewer.");

  const safeLinks = linkValues.map((entry) => ({ ...entry, url: safeUrl(entry.url) }));
  if (safeLinks.some((link) => !link.url)) throw new Error("Links must use http:// or https://.");

  validateAttachments(files);

  if (collectionId) {
    const { data: collection } = await supabase.from("collections").select("id").eq("id", collectionId).eq("owner_id", userId).maybeSingle();
    if (!collection) throw new Error("Invalid collection.");
  }

  const { data: existingItem, error: existingItemError } = await supabase
    .from("items")
    .select("id, collection_id")
    .eq("id", itemId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (existingItemError || !existingItem) throw new Error("Item not found.");

  const itemTypeId = await getOrCreateItemType(supabase, userId, itemType, customType);

  const { error: itemError } = await supabase
    .from("items")
    .update({ title, item_type: itemType, item_type_id: itemTypeId, custom_type: itemType === "custom" ? customType : null, collection_id: collectionId, description: description || null, structured_data: { fields: dynamicFields } })
    .eq("id", itemId)
    .eq("owner_id", userId);
  if (itemError) throw new Error(itemError.message || "Unable to update item.");
  await syncNormalizedFields(supabase, userId, itemId, itemTypeId, dynamicFields);

  const { error: linkDeleteError } = await supabase.from("item_links").delete().eq("item_id", itemId).eq("owner_id", userId);
  if (linkDeleteError) throw new Error(linkDeleteError.message);
  for (const safeLink of safeLinks) {
    if (safeLink.url) {
      const { error: linkError } = await supabase.from("item_links").insert({ item_id: itemId, owner_id: userId, label: safeLink.label, url: safeLink.url });
      if (linkError) throw new Error(linkError.message);
    }
  }

  const { error: tagDeleteError } = await supabase.from("item_tags").delete().eq("item_id", itemId).eq("owner_id", userId);
  if (tagDeleteError) throw new Error(tagDeleteError.message);
  for (const name of tagValues) {
    const { data: tag, error: tagError } = await supabase.from("tags").upsert({ owner_id: userId, name }, { onConflict: "owner_id,name" }).select("id").single();
    if (tagError || !tag) throw new Error(tagError?.message || "Unable to update tags.");
    const { error: relationError } = await supabase.from("item_tags").insert({ item_id: itemId, tag_id: tag.id, owner_id: userId });
    if (relationError) throw new Error(relationError.message);
  }

  const uploadedPaths: string[] = [];
  const uploadedAttachmentIds: string[] = [];
  try {
    for (const file of files) {
      const attachmentId = crypto.randomUUID();
      const storagePath = `${userId}/${itemId}/${attachmentId}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("item-attachments").upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message || `Unable to upload ${file.name}.`);
      uploadedPaths.push(storagePath);
      const { error: attachmentError } = await supabase.from("attachments").insert({ id: attachmentId, item_id: itemId, owner_id: userId, storage_path: storagePath, original_name: file.name, mime_type: file.type, size_bytes: file.size });
      if (attachmentError) throw new Error(attachmentError.message || `Unable to save ${file.name}.`);
      uploadedAttachmentIds.push(attachmentId);
    }
  } catch (caught: unknown) {
    await removeUploadedFiles(supabase, uploadedPaths);
    if (uploadedAttachmentIds.length) await supabase.from("attachments").delete().in("id", uploadedAttachmentIds).eq("owner_id", userId);
    throw caught;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/" + itemId);
  revalidatePath("/dashboard/collections");
  if (existingItem.collection_id && existingItem.collection_id !== collectionId) {
    revalidatePath("/dashboard/collections/" + existingItem.collection_id);
  }
  if (collectionId) revalidatePath("/dashboard/collections/" + collectionId);
}

export async function updateItemCredentials(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const itemId = textValue(formData, "item_id");
  const encryptedPayload = textValue(formData, "encrypted_payload");
  const salt = textValue(formData, "credential_salt");
  const iv = textValue(formData, "credential_iv");

  if (!itemId || !encryptedPayload || !salt || !iv) throw new Error("Credential encryption data is incomplete.");

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id")
    .eq("id", itemId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (itemError || !item) throw new Error("Item not found.");

  const { error } = await supabase.from("item_credentials").upsert({
    item_id: itemId,
    owner_id: userId,
    encrypted_payload: encryptedPayload,
    salt,
    iv,
  }, { onConflict: "item_id" });
  if (error) throw new Error(error.message || "Unable to update credentials.");

  revalidatePath("/dashboard/" + itemId);
}

export async function deleteAttachment(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const attachmentId = textValue(formData, "attachment_id");
  if (!attachmentId) throw new Error("Attachment is required.");

  const { data: attachment, error: attachmentError } = await supabase
    .from("attachments")
    .select("id, item_id, storage_path")
    .eq("id", attachmentId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (attachmentError || !attachment) throw new Error("Attachment not found.");

  const { error: storageError } = await supabase.storage.from("item-attachments").remove([attachment.storage_path]);
  if (storageError) throw new Error(storageError.message || "Unable to delete attachment file.");

  const { error: deleteError } = await supabase.from("attachments").delete().eq("id", attachmentId).eq("owner_id", userId);
  if (deleteError) throw new Error(deleteError.message || "Unable to delete attachment.");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/" + attachment.item_id);
  revalidatePath("/dashboard/collections");
}
