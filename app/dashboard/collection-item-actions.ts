"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";

export async function assignItemToCollection(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const itemIdValue = formData.get("item_id");
  const collectionIdValue = formData.get("collection_id");
  const itemId = typeof itemIdValue === "string" ? itemIdValue : "";
  const collectionId = typeof collectionIdValue === "string" ? collectionIdValue : "";

  if (!itemId) throw new Error("Item is required.");

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, collection_id")
    .eq("id", itemId)
    .eq("owner_id", userId)
    .single();

  if (itemError || !item) throw new Error("Item not found.");

  if (collectionId) {
    const { data: collection, error: collectionError } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (collectionError || !collection) throw new Error("Collection not found.");
  }

  const { error } = await supabase
    .from("items")
    .update({ collection_id: collectionId || null })
    .eq("id", itemId)
    .eq("owner_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/" + itemId);
  if (item.collection_id) revalidatePath("/dashboard/collections/" + item.collection_id);
  if (collectionId) revalidatePath("/dashboard/collections/" + collectionId);
}
