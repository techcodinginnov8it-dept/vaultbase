"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createCollection } from "@/app/dashboard/collection-actions";
import { CollectionTypeField } from "@/components/collection-type-field";
import { FormSubmitButton } from "@/components/form-submit-button";

type CollectionFormState = {
  error: string | null;
  collectionId?: string;
};

const initialState: CollectionFormState = { error: null };

export function NewCollectionForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<CollectionFormState, FormData>(
    async (_previousState, formData) => {
      try {
        const collectionId = await createCollection(formData);
        return { error: null, collectionId };
      } catch (caught: unknown) {
        return {
          error: caught instanceof Error ? caught.message : "Unable to create collection.",
        };
      }
    },
    initialState,
  );

  useEffect(() => {
    if (state.collectionId) router.push("/dashboard/collections/" + state.collectionId);
  }, [router, state.collectionId]);

  return (
    <form action={formAction} className="mt-5 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Collection name
        <input name="name" required maxLength={100} placeholder="Collection name" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" />
      </label>
      <CollectionTypeField />
      <label className="flex flex-col gap-2 text-sm font-medium">
        Description
        <textarea name="description" maxLength={500} rows={4} placeholder="Optional description" className="rounded-md border bg-background px-3 py-2 text-sm font-normal" />
      </label>
      {state.error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
      <FormSubmitButton pendingLabel="Creating collection..." disabled={isPending} className="h-10 w-full">Create collection</FormSubmitButton>
    </form>
  );
}
