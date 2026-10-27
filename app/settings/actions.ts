"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const displayNameValue = formData.get("display_name");
  const displayName = typeof displayNameValue === "string" ? displayNameValue.trim() : "";

  if (displayName.length > 100) {
    throw new Error("Display name must be 100 characters or fewer.");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: displayName || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
