import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Eye, Loader2, Radio, Users } from "lucide-react";

import { getKickStreamers } from "@/lib/streamers.functions";

type Filter = "all" | "live" | "offline";

const FILTERS: { key: Filter; label: string; dot?: boolean }[] = [
  { key: "all", label: "الكل" },
  { key: "live", label: "مباشر", dot: true },
  { key: "offline", label: "غير متصل" },
];

export function StreamersSection() {
  const fetchStreamers = useServerFn(getKickStreamers);
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["kick-streamers"],
    queryFn: () => fetchStreamers(),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const streamers = data ?? [];
  const liveCount = streamers.filter((s) => s.isLive).length;
  const filtered = streamers.filter((s) =>
    filter === "live" ? s.isLive : filter === "offline" ? !s.isLive : true,
  );

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden px-4 py-12 md:px-8">
      <span className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <Link
          to="/"
          className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          الرجوع للرئيسية
        </Link>

        <header className="rise-in mb-8 flex flex-col items-center gap-5 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary/60 glow-ring text-primary">
            <Radio className="h-6 w-6" />
          </span>

          <div>
            <p className="wordmark text-2xl">OUTLAW</p>
            <h1 className="mt-2 text-3xl font-extrabold text-primary md:text-4xl">
              جميع الاستريمر
            </h1>
            <div className="ornament-line mx-auto mt-4 w-52" />
            <p className="ornament-diamond mt-4 text-[10px] font-bold tracking-[0.4em] text-muted-foreground">
              KICK ONLY
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="surface-card rounded-full border border-primary/40 px-4 py-1.5 text-xs font-extrabold text-primary">
              {streamers.length} ستريمر
            </span>
            <span className="surface-card flex items-center gap-2 rounded-full border border-destructive/50 px-4 py-1.5 text-xs font-extrabold text-destructive">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              {liveCount} مباشر الآن
            </span>
          </div>

          <div className="surface-card flex rounded-full border border-border p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                  filter === f.key
                    ? "border border-primary/60 bg-primary/15 text-primary shadow-[var(--shadow-elegant)]"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {f.dot ? <span className="h-2 w-2 rounded-full bg-destructive" /> : null}
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-primary">
            <Loader2 className="h-9 w-9 animate-spin" />
            <p className="text-xs font-bold tracking-widest text-muted-foreground">
              جاري تحديث حالة البث
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <a
                key={s.username}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`surface-card group block overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
                  s.isLive
                    ? "border-2 border-primary/60 hover:border-primary hover:shadow-[var(--shadow-elegant)]"
                    : "border border-border opacity-80 hover:border-primary/50 hover:opacity-100"
                }`}
              >
                {s.isLive ? (
                  <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background">
                    {s.thumbnail ? (
                      <img
                        src={s.thumbnail}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                    <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-black tracking-widest text-destructive-foreground">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive-foreground" />
                      LIVE
                    </span>
                    <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-bold text-foreground">
                      <Eye className="h-3.5 w-3.5 text-primary" />
                      {s.viewerCount.toLocaleString("en-US")}
                    </span>
                  </div>
                ) : null}


                <div className="relative flex items-start gap-4 p-4">
                  <span className="absolute left-4 top-4 rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-[10px] font-black tracking-widest text-primary">
                    KICK
                  </span>

                  <img
                    src={s.avatar}
                    alt={s.displayName}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className={`h-14 w-14 shrink-0 rounded-full border-2 object-cover ${
                      s.isLive ? "border-primary glow-ring" : "border-border"
                    }`}
                  />

                  <div className="min-w-0 flex-1 pl-14 text-right">
                    <h3 className="truncate text-lg font-extrabold text-foreground">
                      {s.displayName}
                    </h3>
                    <p
                      className={`mt-1 line-clamp-2 text-sm ${
                        s.isLive ? "text-muted-foreground" : "text-muted-foreground/70"
                      }`}
                    >
                      {s.isLive ? s.streamTitle || "بث مباشر الآن" : s.bio}
                    </p>

                    <div className="mt-3 flex items-center justify-end gap-2 text-xs font-bold text-muted-foreground">
                      <span>{s.followers.toLocaleString("en-US")}</span>
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {!s.isLive ? (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">
                          غير متصل
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 ? (
          <p className="mt-12 text-center text-sm font-bold text-muted-foreground">
            لا يوجد ستريمرز يطابقون الفلتر الحالي.
          </p>
        ) : null}
      </div>
    </main>
  );
}
