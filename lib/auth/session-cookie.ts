const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padding);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSessionCookieValue(
  sessionId: string,
  secret: string,
): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(sessionId),
  );
  return `${sessionId}.${bufferToBase64Url(signature)}`;
}

export async function parseSessionCookieValue(
  value: string,
  secret: string,
): Promise<string | null> {
  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex <= 0) {
    return null;
  }

  const sessionId = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);

  if (!UUID_PATTERN.test(sessionId) || signature.length === 0) {
    return null;
  }

  const key = await importHmacKey(secret);
  let signatureBuffer: ArrayBuffer;
  try {
    signatureBuffer = base64UrlToBuffer(signature);
  } catch {
    return null;
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBuffer,
    new TextEncoder().encode(sessionId),
  );

  return valid ? sessionId : null;
}

export function looksLikeSignedSessionCookie(value: string): boolean {
  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex <= 0) {
    return false;
  }

  return UUID_PATTERN.test(value.slice(0, separatorIndex));
}
