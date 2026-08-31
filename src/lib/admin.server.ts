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

function sessionConfig() {
  const password = process.env["SESSION_SECRET"];
  if (!password) throw new Error("SESSION_SECRET is not set");
  return {
    password,
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

export function gateSession() {
  return useSession<GateSession>(sessionConfig());
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
