import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Flame, MessageSquareText, Radio, SlidersHorizontal, Users } from "lucide-react";

import { SuggestionsDialog } from "@/components/SuggestionsDialog";
import { useVisitorNumber } from "@/lib/use-visitor";
import { cn } from "@/lib/utils";

type Item = {
  key: string;
  label: string;
  to?: string;
  icon: typeof Flame;
};

/** Order is visual left -> right; RTL rendering flips the DOM order. */
const ITEMS: Item[] = [
  { key: "suggestions", label: "الاقتراحات", icon: MessageSquareText },
  { key: "streamers", label: "الستريمز", to: "/streamers", icon: Radio },
  { key: "characters", label: "الشخصيات", to: "/characters", icon: Users },
  { key: "revisions", label: "التعديلات", to: "/revisions", icon: SlidersHorizontal },
];

/**
 * Fixed neon bottom navigation shown on every page.
 * "الأحداث" sits in the middle inside a highlighted neon circle.
 */
export function BottomNav() {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const visitorNumber = useVisitorNumber();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to?: string) =>
    !!to && (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const right = ITEMS.slice(0, 2); // الاقتراحات، الستريمز  (right side in RTL)
  const left = ITEMS.slice(2); // الشخصيات، التعديلات

  const renderItem = (item: Item) => {
    const active = isActive(item.to);
    const Icon = item.icon;
    const content = (
      <>
        <Icon
          className={cn(
            "h-6 w-6 transition-all",
            active ? "drop-shadow-[0_0_10px_var(--primary)]" : "opacity-90",
          )}
          strokeWidth={1.75}
        />
        <span className="text-[11px] font-bold sm:text-xs">{item.label}</span>
      </>
    );

    const classes = cn(
      "flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2 text-primary/80 transition-all",
      "hover:text-primary hover:drop-shadow-[0_0_12px_var(--primary)]",
      active && "text-primary drop-shadow-[0_0_12px_var(--primary)]",
    );

    if (!item.to) {
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => setSuggestOpen(true)}
          className={classes}
        >
          {content}
        </button>
      );
    }

    return (
      <Link key={item.key} to={item.to} className={classes}>
        {content}
      </Link>
    );
  };

  return (
    <>
      <nav
        dir="rtl"
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10"
      >
        <div className="relative mx-auto w-full max-w-2xl">
          <div className="flex items-end gap-1 rounded-[2rem] border border-primary/60 bg-[oklch(0.13_0.02_230/0.92)] px-2 pb-2 pt-3 shadow-[0_0_28px_-6px_var(--primary)] backdrop-blur-xl">
            {right.map(renderItem)}

            {/* الأحداث — center highlighted */}
            <Link
              to="/events"
              className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1 pb-2 text-primary"
            >
              <span
                className={cn(
                  "-mt-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-[oklch(0.13_0.02_230)]",
                  "shadow-[0_0_26px_-2px_var(--primary),inset_0_0_18px_-6px_var(--primary)] transition-transform group-hover:scale-105",
                  isActive("/events") && "scale-105",
                )}
              >
                <Flame
                  className="h-8 w-8 drop-shadow-[0_0_10px_var(--primary)]"
                  strokeWidth={1.75}
                />
              </span>
              <span className="text-[11px] font-bold sm:text-xs">الأحداث</span>
            </Link>

            {left.map(renderItem)}
          </div>
        </div>
      </nav>

      <SuggestionsDialog
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        visitorNumber={visitorNumber}
      />
    </>
  );
}
