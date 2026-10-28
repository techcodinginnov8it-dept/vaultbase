"use client";

import { Eye, EyeOff, FilePlus2, FolderPlus, Link2, Paperclip, Plus, ShieldCheck, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createItem, registerAttachments, removeItemAfterAttachmentFailure } from "@/app/dashboard/actions";
import { createCollection } from "@/app/dashboard/collection-actions";
import { AttachmentPicker } from "@/components/attachment-picker";
import { Button } from "@/components/ui/button";
import { DynamicFieldsEditor } from "@/components/dynamic-fields-editor";
import { ItemTypeSelect } from "@/components/item-type-select";
import { RepeatableLinksEditor } from "@/components/repeatable-links-editor";
import { createClient } from "@/lib/supabase/client";
import { encryptCredentials } from "@/lib/credential-crypto";
import { uploadAttachments } from "@/lib/client-attachments";

type Collection = { id: string; name: string };
type CreateItemState = { error: string | null; itemId: string | null };

type NewItemDialogProps = {
  defaultCollectionId?: string;
  buttonLabel?: string;
};

export function NewItemDialog({ defaultCollectionId, buttonLabel = "New item" }: NewItemDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionLoadError, setCollectionLoadError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [itemType, setItemType] = useState("contact");
  const [selectedCollectionId, setSelectedCollectionId] = useState(defaultCollectionId ?? "");
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [newCollectionType, setNewCollectionType] = useState("general");
  const [newCustomType, setNewCustomType] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const itemFormRef = useRef<HTMLFormElement>(null);
  const failedDraftRef = useRef<Record<string, string[]> | null>(null);
  const navigatedItemId = useRef<string | null>(null);
  const [state, formAction, isPending] = useActionState<CreateItemState, FormData>(async (_previous, formData) => {
    try {
      const itemId = await submitItem(formData);
      return { error: null, itemId };
    } catch (caught: unknown) {
      return { error: caught instanceof Error ? caught.message : "Unable to create item.", itemId: null };
    }
  }, { error: null, itemId: null });

  useEffect(() => {
    if (!open) return;
    const loadCollections = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("collections").select("id, name").order("name");
      setCollections(data ?? []);
      setCollectionLoadError(error ? "Collections could not be loaded. You can still save this item without a collection." : null);
    };
    void loadCollections();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function submitItem(formData: FormData) {
    const username = String(formData.get("credential_username") ?? "").trim();
    const password = String(formData.get("credential_password") ?? "");
    const passphrase = String(formData.get("vault_passphrase") ?? "");

    if (password) {
      if (!username || !passphrase) {
        throw new Error("Username and vault passphrase are required when saving a password.");
      }
      const encrypted = await encryptCredentials(username, password, passphrase);
      formData.set("encrypted_payload", encrypted.encryptedPayload);
      formData.set("credential_salt", encrypted.salt);
      formData.set("credential_iv", encrypted.iv);
    }
    formData.delete("vault_passphrase");
    formData.delete("attachments");
    const itemId = await createItem(formData);
    if (!selectedFiles.length) return itemId;

    try {
      const uploaded = await uploadAttachments(itemId, selectedFiles, (completed, total, fileName) => {
        setUploadStatus(`Uploading ${completed} of ${total}: ${fileName}`);
      });
      const attachmentForm = new FormData();
      attachmentForm.set("item_id", itemId);
      attachmentForm.set("attachments_json", JSON.stringify(uploaded));
      await registerAttachments(attachmentForm);
      setUploadStatus(null);
      return itemId;
    } catch (caught: unknown) {
      setUploadStatus(null);
      const rollbackForm = new FormData();
      rollbackForm.set("item_id", itemId);
      await removeItemAfterAttachmentFailure(rollbackForm);
      throw caught;
    }
  }

  async function submitCollection() {
    setIsCreatingCollection(true);
    setCollectionError(null);
    try {
      const formData = new FormData();
      formData.set("name", newCollectionName);
      formData.set("description", newCollectionDescription);
      formData.set("collection_type", newCollectionType);
      formData.set("custom_collection_type", newCustomType);
      const collectionId = await createCollection(formData);
      const createdCollectionName = newCollectionName.trim();
      setCollections((current) => [...current, { id: collectionId, name: createdCollectionName }].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCollectionId(collectionId);
      setNewCollectionName("");
      setNewCollectionDescription("");
      setNewCustomType("");
      setNewCollectionType("general");
      setShowCreateCollection(false);
    } catch (caught: unknown) {
      setCollectionError(caught instanceof Error ? caught.message : "Unable to create collection.");
    } finally {
      setIsCreatingCollection(false);
    }
  }

  useEffect(() => {
    if (!state.error || !failedDraftRef.current || !itemFormRef.current) return;
    const draft = failedDraftRef.current;
    for (const [name, values] of Object.entries(draft)) {
      const controls = Array.from(itemFormRef.current.elements).filter((element) => element instanceof HTMLElement && element.getAttribute("name") === name);
      controls.forEach((element, index) => {
        const control = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
          control.checked = values.includes(control.value);
        } else if (control instanceof HTMLSelectElement && control.multiple) {
          Array.from(control.options).forEach((option) => { option.selected = values.includes(option.value); });
        } else if (values[index] !== undefined) {
          control.value = values[index];
        }
      });
    }
  }, [state.error]);

  useEffect(() => {
    if (!state.itemId || navigatedItemId.current === state.itemId) return;
    navigatedItemId.current = state.itemId;
    setOpen(false);
    router.push("/dashboard/" + state.itemId);
  }, [router, state.itemId]);

  function captureDraft(event: FormEvent<HTMLFormElement>) {
    const draft: Record<string, string[]> = {};
    new FormData(event.currentTarget).forEach((value, name) => {
      if (typeof value !== "string" || name === "dynamic_fields") return;
      (draft[name] ??= []).push(value);
    });
    failedDraftRef.current = draft;
  }

  return (
    <>
      <Button className="w-auto shrink-0 justify-center gap-2 px-4 shadow-sm" onClick={() => setOpen(true)}>
        <Plus /> {buttonLabel}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close new item dialog" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="new-item-title" aria-describedby="new-item-description" className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:max-h-[calc(100vh-4rem)]">
            <Button ref={closeButtonRef} variant="ghost" size="icon" aria-label="Close" className="absolute right-3 top-3" onClick={() => setOpen(false)}>
              <X />
            </Button>
            <div className="shrink-0 border-b bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 pr-16 sm:p-7 sm:pr-16">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><FilePlus2 className="h-5 w-5" /></div>
                <div>
                  <h2 id="new-item-title" className="text-xl font-semibold tracking-tight">Create new item</h2>
                  <p id="new-item-description" className="mt-1 text-sm text-muted-foreground">Save a contact, account, project, bookmark, or note.</p>
                </div>
              </div>
            </div>
            <form ref={itemFormRef} action={formAction} onSubmit={captureDraft} className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-8 p-5 sm:p-7">
                <section className="space-y-5">
                  <div className="border-b pb-3 text-left"><h3 className="text-base font-semibold tracking-tight">Basic information</h3><p className="mt-1 text-sm text-muted-foreground">Give this item a clear name and type.</p></div>
                  <label className="grid gap-2 text-left text-sm font-medium"><span>Title <span className="text-destructive" aria-hidden="true">*</span></span><input name="title" required maxLength={200} placeholder="e.g. Company Gmail account" className="h-11 rounded-lg border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
                  <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
                    <label className="grid gap-2 text-left text-sm font-medium"><span>Item type</span><span className="-mt-1 text-left text-xs font-normal text-muted-foreground">Choose a template for the fields below.</span><ItemTypeSelect name="item_type" value={itemType} onChange={setItemType} /></label>
                    {itemType === "custom" ? <label className="grid gap-2 text-sm font-medium"><span>Custom item type <span className="text-destructive" aria-hidden="true">*</span></span><span className="-mt-1 text-xs font-normal text-muted-foreground">Use a name such as API credential or vendor.</span><input name="custom_item_type" required maxLength={100} placeholder="Enter a custom type" className="h-11 rounded-lg border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label> : <div className="hidden sm:block" aria-hidden="true" />}
                  </div>
                  <DynamicFieldsEditor itemType={itemType} />
                </section>

                <section className="space-y-5 border-t pt-7">
                  <div className="flex items-start gap-3 text-left"><FolderPlus className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h3 className="text-base font-semibold tracking-tight">Organization</h3><p className="mt-1 text-sm text-muted-foreground">Choose where this item should live.</p></div></div>
                  <label className="grid gap-2 text-left text-sm font-medium"><span>Collection</span><select name="collection_id" value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)} className="h-11 rounded-lg border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="">No collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
                  {collectionLoadError ? <p role="alert" className="text-xs text-destructive">{collectionLoadError}</p> : null}
                  {!defaultCollectionId ? (
                    showCreateCollection ? (
                      <div className="space-y-4 rounded-xl border bg-muted/30 p-4 sm:p-5">
                        <div>
                          <p className="text-sm font-semibold">New collection</p>
                          <p className="mt-1 text-sm text-muted-foreground">Create a collection and automatically use it for this item.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="grid gap-2 text-sm font-medium">Collection name<input value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} maxLength={100} placeholder="e.g. Work accounts" className="h-10 rounded-lg border bg-background px-3 text-sm font-normal" /></label>
                          <label className="grid gap-2 text-sm font-medium">Collection type<select value={newCollectionType} onChange={(event) => setNewCollectionType(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal"><option value="general">General</option><option value="work">Work</option><option value="personal">Personal</option><option value="finance">Finance</option><option value="projects">Projects</option><option value="bookmarks">Bookmarks</option><option value="other">Other</option></select></label>
                        </div>
                        <label className="grid gap-2 text-sm font-medium">Description<span className="text-xs font-normal text-muted-foreground">Optional</span><textarea value={newCollectionDescription} onChange={(event) => setNewCollectionDescription(event.target.value)} maxLength={500} rows={2} placeholder="What belongs in this collection?" className="rounded-lg border bg-background px-3 py-2 text-sm font-normal" /></label>
                        {newCollectionType === "other" ? <label className="grid gap-2 text-sm font-medium">Custom type<input value={newCustomType} onChange={(event) => setNewCustomType(event.target.value)} maxLength={50} placeholder="Enter a custom collection type" className="h-10 rounded-lg border bg-background px-3 text-sm font-normal" /></label> : null}
                        {collectionError ? <p role="alert" className="text-sm text-destructive">{collectionError}</p> : null}
                        <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end"><Button type="button" size="sm" disabled={isCreatingCollection || !newCollectionName.trim()} onClick={submitCollection}>{isCreatingCollection ? "Creating..." : "Create and select"}</Button><Button type="button" size="sm" variant="outline" onClick={() => { setShowCreateCollection(false); setCollectionError(null); }}>Cancel</Button></div>
                      </div>
                    ) : (
                      <Button type="button" variant="ghost" className="w-fit px-0 text-primary hover:bg-transparent hover:underline" onClick={() => setShowCreateCollection(true)}><Plus className="h-4 w-4" /> Create new collection</Button>
                    )
                  ) : null}
                </section>

                <section className="space-y-5 border-t pt-7">
                  <div className="flex items-start gap-3 text-left"><Link2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h3 className="text-base font-semibold tracking-tight">Details</h3><p className="mt-1 text-sm text-muted-foreground">Add notes, links, and tags to make this item easy to find.</p></div></div>
                  <label className="grid gap-2 text-left text-sm font-medium"><span>Description or notes</span><textarea name="description" placeholder="Add useful context, reminders, or details..." rows={4} className="rounded-lg border bg-background px-3 py-2 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
                  <RepeatableLinksEditor />
                  <label className="grid gap-2 text-left text-sm font-medium"><span>Tags</span><span className="-mt-1 text-left text-xs font-normal text-muted-foreground">Separate multiple tags with commas.</span><input name="tags" placeholder="work, important, finance" className="h-11 rounded-lg border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
                </section>

                <section className="space-y-5 border-t pt-7">
                  <div className="flex items-start gap-3 text-left"><Paperclip className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h3 className="text-base font-semibold tracking-tight">Attachments</h3><p className="mt-1 text-sm text-muted-foreground">Keep related files together with this item.</p></div></div>
                  <AttachmentPicker isPending={isPending} onFilesChange={setSelectedFiles} />
                </section>

                <section className="space-y-5 rounded-xl border bg-muted/30 p-4 sm:p-5">
                  <div className="flex items-start gap-3 text-left"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><h3 className="text-base font-semibold tracking-tight">Secure credentials <span className="font-normal text-muted-foreground">(optional)</span></h3><p className="mt-1 text-sm leading-5 text-muted-foreground">Save one username/email and password for this item. Your password is encrypted in your browser, and the vault passphrase is never sent to the server.</p><p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">Need another account? Create another item in the same collection.</p></div></div>
                  <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-left text-sm font-medium"><span>Username or email</span><input name="credential_username" placeholder="name@example.com" className="h-11 rounded-lg border bg-background px-3 text-sm font-normal" /></label><label className="grid gap-2 text-left text-sm font-medium"><span>Password</span><div className="relative"><input name="credential_password" type={showPassword ? "text" : "password"} placeholder="Enter password" className="h-11 w-full rounded-lg border bg-background px-3 pr-10 text-sm font-normal" /><Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-1 text-muted-foreground" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></label></div>
                  <label className="grid gap-2 text-left text-sm font-medium"><span>Vault passphrase</span><span className="-mt-1 text-left text-xs font-normal text-muted-foreground">Required only when a password is provided.</span><div className="relative"><input name="vault_passphrase" type={showPassphrase ? "text" : "password"} placeholder="Create or enter your vault passphrase" className="h-11 w-full rounded-lg border bg-background px-3 pr-10 text-sm font-normal" /><Button type="button" variant="ghost" size="icon" aria-label={showPassphrase ? "Hide vault passphrase" : "Show vault passphrase"} className="absolute right-0 top-1 text-muted-foreground" onClick={() => setShowPassphrase((visible) => !visible)}>{showPassphrase ? <EyeOff /> : <Eye />}</Button></div></label>
                </section>

                {uploadStatus ? <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{uploadStatus}</p> : null}
                {state.error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-card/95 px-5 py-4 backdrop-blur sm:px-7"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={isPending}>{isPending ? "Saving item..." : "Create item"}</Button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
