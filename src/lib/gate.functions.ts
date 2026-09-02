import { createServerFn } from "@tanstack/react-start";

import { gateSession, hashSecret } from "./admin.server";

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
    const { createGateDatabaseClient } = await import("./admin-db.server");
    const db = createGateDatabaseClient();
    const { data: rows, error } = await db.rpc(
      "gate_ensure_visitor",
      data.token ? { p_token: data.token } : {},
    );
    const visitor = rows?.[0];
    if (error || !visitor) {
      console.error("[Secret Gate] Visitor creation failed", {
        code: error?.code,
        message: error?.message,
      });
      throw new Error("visitor_failed");
    }
    return { token: visitor.token, number: Number(visitor.number), label: visitor.label };
  });

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await gateSession();
  const { createGateDatabaseClient } = await import("./admin-db.server");
  const db = createGateDatabaseClient();
  const { data: initialized, error } = await db.rpc("gate_admin_status");
  if (error) throw new Error("gate_status_failed");
  return { admin: Boolean(session.data.admin), initialized: Boolean(initialized) };
});

export const beginGateVerification = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => ({ token: sanitizeToken(data?.token) }))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("visitor_not_found");
    const { createGateDatabaseClient } = await import("./admin-db.server");
    const db = createGateDatabaseClient();
    const session = await gateSession();
    const binding = crypto.randomUUID();
    const bindingHash = hashSecret(binding);
    const { data: rows, error } = await db.rpc("gate_begin_verification", {
      p_token: data.token,
      p_binding_hash: bindingHash,
    });
    const verification = rows?.[0];
    if (error || !verification) {
      console.error("[Secret Gate] Verification creation failed", {
        code: error?.code,
        message: error?.message,
      });
      throw new Error("verification_start_failed");
    }

    // Cookie session is a convenience layer only; the source of truth is the DB.
    try {
      await session.update({
        admin: false,
        binding,
        verificationId: verification.verification_id,
        visitorId: verification.visitor_id,
        visitorNumber: Number(verification.visitor_number),
      });
    } catch {
      /* cookies may be blocked — ignore */
    }

    return {
      verificationId: verification.verification_id,
      visitorNumber: Number(verification.visitor_number),
      label: verification.visitor_label,
      initialized: verification.initialized,
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
    const { createGateDatabaseClient } = await import("./admin-db.server");
    const db = createGateDatabaseClient();
    const session = await gateSession();
    const codeHash = hashSecret(data.code);
    const imageHash = hashSecret(data.imageHash);
    const now = new Date();
    const accessToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
    const expiresAt = new Date(now.getTime() + ACCESS_TTL_MS);
    const { data: rows, error } = await db.rpc("gate_verify", {
      p_visitor_token: data.visitorToken,
      p_code_hash: codeHash,
      p_image_hash: imageHash,
      p_access_token_hash: hashSecret(accessToken),
      p_access_expires_at: expiresAt.toISOString(),
    });
    const result = rows?.[0];
    if (error || !result?.ok) return { ok: false as const };
      try {
        await session.update({
          ...session.data,
          admin: true,
          at: now.getTime(),
          verificationId: result.verification_id,
          visitorNumber: Number(result.visitor_number),
        });
      } catch {
        /* cookies may be blocked — access token still works */
      }

      return {
        ok: true as const,
        created: result.created,
        accessToken,
        verificationId: result.verification_id,
        label: result.visitor_label,
        expiresAt: expiresAt.toISOString(),
      };
  });

export const lockGate = createServerFn({ method: "POST" })
  .inputValidator((data?: { accessToken?: string | null }) => ({
    accessToken: sanitizeToken(data?.accessToken),
  }))
  .handler(async ({ data }) => {
    const session = await gateSession();
    if (data.accessToken) {
      const { createGateDatabaseClient } = await import("./admin-db.server");
      const db = createGateDatabaseClient();
      await db.rpc("gate_revoke", { p_access_token_hash: hashSecret(data.accessToken) });
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
    const { createGateDatabaseClient } = await import("./admin-db.server");
    const db = createGateDatabaseClient();

    if (data.accessToken) {
      const { data: rows } = await db.rpc("gate_require_admin", {
        p_access_token_hash: hashSecret(data.accessToken),
        p_visitor_token: data.visitorToken || undefined,
      });
      const result = rows?.[0];
      if (result?.admin) return { admin: true, visitorNumber: Number(result.visitor_number) };
    }

    const session = await gateSession();
    const verificationId = session.data.verificationId;
    const binding = session.data.binding;
    const visitorId = session.data.visitorId;
    if (!session.data.admin || !verificationId || !binding || !visitorId) {
      return { admin: false };
    }

    const { data: rows } = await db.rpc("gate_session_admin", {
      p_verification_id: verificationId,
      p_visitor_id: visitorId,
      p_binding_hash: hashSecret(binding),
    });
    const result = rows?.[0];
    return result?.admin
      ? { admin: true, visitorNumber: Number(result.visitor_number) }
      : { admin: false };
  });
