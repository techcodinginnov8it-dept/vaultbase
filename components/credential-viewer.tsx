"use client";

import { Check, Copy, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { useState } from "react";

import { updateItemCredentials } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { decryptCredentials, encryptCredentials } from "@/lib/credential-crypto";

type CredentialViewerProps = {
  itemId: string;
  encryptedPayload: string;
  salt: string;
  iv: string;
};

export function CredentialViewer({ itemId, encryptedPayload, salt, iv }: CredentialViewerProps) {
  const [passphrase, setPassphrase] = useState("");
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPassphrase, setEditPassphrase] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUnlocking(true);
    setError(null);
    try {
      const result = await decryptCredentials(encryptedPayload, salt, iv, passphrase);
      setCredentials(result);
      setEditUsername(result.username);
      setEditPassword(result.password);
      setPassphrase("");
    } catch {
      setError("Unable to unlock credentials. Check your vault passphrase.");
    } finally {
      setIsUnlocking(false);
    }
  }

  async function saveCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      if (!editUsername.trim() || !editPassword || !editPassphrase) throw new Error("Username, password, and a new vault passphrase are required.");
      const encrypted = await encryptCredentials(editUsername.trim(), editPassword, editPassphrase);
      const formData = new FormData();
      formData.set("item_id", itemId);
      formData.set("encrypted_payload", encrypted.encryptedPayload);
      formData.set("credential_salt", encrypted.salt);
      formData.set("credential_iv", encrypted.iv);
      await updateItemCredentials(formData);
      setCredentials({ username: editUsername.trim(), password: editPassword });
      setEditPassphrase("");
      setIsEditing(false);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to update credentials.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyPassword() {
    if (!credentials) return;
    await navigator.clipboard.writeText(credentials.password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section id="credentials" className="mt-6 rounded-lg border bg-muted/20 p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4" />
        <h2 className="font-medium">Credentials</h2>
      </div>
      {!credentials ? (
        <form onSubmit={unlock} className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Unlock this credential with your vault passphrase.</p>
          <div className="flex gap-2">
            <input type="password" required value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="Vault passphrase" className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" />
            <Button type="submit" disabled={isUnlocking}><LockKeyhole /> {isUnlocking ? "Unlocking..." : "Unlock"}</Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {!isEditing ? <>
          <div>
            <p className="text-xs text-muted-foreground">Username</p>
            <p className="mt-1 break-all text-sm">{credentials.username}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Password</p>
            <div className="mt-1 flex gap-2">
              <input readOnly type={showPassword ? "text" : "password"} value={credentials.password} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
              <Button type="button" variant="outline" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
              <Button type="button" variant="outline" size="icon" aria-label="Copy password" onClick={copyPassword}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          </div>
          <Button type="button" variant="outline" className="self-start" onClick={() => { setEditUsername(credentials.username); setEditPassword(credentials.password); setIsEditing(true); }}>Edit username/email and password</Button>
          </> : (
            <form onSubmit={saveCredentials} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Your new vault passphrase will encrypt the updated credentials in your browser. It is never sent to the server.</p>
              <label className="flex flex-col gap-2 text-sm font-medium">Username or email<input required value={editUsername} onChange={(event) => setEditUsername(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Password<input required type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium">New vault passphrase<input required type="password" value={editPassphrase} onChange={(event) => setEditPassphrase(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label>
              {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
              <div className="flex flex-wrap gap-2"><Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save credentials"}</Button><Button type="button" variant="outline" onClick={() => { setIsEditing(false); setEditPassphrase(""); }}>Cancel</Button></div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
