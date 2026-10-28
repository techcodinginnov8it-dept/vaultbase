"use client";

import { Mail, Pencil, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import { Button } from "@/components/ui/button";

type ProfileFormProps = {
  email: string;
  initialName: string;
  initialAvatarUrl?: string | null;
  action: (formData: FormData) => Promise<void>;
};

export function ProfileForm({ email, initialName, initialAvatarUrl, action }: ProfileFormProps) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(initialName);
  const [previewUrl, setPreviewUrl] = useState(initialAvatarUrl ?? "");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveAvatar(false);
  }

  return (
    <form action={action} className="mt-7 grid w-full gap-5 lg:grid-cols-2">
      <div className="flex items-center gap-4 border-b pb-5 lg:col-span-2">
        <div className="relative"><span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">{previewUrl && !removeAvatar ? <img src={previewUrl} alt="Profile preview" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}</span><input ref={imageInputRef} name="avatar" type="file" accept="image/*" onChange={handleImageChange} className="sr-only" /><Button type="button" size="icon" aria-label="Edit profile picture" title="Edit profile picture" onClick={() => imageInputRef.current?.click()} className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-2 border-card"><Pencil className="h-3.5 w-3.5" /></Button></div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-xl font-semibold">{name || "No name added"}</h3><Button type="button" variant="ghost" size="icon" aria-label="Edit name" title="Edit name" onClick={() => setEditingName(true)}><Pencil className="h-4 w-4" /></Button></div><p className="mt-1 text-sm text-muted-foreground">Profile image and name</p>{initialAvatarUrl ? <label className="mt-2 flex w-fit items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name="remove_avatar" value="true" checked={removeAvatar} onChange={(event) => setRemoveAvatar(event.target.checked)} /> Remove picture</label> : null}</div>
      </div>
      <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
        <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />Email</span>
        <input value={email} readOnly className="h-11 w-full rounded-xl border bg-muted px-3 text-sm text-muted-foreground" />
      </label>
      {editingName ? <label className="flex min-w-0 flex-col gap-2 text-sm font-medium"><span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground" />Edit name</span><div className="flex gap-2"><input name="display_name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Enter your name" autoComplete="name" autoFocus className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /><Button type="button" variant="outline" size="icon" aria-label="Cancel name edit" onClick={() => { setName(initialName); setEditingName(false); }}><X className="h-4 w-4" /></Button></div></label> : <input type="hidden" name="display_name" value={name} />}
      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <FormSubmitButton pendingLabel="Saving profile...">Save changes</FormSubmitButton>
      </div>
    </form>
  );
}
