"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";

const collectionTypes = ["general", "work", "personal", "finance", "projects", "bookmarks"] as const;

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
    .insert({ owner_id: userId, name: collectionName, collection_type: collectionType, description: collectionDescription || null })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") throw new Error("You already have a collection with this name.");
    throw new Error(error?.message || "Unable to create collection.");
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

  const { error } = await supabase
    .from("collections")
    .update({ name: collectionName, collection_type: collectionType, description: collectionDescription || null })
    .eq("id", collectionId)
    .eq("owner_id", userId);

  if (error) {
    if (error.code === "23505") throw new Error("You already have a collection with this name.");
    throw new Error(error.message || "Unable to update collection.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/collections");
  revalidatePath("/dashboard/collections/" + collectionId);
}
