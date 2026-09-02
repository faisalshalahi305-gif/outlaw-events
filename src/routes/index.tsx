import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import logoAsset from "@/assets/outlaw-mark.jpg";
import { ensureVisitor } from "@/lib/gate.functions";
import { VisitorMenu } from "@/components/VisitorMenu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OUTLAW | الشخصيات الرئيسية وأحداث أوت لاو" },
      {
        name: "description",
        content:
          "الواجهة الرئيسية لموقع Outlaw: تنقّل إلى الشخصيات الرئيسية أو أحداث أوت لاو الأخيرة بتصميم حديث وفخم.",
      },
      { property: "og:title", content: "OUTLAW | الشخصيات الرئيسية وأحداث أوت لاو" },
      {
        property: "og:description",
        content: "اختر بين الشخصيات الرئيسية وأحداث أوت لاو الأخيرة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const VISITOR_KEY = "outlaw-visitor-token";
// Hidden entry: tap the logo 10 times
const SEQUENCE = [
  "logo",
  "logo",
  "logo",
  "logo",
  "logo",
  "logo",
  "logo",
  "logo",
  "logo",
  "logo",
] as const;

function Home() {
  const router = useRouter();
  const visitorFn = useServerFn(ensureVisitor);
  const [visitorNumber, setVisitorNumber] = useState<number | null>(null);
  const step = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem(VISITOR_KEY) : null;
    visitorFn({ data: { token } })
      .then((v) => {
        if (cancelled) return;
        window.localStorage.setItem(VISITOR_KEY, v.token);
        setVisitorNumber(v.number);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visitorFn]);

  const tap = () => {
    if (timer.current) clearTimeout(timer.current);
    step.current = step.current + 1;
    if (step.current >= SEQUENCE.length) {
      step.current = 0;
      router.navigate({ to: "/gate" });
      return;
    }
    timer.current = setTimeout(() => {
      step.current = 0;
    }, 4000);
  };

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-16"
    >
      <span className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="absolute right-4 top-5 z-20">
        <VisitorMenu visitorNumber={visitorNumber} />
      </div>

      <div className="relative z-10 w-full max-w-md text-center rise-in">
        <button
          type="button"
          aria-label="شعار Outlaw"
          onClick={() => tap()}
          className="halo mx-auto block h-52 w-52 overflow-hidden rounded-full border-2 border-primary/70 glow-ring transition-transform duration-500 hover:scale-[1.03]"
        >
          <img
            src={logoAsset}
            alt="شعار Outlaw"
            className="h-full w-full object-cover"
          />
        </button>

        <h1 className="wordmark mt-10 text-5xl drop-shadow-[0_0_28px_color-mix(in_oklab,var(--primary)_45%,transparent)]">
          OUTLAW
        </h1>
        <p className="mt-4 text-lg font-bold text-primary drop-shadow-[0_0_12px_var(--primary)]">
          احداث اوت لاو
        </p>

        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm leading-7 text-foreground/90 shadow-[0_0_20px_-4px_var(--primary)] backdrop-blur-sm">
          موقع أحداث أوت لاو
          <br />
          موقع مخصص لمتابعي سيرفر أوت لاو يتيح لك التعرف على الشخصيات والستريمرز وأبرز أحداث السيرفر ويساعد المتابع الجديد على فهم الأحداث والشخصيات كما يتيح للمتابعين القدامى التعديل بالاضافه والحذف والتحرير على الاحداث والشخصيات لتعرف المتابعين الجدد بالسيرفر واحداثه وشخصياته وزيادة نمو السيرفر
        </div>

        <p className="mt-8 text-xs font-bold tracking-widest text-muted-foreground/70">
          {visitorNumber ? `زائر-${visitorNumber}` : ""}
        </p>
      </div>
    </main>
  );
}
