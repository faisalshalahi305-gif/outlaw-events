import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, BadgeCheck, Loader2, Send, UserPlus } from "lucide-react";

import { checkKickUsername, submitStreamerRequest } from "@/lib/streamers.functions";
import { readVisitorLabel } from "@/lib/gate-identity";

export const Route = createFileRoute("/streamers-new")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب ستريمر جديد | OUTLAW" },
      {
        name: "description",
        content:
          "أرسل اسم مستخدم حسابك على Kick ليتم التحقق منه وإضافته إلى قائمة ستريمرز أوت لاو بعد اعتماده.",
      },
      { property: "og:title", content: "إنشاء حساب ستريمر جديد | OUTLAW" },
      {
        property: "og:description",
        content: "تحقق من حساب Kick وأرسل طلب الانضمام لقائمة الستريمرز.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewStreamerPage,
});

type Verified = {
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string;
  verified: boolean;
  followers: number;
  alreadyListed: boolean;
};


function visitorNumber(): number | null {
  const match = /(\d+)\s*$/.exec(readVisitorLabel() ?? "");
  return match ? Number(match[1]) : null;
}

function NewStreamerPage() {
  const check = useServerFn(checkKickUsername);
  const submit = useServerFn(submitStreamerRequest);

  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState<Verified | null>(null);
  const [sent, setSent] = useState(false);

  const verify = async () => {
    setBusy(true);
    setError("");
    setVerified(null);
    try {
      const res = await check({ data: { username } });
      if (!res.ok) {
        setError("الحساب غير موجود على Kick أو الاسم خاطئ");
      } else {
        setVerified({
          username: res.username,
          displayName: res.displayName,
          avatar: res.avatar,
          bio: res.bio,
          verified: res.verified,
          followers: res.followers,
          alreadyListed: res.alreadyListed,
        });
      }

    } catch {
      setError("تعذر التحقق من الاسم، تأكد من كتابته بشكل صحيح وحاول مرة أخرى");
    }
    setBusy(false);
  };

  const send = async () => {
    if (!verified) return;
    setBusy(true);
    setError("");
    try {
      const res = await submit({
        data: { username: verified.username, visitorNumber: visitorNumber() },
      });
      if (res.ok) setSent(true);
      else if (res.reason === "listed") setError("هذا الحساب موجود بالفعل في قائمة الستريمرز");
      else setError("تم إرسال هذا الحساب سابقًا وهو قيد المراجعة");
    } catch {
      setError("تعذر إرسال الطلب، حاول مرة أخرى");
    }
    setBusy(false);
  };

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden px-5 py-12">
      <span className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-md pb-24">
        <Link
          to="/streamers"
          className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          الرجوع للستريمرز
        </Link>

        <header className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/60 glow-ring">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold text-primary">إنشاء حساب جديد</h1>
          <div className="ornament-line mx-auto mt-4 w-48" />
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            أدخل اسم مستخدم حسابك على Kick ليتم التحقق منه
          </p>
        </header>

        {sent ? (
          <div className="surface-card mt-10 rounded-2xl border border-primary/50 p-6 text-center">
            <BadgeCheck className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-4 text-sm font-extrabold text-primary">تم إرسال الطلب بنجاح</p>
            <p className="mt-2 text-xs font-bold text-muted-foreground">
              سيظهر الحساب في قائمة الستريمرز بعد اعتماده.
            </p>
            <Link
              to="/streamers"
              className="mt-6 inline-flex rounded-xl bg-gradient-to-l from-primary to-primary-glow px-5 py-2.5 text-xs font-bold text-primary-foreground"
            >
              العودة للقائمة
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setVerified(null);
                setError("");
              }}
              maxLength={60}
              dir="ltr"
              placeholder="Kick Username"
              className="surface-card w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/60"
            />

            {verified ? (
              <div className="surface-card flex items-center gap-3 rounded-2xl border border-primary/50 p-4 text-right">
                {verified.avatar ? (
                  <img
                    src={verified.avatar}
                    alt={verified.displayName}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-full border-2 border-primary object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-primary">
                    <BadgeCheck className="h-4 w-4" />
                    تم التحقق من الحساب
                  </p>
                  <p className="mt-1 truncate text-xs font-bold text-foreground/80">
                    {verified.displayName}
                    {verified.verified ? " ✅" : ""} ·{" "}
                    {verified.followers.toLocaleString("en-US")} متابع
                  </p>
                  {verified.bio ? (
                    <p className="mt-1 line-clamp-3 text-[11px] font-bold text-muted-foreground">
                      {verified.bio}
                    </p>
                  ) : null}
                  {verified.alreadyListed ? (
                    <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                      هذا الحساب مسجّل مسبقًا
                    </p>
                  ) : null}

                </div>
              </div>
            ) : null}

            {error ? (
              <p className="text-center text-xs font-bold text-destructive">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={verified ? send : verify}
              disabled={busy || !username.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-5 py-3 text-sm font-extrabold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : verified ? (
                <Send className="h-4 w-4" />
              ) : null}
              {verified ? "إرسال الطلب" : "حفظ والتحقق"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
