import { assert, assertEquals, assertNotEquals } from "@std/assert";
import {
  constantTimeEqual,
  generateWebhookCredential,
  hmacSha256,
  sha256,
} from "./crypto.ts";

Deno.test("sha256 and hmac are deterministic", async () => {
  assertEquals(
    await sha256("synthetic"),
    "b3cc0475bb78a5026098858e9889acf666d31062d513d303314eca31d36e72f2",
  );
  assertEquals(
    await hmacSha256("key", "message"),
    await hmacSha256("key", "message"),
  );
  assertNotEquals(
    await hmacSha256("key", "message"),
    await hmacSha256("other", "message"),
  );
});

Deno.test("constant-time comparison returns the correct result", () => {
  assert(constantTimeEqual("abc123", "abc123"));
  assert(!constantTimeEqual("abc123", "abc124"));
  assert(!constantTimeEqual("short", "much-longer"));
  assert(constantTimeEqual("", ""));
  assert(!constantTimeEqual("", "non-empty"));
});

Deno.test("generated webhook credentials have a non-recoverable prefix", () => {
  const first = generateWebhookCredential();
  const second = generateWebhookCredential();
  assert(/^wh_[a-f0-9]{10}$/.test(first.prefix));
  assert(first.credential.startsWith(`${first.prefix}.`));
  assertNotEquals(first.credential, second.credential);
});
