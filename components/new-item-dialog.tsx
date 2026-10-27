"use client";

import { Eye, EyeOff, Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createItem } from "@/app/dashboard/actions";
import { createCollection } from "@/app/dashboard/collection-actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { encryptCredentials } from "@/lib/credential-crypto";

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
  const [showPassword, setShowPassword] = useState(false);
  const [itemType, setItemType] = useState("custom");
  const [selectedCollectionId, setSelectedCollectionId] = useState(defaultCollectionId ?? "");
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [newCollectionType, setNewCollectionType] = useState("general");
  const [newCustomType, setNewCustomType] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
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
      const { data } = await supabase.from("collections").select("id, name").order("name");
      setCollections(data ?? []);
    };
    void loadCollections();
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
    return createItem(formData);
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
    if (state.itemId) router.push("/dashboard/" + state.itemId);
  }, [router, state.itemId]);

  return (
    <>
      <Button className="w-auto shrink-0 justify-center gap-2 px-4 shadow-sm" onClick={() => setOpen(true)}>
        <Plus /> {buttonLabel}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close new item dialog" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="new-item-title" className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:max-h-[calc(100vh-4rem)]">
            <Button variant="ghost" size="icon" aria-label="Close" className="absolute right-3 top-3" onClick={() => setOpen(false)}>
              <X />
            </Button>
            <div className="shrink-0 border-b p-5 pr-16 sm:p-6 sm:pr-16">
              <h2 id="new-item-title" className="text-xl font-semibold">Create new item</h2>
              <p className="mt-1 text-sm text-muted-foreground">Save a contact, account, project, bookmark, or note.</p>
            </div>
            <form action={formAction} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-col gap-4">
              <input name="title" required maxLength={200} placeholder="Title" className="h-10 rounded-md border bg-background px-3 text-sm" />
              <select name="item_type" value={itemType} onChange={(event) => setItemType(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="custom">Custom</option>
                <option value="contact">Contact</option>
                <option value="account">Account</option>
                <option value="project">Project</option>
                <option value="bookmark">Bookmark</option>
              </select>
              {itemType === "custom" ? <input name="custom_item_type" required maxLength={100} placeholder="Custom item type (e.g. API credential)" className="h-10 rounded-md border bg-background px-3 text-sm" /> : null}
              <label className="flex flex-col gap-2 text-sm font-medium">
                Add to collection
                <select name="collection_id" value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-normal">
                  <option value="">No collection</option>
                  {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                </select>
                {!defaultCollectionId ? <>
                  {!showCreateCollection ? <Button type="button" variant="ghost" className="w-fit px-0 text-primary hover:bg-transparent hover:underline" onClick={() => setShowCreateCollection(true)}>+ Create new collection</Button> : (
                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm font-medium">New collection</p>
                      <input value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} maxLength={100} placeholder="Collection name" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" />
                      <textarea value={newCollectionDescription} onChange={(event) => setNewCollectionDescription(event.target.value)} maxLength={500} rows={3} placeholder="Description (optional)" className="rounded-md border bg-background px-3 py-2 text-sm font-normal" />
                      <select value={newCollectionType} onChange={(event) => setNewCollectionType(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-normal">
                        <option value="general">General</option><option value="work">Work</option><option value="personal">Personal</option><option value="finance">Finance</option><option value="projects">Projects</option><option value="bookmarks">Bookmarks</option><option value="other">Other</option>
                      </select>
                      {newCollectionType === "other" ? <input value={newCustomType} onChange={(event) => setNewCustomType(event.target.value)} maxLength={50} placeholder="Custom collection type" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /> : null}
                      {collectionError ? <p role="alert" className="text-sm text-destructive">{collectionError}</p> : null}
                      <div className="flex gap-2"><Button type="button" size="sm" disabled={isCreatingCollection || !newCollectionName.trim()} onClick={submitCollection}>{isCreatingCollection ? "Creating..." : "Create and select"}</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setShowCreateCollection(false); setCollectionError(null); }}>Cancel</Button></div>
                    </div>
                  )}
                </> : null}
              </label>
              <textarea name="description" placeholder="Description or notes" rows={4} className="rounded-md border bg-background px-3 py-2 text-sm" />
              <textarea name="urls" rows={3} placeholder="Links (one URL per line)" className="rounded-md border bg-background px-3 py-2 text-sm" />
              <input name="tags" placeholder="Tags, separated by commas" className="h-10 rounded-md border bg-background px-3 text-sm" />
              <label className="flex flex-col gap-2 text-sm font-medium">
                Attach files
                <input name="attachments" type="file" multiple accept="image/*,video/*,application/pdf,text/plain,text/csv" className="h-auto rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm" />
                <span className="text-xs font-normal text-muted-foreground">Images up to 10 MB, videos up to 100 MB, and documents up to 25 MB.</span>
              </label>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="font-medium">Credentials (optional)</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Your password is encrypted in your browser. The vault passphrase is never sent to the server.</p>
                <div className="mt-4 flex flex-col gap-4">
                  <input name="credential_username" placeholder="Username or email" className="h-10 rounded-md border bg-background px-3 text-sm" />
                  <div className="relative">
                    <input name="credential_password" type={showPassword ? "text" : "password"} placeholder="Password" className="h-10 w-full rounded-md border bg-background px-3 pr-10 text-sm" />
                    <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-0 text-muted-foreground" onClick={() => setShowPassword((visible) => !visible)}>
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                  <input name="vault_passphrase" type="password" placeholder="Vault passphrase (required for password)" className="h-10 rounded-md border bg-background px-3 text-sm" />
                </div>
              </div>
              {state.error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Creating item..." : "Create item"}</Button>
              </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
