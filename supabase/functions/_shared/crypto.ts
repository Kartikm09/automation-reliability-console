const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", input)));
}

export async function hmacSha256(
  secret: string,
  value: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value),
  );
  return toHex(new Uint8Array(signature));
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.length === 0 || rightBytes.length === 0) {
    return leftBytes.length === rightBytes.length;
  }
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index % leftBytes.length] ?? 0) ^
      (rightBytes[index % rightBytes.length] ?? 0);
  }
  return mismatch === 0;
}

function base64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function generateWebhookCredential(): {
  credential: string;
  prefix: string;
} {
  const prefixBytes = crypto.getRandomValues(new Uint8Array(8));
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const prefix = `wh_${toHex(prefixBytes).slice(0, 10)}`;
  return { credential: `${prefix}.${base64Url(secretBytes)}`, prefix };
}
