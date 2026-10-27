"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function textValues(formData: FormData, key: string) {
  return formData.getAll(key)
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(/\r?\n/).map((part) => part.trim()))
    .filter(Boolean);
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

async function removeUploadedFiles(supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"], paths: string[]) {
  if (paths.length) await supabase.storage.from("item-attachments").remove(paths);
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
  const collectionId = textValue(formData, "collection_id") || null;
  const linkValues = textValues(formData, "urls");
  if (!linkValues.length) {
    const legacyUrl = textValue(formData, "url");
    if (legacyUrl) linkValues.push(legacyUrl);
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
  if (!['contact', 'account', 'project', 'bookmark', 'custom'].includes(itemType)) {
    throw new Error("Invalid item type.");
  }
  if (itemType === "custom" && (!customType || customType.length > 100)) {
    throw new Error("Custom item type is required and must be 100 characters or fewer.");
  }

  const safeLinks = linkValues.map(safeUrl);
  if (safeLinks.some((link) => !link)) throw new Error("Links must use http:// or https://.");

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
    })
    .select("id")
    .single();

  if (itemError || !item) throw new Error(itemError?.message || "Unable to create item.");

  const uploadedPaths: string[] = [];
  try {
    for (const safeLink of safeLinks) {
      if (safeLink) {
        const { error } = await supabase.from("item_links").insert({ item_id: item.id, owner_id: userId, label: "Link", url: safeLink });
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
  const collectionId = textValue(formData, "collection_id") || null;
  const linkValues = textValues(formData, "urls");
  if (!linkValues.length) {
    const legacyUrl = textValue(formData, "url");
    if (legacyUrl) linkValues.push(legacyUrl);
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
  if (!["contact", "account", "project", "bookmark", "custom"].includes(itemType)) throw new Error("Invalid item type.");
  if (itemType === "custom" && (!customType || customType.length > 100)) throw new Error("Custom item type is required and must be 100 characters or fewer.");

  const safeLinks = linkValues.map(safeUrl);
  if (safeLinks.some((link) => !link)) throw new Error("Links must use http:// or https://.");

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

  const { error: itemError } = await supabase
    .from("items")
    .update({ title, item_type: itemType, custom_type: itemType === "custom" ? customType : null, collection_id: collectionId, description: description || null })
    .eq("id", itemId)
    .eq("owner_id", userId);
  if (itemError) throw new Error(itemError.message || "Unable to update item.");

  const { error: linkDeleteError } = await supabase.from("item_links").delete().eq("item_id", itemId).eq("owner_id", userId);
  if (linkDeleteError) throw new Error(linkDeleteError.message);
  for (const safeLink of safeLinks) {
    if (safeLink) {
      const { error: linkError } = await supabase.from("item_links").insert({ item_id: itemId, owner_id: userId, label: "Link", url: safeLink });
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
