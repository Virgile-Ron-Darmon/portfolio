import crypto from "node:crypto";

/** Verifies GitHub's X-Hub-Signature-256 header with a constant-time comparison. */
export function verifySignature(body: string, header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(
    "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex"),
    "utf8",
  );
  const received = Buffer.from(header, "utf8");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
