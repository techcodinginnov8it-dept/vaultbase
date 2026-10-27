"use client";

import { Trash2 } from "lucide-react";

import { deleteAttachment } from "@/app/dashboard/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export function DeleteAttachmentButton({ attachmentId }: { attachmentId: string }) {
  return (
    <form action={deleteAttachment} onSubmit={(event) => {
      if (!window.confirm("Delete this attachment?")) event.preventDefault();
    }}>
      <input type="hidden" name="attachment_id" value={attachmentId} />
      <FormSubmitButton pendingLabel="Deleting..." variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</FormSubmitButton>
    </form>
  );
}
