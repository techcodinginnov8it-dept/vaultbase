"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const nameValue = formData.get("display_name");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";

  if (name.length > 100) {
    throw new Error("Name must be 100 characters or fewer.");
  }

  const imageValue = formData.get("avatar");
  const removeAvatar = formData.get("remove_avatar") === "true";
  const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  if (image && (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024)) {
    throw new Error("Profile picture must be an image up to 5 MB.");
  }

  const { data: currentProfile } = await supabase.from("profiles").select("avatar_path").eq("id", userId).maybeSingle();
  let avatarPath = currentProfile?.avatar_path ?? null;
  let uploadedPath: string | null = null;
  if (image) {
    const extension = image.type.split("/")[1]?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    uploadedPath = `${userId}/avatar-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("profile-images").upload(uploadedPath, image, { contentType: image.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message || "Unable to upload profile picture.");
    avatarPath = uploadedPath;
  } else if (removeAvatar) {
    avatarPath = null;
  }

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: name || null,
    avatar_path: avatarPath,
  });

  if (error) {
    if (uploadedPath) await supabase.storage.from("profile-images").remove([uploadedPath]);
    throw new Error(error.message);
  }
  if (currentProfile?.avatar_path && currentProfile.avatar_path !== avatarPath) {
    await supabase.storage.from("profile-images").remove([currentProfile.avatar_path]);
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
