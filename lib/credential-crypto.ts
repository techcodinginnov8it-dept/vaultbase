const PBKDF2_ITERATIONS = 310_000;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptCredentials(
  username: string,
  password: string,
  passphrase: string,
) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const payload = new TextEncoder().encode(JSON.stringify({ username, password }));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, payload);

  return {
    encryptedPayload: toBase64(new Uint8Array(encrypted)),
    salt: toBase64(salt),
    iv: toBase64(iv),
  };
}

export async function decryptCredentials(
  encryptedPayload: string,
  saltValue: string,
  ivValue: string,
  passphrase: string,
) {
  const salt = fromBase64(saltValue);
  const iv = fromBase64(ivValue);
  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, fromBase64(encryptedPayload));
  return JSON.parse(new TextDecoder().decode(decrypted)) as { username: string; password: string };
}
