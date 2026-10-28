"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { predefinedCollectionTypes } from "@/lib/collection-types";

const collectionTypes = predefinedCollectionTypes;
const collectionColors = ["slate", "blue", "violet", "emerald", "amber", "rose", "cyan", "orange"] as const;
const maxCollectionImageBytes = 5 * 1024 * 1024;

function getImage(formData: FormData) {
  const value = formData.get("collection_image");
  if (!(value instanceof File) || value.size === 0) return null;
  if (!value.type.startsWith("image/")) throw new Error("Collection image must be an image file.");
  if (value.size > maxCollectionImageBytes) throw new Error("Collection image must be 5 MB or smaller.");
  return value;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100) || "collection-image";
}

async function removeImage(supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"], path: string | null) {
  if (path) await supabase.storage.from("collection-images").remove([path]);
}

export async function createCollection(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const name = formData.get("name");
  const description = formData.get("description");
  const type = formData.get("collection_type");
  const customType = formData.get("custom_collection_type");
  const collectionName = typeof name === "string" ? name.trim() : "";
  const collectionDescription = typeof description === "string" ? description.trim() : "";
  const selectedType = typeof type === "string" ? type : "general";
  const customCollectionType = typeof customType === "string" ? customType.trim().replace(/\s+/g, " ") : "";
  const selectedColorValue = formData.get("collection_color");
  const collectionColor = typeof selectedColorValue === "string" && collectionColors.includes(selectedColorValue as (typeof collectionColors)[number]) ? selectedColorValue : "slate";
  const image = getImage(formData);
  const collectionType = selectedType === "other"
    ? customCollectionType
    : collectionTypes.includes(selectedType as (typeof collectionTypes)[number])
      ? selectedType
      : "general";

  if (!collectionName || collectionName.length > 100) {
    throw new Error("Collection name is required and must be 100 characters or fewer.");
  }

  if (selectedType === "other" && (!customCollectionType || customCollectionType.length > 50)) {
    throw new Error("Custom collection type is required and must be 50 characters or fewer.");
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({ owner_id: userId, name: collectionName, collection_type: collectionType, description: collectionDescription || null, color: collectionColor })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") throw new Error("You already have a collection with this name.");
    throw new Error(error?.message || "Unable to create collection.");
  }

  let imagePath: string | null = null;
  try {
    if (image) {
      imagePath = `${userId}/${data.id}/${crypto.randomUUID()}-${safeFileName(image.name)}`;
      const { error: uploadError } = await supabase.storage.from("collection-images").upload(imagePath, image, { contentType: image.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message || "Unable to upload collection image.");
      const { error: imageError } = await supabase.from("collections").update({ cover_path: imagePath }).eq("id", data.id).eq("owner_id", userId);
      if (imageError) throw new Error(imageError.message || "Unable to save collection image.");
    }
  } catch (caught: unknown) {
    await removeImage(supabase, imagePath);
    await supabase.from("collections").delete().eq("id", data.id).eq("owner_id", userId);
    throw caught;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/collections");
  return data.id;
}

export async function updateCollection(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const id = formData.get("id");
  const name = formData.get("name");
  const description = formData.get("description");
  const type = formData.get("collection_type");
  const customType = formData.get("custom_collection_type");
  const collectionId = typeof id === "string" ? id : "";
  const collectionName = typeof name === "string" ? name.trim() : "";
  const collectionDescription = typeof description === "string" ? description.trim() : "";
  const selectedType = typeof type === "string" ? type : "general";
  const customCollectionType = typeof customType === "string" ? customType.trim().replace(/\s+/g, " ") : "";
  const selectedColorValue = formData.get("collection_color");
  const collectionColor = typeof selectedColorValue === "string" && collectionColors.includes(selectedColorValue as (typeof collectionColors)[number]) ? selectedColorValue : "slate";
  const image = getImage(formData);
  const removeCurrentImage = formData.get("remove_collection_image") === "true";
  const collectionType = selectedType === "other"
    ? customCollectionType
    : collectionTypes.includes(selectedType as (typeof collectionTypes)[number])
      ? selectedType
      : "general";

  if (!collectionId) throw new Error("Collection id is required.");
  if (!collectionName || collectionName.length > 100) {
    throw new Error("Collection name is required and must be 100 characters or fewer.");
  }
  if (selectedType === "other" && (!customCollectionType || customCollectionType.length > 50)) {
    throw new Error("Custom collection type is required and must be 50 characters or fewer.");
  }

  const { data: existingCollection, error: existingError } = await supabase
    .from("collections")
    .select("id, cover_path")
    .eq("id", collectionId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (existingError || !existingCollection) throw new Error("Collection not found.");

  let newImagePath: string | null = null;
  if (image) {
    newImagePath = `${userId}/${collectionId}/${crypto.randomUUID()}-${safeFileName(image.name)}`;
    const { error: uploadError } = await supabase.storage.from("collection-images").upload(newImagePath, image, { contentType: image.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message || "Unable to upload collection image.");
  }

  const nextCoverPath = newImagePath || (removeCurrentImage ? null : existingCollection.cover_path);
  const { error } = await supabase
    .from("collections")
    .update({ name: collectionName, collection_type: collectionType, description: collectionDescription || null, cover_path: nextCoverPath, color: collectionColor })
    .eq("id", collectionId)
    .eq("owner_id", userId);

  if (error) {
    await removeImage(supabase, newImagePath);
    if (error.code === "23505") throw new Error("You already have a collection with this name.");
    throw new Error(error.message || "Unable to update collection.");
  }

  if (existingCollection.cover_path && existingCollection.cover_path !== nextCoverPath) await removeImage(supabase, existingCollection.cover_path);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/collections");
  revalidatePath("/dashboard/collections/" + collectionId);
}

export async function deleteCollection(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const id = formData.get("id");
  const collectionId = typeof id === "string" ? id : "";
  if (!collectionId) throw new Error("Collection id is required.");

  const { data: collection, error: lookupError } = await supabase
    .from("collections")
    .select("id, cover_path")
    .eq("id", collectionId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (lookupError || !collection) throw new Error("Collection not found.");

  const { error } = await supabase.from("collections").delete().eq("id", collectionId).eq("owner_id", userId);
  if (error) throw new Error(error.message || "Unable to delete collection.");
  await removeImage(supabase, collection.cover_path);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/collections");
}

export async function updateCollectionColor(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const id = formData.get("id");
  const selectedColor = formData.get("collection_color");
  const collectionId = typeof id === "string" ? id : "";
  const color = typeof selectedColor === "string" && collectionColors.includes(selectedColor as (typeof collectionColors)[number]) ? selectedColor : "";
  if (!collectionId || !color) throw new Error("A valid collection and color are required.");

  const { error } = await supabase.from("collections").update({ color }).eq("id", collectionId).eq("owner_id", userId);
  if (error) throw new Error(error.message || "Unable to update collection color.");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/collections");
  revalidatePath("/dashboard/collections/" + collectionId);
}
