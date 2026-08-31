import { createServerFn } from "@tanstack/react-start";

import { gateSession, hashSecret, hashesMatch } from "./admin.server";

const ACCESS_TTL_MS = 1000 * 60 * 60 * 12;

function sanitizeToken(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

/**
 * Every visitor gets a stable, unique identity that lives in the database
 * (token + number + label). The token is kept client-side in localStorage so
 * the identity survives private windows, iframes and blocked cookies.
 */
export const ensureVisitor = createServerFn({ method: "POST" })
  .inputValidator((data: { token?: string | null }) => ({
    token: sanitizeToken(data?.token),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.token) {
      const { data: existing } = await supabaseAdmin
        .from("visitors")
        .select("token, number, label")
        .eq("token", data.token)
        .maybeSingle();
      if (existing) {
        return {
          token: existing.token,
          number: Number(existing.number),
          label: existing.label ?? `OUTLAW-VISITOR-${Number(existing.number)}`,
        };
      }
    }

    const token = crypto.randomUUID();
    const { data: created, error } = await supabaseAdmin
      .from("visitors")
      .insert({ token })
      .select("id, token, number")
      .single();
    if (error || !created) throw new Error("visitor_failed");

    const label = `OUTLAW-VISITOR-${Number(created.number)}`;
    await supabaseAdmin.from("visitors").update({ label }).eq("id", created.id);

    return { token: created.token, number: Number(created.number), label };
  });

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await gateSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("admin_credential")
    .select("id", { count: "exact", head: true });
  return { admin: Boolean(session.data.admin), initialized: (count ?? 0) > 0 };
});

export const beginGateVerification = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => ({ token: sanitizeToken(data?.token) }))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("visitor_not_found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const session = await gateSession();
    const { data: visitor } = await supabaseAdmin
      .from("visitors")
      .select("id, number, label")
      .eq("token", data.token)
      .maybeSingle();

    if (!visitor) throw new Error("visitor_not_found");

    const binding = crypto.randomUUID();
    const { data: verification, error } = await supabaseAdmin
      .from("gate_verifications")
      .insert({
        visitor_id: visitor.id,
        visitor_number: visitor.number,
        session_binding_hash: hashSecret(binding),
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !verification) throw new Error("verification_start_failed");

    // Cookie session is a convenience layer only; the source of truth is the DB.
    try {
      await session.update({
        admin: false,
        binding,
        verificationId: verification.id,
        visitorId: visitor.id,
        visitorNumber: Number(visitor.number),
      });
    } catch {
      /* cookies may be blocked — ignore */
    }

    const { count } = await supabaseAdmin
      .from("admin_credential")
      .select("id", { count: "exact", head: true });

    return {
      verificationId: verification.id,
      visitorNumber: Number(visitor.number),
      label: visitor.label ?? `OUTLAW-VISITOR-${Number(visitor.number)}`,
      initialized: (count ?? 0) > 0,
    };
  });

