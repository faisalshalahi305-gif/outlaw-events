import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { getSetupStatus } from "@/lib/setup-status.functions";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "إعدادات الاتصال | OUTLAW" },
      { name: "description", content: "حالة مفاتيح ومتغيرات الاتصال بقاعدة بيانات الموقع." },
      { property: "og:title", content: "إعدادات الاتصال | OUTLAW" },
      { property: "og:description", content: "حالة مفاتيح ومتغيرات الاتصال بالموقع." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const fetchStatus = useServerFn(getSetupStatus);
  const { data, isLoading } = useQuery({ queryKey: ["setup-status"], queryFn: () => fetchStatus() });

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">إعدادات الاتصال</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          القيم تُحفظ في مخزن الأسرار الآمن ولا تُعرض هنا أبدًا. هذه الصفحة تُظهر فقط ما إذا كان كل
          متغيّر مضبوطًا أم لا.
        </p>

        {isLoading ? (
          <div className="mt-10 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> جارِ الفحص…
          </div>
        ) : (
          <>
            <div
              className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
                data?.ready
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-foreground"
              }`}
            >
              {data?.ready
                ? "كل المتغيّرات الأساسية مضبوطة — الموقع متصل بقاعدة البيانات."
                : "بعض المتغيّرات الأساسية ناقصة — الموقع لن يعرض المحتوى حتى تكتمل."}
            </div>

            <ul className="mt-6 space-y-3">
              {data?.vars.map((v) => (
                <li
                  key={v.name}
                  className="rounded-lg border border-border bg-card p-4 text-card-foreground"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{v.label}</p>
                      <code className="mt-1 block text-xs text-muted-foreground" dir="ltr">
                        {v.name}
                      </code>
                      <p className="mt-2 text-xs text-muted-foreground">{v.hint}</p>
                    </div>
                    {v.configured ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                        <CheckCircle2 className="h-4 w-4" /> مضبوط
                      </span>
                    ) : (
                      <span
                        className={`flex shrink-0 items-center gap-1 text-xs ${
                          v.required ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        <XCircle className="h-4 w-4" /> {v.required ? "ناقص" : "غير مضبوط"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
