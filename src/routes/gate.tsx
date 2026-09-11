import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Upload, Loader2, ArrowRight } from "lucide-react";
import { beginGateVerification, ensureVisitor, verifyGate } from "@/lib/gate.functions";
import {
  readVisitorToken,
  writeVisitorToken,
  writeAccessToken,
  clearAccessToken,
} from "@/lib/gate-identity";

export const Route = createFileRoute("/gate")({
  head: () => ({
    meta: [
      { title: "تحقق | OUTLAW" },
      { name: "description", content: "صفحة التحقق الخاصة بالنظام." },
      { property: "og:title", content: "تحقق | OUTLAW" },
      { property: "og:description", content: "صفحة التحقق الخاصة بالنظام." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GatePage,
});

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function GatePage() {
  const router = useRouter();
  const verify = useServerFn(verifyGate);
  const ensureVisitorFn = useServerFn(ensureVisitor);
  const beginVerification = useServerFn(beginGateVerification);
  const fileRef = useRef<HTMLInputElement>(null);
  const visitorTokenRef = useRef("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [visitorNumber, setVisitorNumber] = useState<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = readVisitorToken();
    ensureVisitorFn({ data: { token } })
      .then(async (visitor) => {
        writeVisitorToken(visitor.token, visitor.label);
        visitorTokenRef.current = visitor.token;
        setLabel(visitor.label);
        return beginVerification({ data: { token: visitor.token } });
      })
      .then((result) => {
        if (cancelled) return;
        setVisitorNumber(result.visitorNumber);
        setLabel(result.label);
        setInitialized(result.initialized);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("تعذر بدء جلسة التحقق");
      });
    return () => {
      cancelled = true;
    };
  }, [beginVerification, ensureVisitorFn]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!ready || !visitorTokenRef.current || !code.trim() || !file) {
      setError("البيانات غير صحيحة");
      return;
    }
    setBusy(true);
    try {
      const imageHash = await sha256Hex(file);
      const res = await verify({
        data: { code: code.trim(), imageHash, visitorToken: visitorTokenRef.current },
      });
      if (res.ok) {
        writeAccessToken(res.accessToken);
        await router.navigate({ to: "/control" });
        return;
      }
      clearAccessToken();
      setError("البيانات غير صحيحة");
      if (visitorTokenRef.current) {
        await beginVerification({ data: { token: visitorTokenRef.current } });
      }
    } catch {
      setError("البيانات غير صحيحة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-16"
    >
      <span className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <form
        onSubmit={onSubmit}
        className="surface-card relative z-10 w-full max-w-sm rounded-3xl border-2 border-primary/50 p-7 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/60 glow-ring">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>

        <h1 className="mt-6 text-2xl font-extrabold text-primary">التحقق</h1>
        {(label || visitorNumber !== null) && (
          <p className="mt-2 text-sm font-extrabold text-foreground">
            {label ?? `الزائر-${visitorNumber}`}
          </p>
        )}
        {initialized === false && (
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            أول رمز وأول صورة تُدخلهما الآن يصبحان الرمز والصورة الرسميين للنظام.
          </p>
        )}
        <div className="ornament-line mx-auto mt-4 w-40" />

        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="الرمز السري"
          autoComplete="off"
          className="mt-7 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-right text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-primary/50 px-4 py-3 text-right text-sm font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Upload className="h-4 w-4" />
          <span className="truncate">{file ? file.name : "رفع الصورة السرية"}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {error && (
          <p className="mt-4 text-sm font-extrabold text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !ready}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {(busy || !ready) && <Loader2 className="h-4 w-4 animate-spin" />}
          {ready ? "تحقق" : "جاري ربط الزائر"}
        </button>

        <Link
          to="/"
          className="mx-auto mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowRight className="h-4 w-4" />
          الرجوع للصفحة الرئيسية
        </Link>
      </form>
    </main>
  );
}