export const verifyGate = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; imageHash: string; visitorToken: string }) => {
    const code = String(data?.code ?? "").trim();
    const imageHash = String(data?.imageHash ?? "").toLowerCase();
    const visitorToken = sanitizeToken(data?.visitorToken);
    if (!code || code.length > 200 || !/^[0-9a-f]{64}$/.test(imageHash) || !visitorToken) {
      throw new Error("invalid_input");
    }
    return { code, imageHash, visitorToken };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const session = await gateSession();

    const { data: visitor } = await supabaseAdmin
      .from("visitors")
      .select("id, number, label")
      .eq("token", data.visitorToken)
      .maybeSingle();
    if (!visitor) return { ok: false as const };

    // Pick the latest pending attempt for this visitor (cookie-independent).
    const { data: verification } = await supabaseAdmin
      .from("gate_verifications")
      .select("id")
      .eq("visitor_id", visitor.id)
      .eq("status", "pending")
      .order("entered_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!verification) return { ok: false as const };

    const codeHash = hashSecret(data.code);
    const imageHash = hashSecret(data.imageHash);
    const now = new Date();

    const fail = async () => {
      await supabaseAdmin
        .from("gate_verifications")
        .update({ status: "failed", attempted_at: now.toISOString() })
        .eq("id", verification.id);
      return { ok: false as const };
    };

    const succeed = async (created: boolean) => {
      const accessToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
      const expiresAt = new Date(now.getTime() + ACCESS_TTL_MS);
      const { error } = await supabaseAdmin
        .from("gate_verifications")
        .update({
          status: "verified",
          attempted_at: now.toISOString(),
          verified_at: now.toISOString(),
          last_seen_at: now.toISOString(),
          access_token_hash: hashSecret(accessToken),
          access_expires_at: expiresAt.toISOString(),
        })
        .eq("id", verification.id);
      if (error) return { ok: false as const };

      try {
        await session.update({
          ...session.data,
          admin: true,
          at: now.getTime(),
          verificationId: verification.id,
          visitorId: visitor.id,
          visitorNumber: Number(visitor.number),
        });
      } catch {
        /* cookies may be blocked — access token still works */
      }

      return {
        ok: true as const,
        created,
        accessToken,
        verificationId: verification.id,
        label: visitor.label ?? `OUTLAW-VISITOR-${Number(visitor.number)}`,
        expiresAt: expiresAt.toISOString(),
      };
    };

    const { data: cred } = await supabaseAdmin
      .from("admin_credential")
      .select("code_hash, image_hash")
      .eq("id", true)
      .maybeSingle();

    if (!cred) {
      // First ever code + image become the one and only official credentials.
      const { error } = await supabaseAdmin
        .from("admin_credential")
        .insert({ id: true, code_hash: codeHash, image_hash: imageHash });
      if (error) {
        const { data: again } = await supabaseAdmin
          .from("admin_credential")
          .select("code_hash, image_hash")
          .eq("id", true)
          .maybeSingle();
        if (
          !again ||
          !hashesMatch(again.code_hash, codeHash) ||
          !hashesMatch(again.image_hash, imageHash)
        ) {
          return fail();
        }
        return succeed(false);
      }
      return succeed(true);
    }

    if (!hashesMatch(cred.code_hash, codeHash) || !hashesMatch(cred.image_hash, imageHash)) {
      return fail();
    }

    return succeed(false);
  });

export const lockGate = createServerFn({ method: "POST" })
  .inputValidator((data?: { accessToken?: string | null }) => ({
    accessToken: sanitizeToken(data?.accessToken),
  }))
  .handler(async ({ data }) => {
    const session = await gateSession();
    if (data.accessToken) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("gate_verifications")
        .update({ status: "revoked", access_token_hash: null, access_expires_at: null })
        .eq("access_token_hash", hashSecret(data.accessToken));
    }
    try {
      await session.clear();
    } catch {
      /* ignore */
    }
    return { ok: true as const };
  });

/**
 * Authoritative access check. Primary path: the DB-stored access token that
 * was handed to the visitor when they verified. Cookie session is a fallback.
 */
export const requireAdmin = createServerFn({ method: "POST" })
  .inputValidator((data?: { accessToken?: string | null; visitorToken?: string | null }) => ({
    accessToken: sanitizeToken(data?.accessToken),
    visitorToken: sanitizeToken(data?.visitorToken),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.accessToken) {
      const { data: row } = await supabaseAdmin
        .from("gate_verifications")
        .select("id, visitor_id, visitor_number, access_expires_at, status")
        .eq("access_token_hash", hashSecret(data.accessToken))
        .eq("status", "verified")
        .maybeSingle();

      if (row && row.access_expires_at && new Date(row.access_expires_at) > new Date()) {
        if (data.visitorToken) {
          const { data: visitor } = await supabaseAdmin
            .from("visitors")
            .select("id")
            .eq("token", data.visitorToken)
            .maybeSingle();
          if (!visitor || visitor.id !== row.visitor_id) return { admin: false };
        }
        await supabaseAdmin
          .from("gate_verifications")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", row.id);
        return { admin: true, visitorNumber: Number(row.visitor_number) };
      }
    }

    const session = await gateSession();
    const verificationId = session.data.verificationId;
    const binding = session.data.binding;
    const visitorId = session.data.visitorId;
    if (!session.data.admin || !verificationId || !binding || !visitorId) {
      return { admin: false };
    }

    const { data: verification } = await supabaseAdmin
      .from("gate_verifications")
      .select("id, visitor_number")
      .eq("id", verificationId)
      .eq("visitor_id", visitorId)
      .eq("status", "verified")
      .maybeSingle();

    return verification
      ? { admin: true, visitorNumber: Number(verification.visitor_number) }
      : { admin: false };
  });
