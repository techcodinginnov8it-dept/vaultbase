import { createClient } from "@/lib/supabase/client";

export type UploadedAttachment = {
  id: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "file";
}

export async function uploadAttachments(
  itemId: string,
  files: File[],
  onProgress?: (completed: number, total: number, fileName: string) => void,
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to upload attachments.");
  const uploaded: UploadedAttachment[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const id = crypto.randomUUID();
    const storagePath = `${user.id}/${itemId}/${id}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("item-attachments").upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      if (uploaded.length) await supabase.storage.from("item-attachments").remove(uploaded.map((attachment) => attachment.storagePath));
      throw new Error(error.message || `Unable to upload ${file.name}.`);
    }
    uploaded.push({ id, storagePath, originalName: file.name, mimeType: file.type, sizeBytes: file.size });
    onProgress?.(index + 1, files.length, file.name);
  }

  return uploaded;
}
