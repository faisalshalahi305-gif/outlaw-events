import { gateSession, hashSecret } from "./admin.server";

/**
 * Server-only admin check for the suggestions area. Mirrors the logic used by
 * `requireAdmin` in gate.functions.ts (DB access token first, cookie session
 * as fallback) without going through the RPC stub.
 */
export async function isGateAdmin(
  accessToken: string,
  visitorToken: string,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (accessToken) {
    const { data: row } = await supabaseAdmin
      .from("gate_verifications")
      .select("id, visitor_id, access_expires_at")
      .eq("access_token_hash", hashSecret(accessToken))
      .eq("status", "verified")
      .maybeSingle();

    if (row && row.access_expires_at && new Date(row.access_expires_at) > new Date()) {
      if (visitorToken) {
        const { data: visitor } = await supabaseAdmin
          .from("visitors")
          .select("id")
          .eq("token", visitorToken)
          .maybeSingle();
        if (visitor && visitor.id !== row.visitor_id) return false;
      }
      return true;
    }
  }

  try {
    const session = await gateSession();
    const { verificationId, visitorId, admin } = session.data;
    if (!admin || !verificationId || !visitorId) return false;
    const { data: verification } = await supabaseAdmin
      .from("gate_verifications")
      .select("id")
      .eq("id", verificationId)
      .eq("visitor_id", visitorId)
      .eq("status", "verified")
      .maybeSingle();
    return Boolean(verification);
  } catch {
    return false;
  }
}

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 4 * 1024 * 1024;

export type DecodedImage = { bytes: Uint8Array; contentType: string; ext: string };

/** Decodes a `data:image/...;base64,...` payload with strict validation. */
export function decodeDataUrl(value: string): DecodedImage {
  const match = /^data:([a-z/+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(value.trim());
  if (!match) throw new Error("invalid_image");
  const contentType = match[1]!.toLowerCase();
  if (!ALLOWED.has(contentType)) throw new Error("invalid_image_type");
  const binary = atob(match[2]!);
  if (binary.length > MAX_BYTES) throw new Error("image_too_large");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1]!;
  return { bytes, contentType, ext };
}
