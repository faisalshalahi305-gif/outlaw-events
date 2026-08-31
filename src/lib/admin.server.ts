import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = {
  admin?: boolean;
  at?: number;
  binding?: string;
  verificationId?: string;
  visitorId?: string;
  visitorNumber?: number;
};

function sessionPassword(): string {
  const raw = process.env["SESSION_SECRET"] ?? process.env["ADMIN_HASH_SALT"] ?? "";
  // useSession requires at least 32 characters. Derive a deterministic,
  // long-enough key so a missing/short secret can never break the gate.
  if (raw.length >= 32) return raw;
  return createHash("sha512").update(`outlaw-gate:${raw}`, "utf8").digest("hex");
}

function sessionConfig() {
  return {
    password: sessionPassword(),
    name: "outlaw-gate",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

type GateSessionHandle = {
  data: GateSession;
  update: (value: Partial<GateSession>) => Promise<unknown> | unknown;
  clear: () => Promise<unknown> | unknown;
};

/**
 * The cookie session is a convenience layer only — the database is the source
 * of truth. Never let cookie problems break verification, so failures degrade
 * to an in-memory no-op session instead of throwing.
 */
export async function gateSession(): Promise<GateSessionHandle> {
  try {
    return (await useSession<GateSession>(sessionConfig())) as unknown as GateSessionHandle;
  } catch {
    const data: GateSession = {};
    return {
      data,
      update: (value: Partial<GateSession>) => Object.assign(data, value),
      clear: () => {
        for (const key of Object.keys(data)) delete (data as Record<string, unknown>)[key];
      },
    };
  }
}


export function hashSecret(value: string): string {
  const salt = process.env["ADMIN_HASH_SALT"] ?? "";
  return createHash("sha256").update(`${salt}:${value}`, "utf8").digest("hex");
}

export function hashesMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
