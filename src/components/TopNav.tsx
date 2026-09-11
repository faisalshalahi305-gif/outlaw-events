import { Fragment, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import { SuggestionsDialog } from "@/components/SuggestionsDialog";
import { useVisitorNumber } from "@/lib/use-visitor";
import { cn } from "@/lib/utils";

type Item = { key: string; label: string; to?: string };

/** Visual order: left -> right. */
const ITEMS: Item[] = [
  { key: "events", label: "الأحداث", to: "/events" },
  { key: "characters", label: "الشخصيات", to: "/characters" },
  { key: "suggestions", label: "الاقتراحات" },
  { key: "streamers", label: "الستريمرز", to: "/streamers" },
  { key: "revisions", label: "التعديلات", to: "/revisions" },
  { key: "threads", label: "الثريدات", to: "/threads" },
];

/** Simple horizontal, scrollable text nav used on the home page only. */
export function TopNav() {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const visitorNumber = useVisitorNumber();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const scroller = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };

  const endDrag = () => {
    drag.current.active = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    const el = scroller.current;
    if (!el) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta === 0) return;
    if (el.scrollWidth > el.clientWidth) el.scrollLeft += delta;
  };

  const guardClick = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const linkClass = (active: boolean) =>
    cn(
      "shrink-0 whitespace-nowrap px-1 py-1 text-sm font-bold transition-colors select-none",
      active
        ? "text-primary drop-shadow-[0_0_10px_var(--primary)]"
        : "text-foreground/70 hover:text-primary",
    );

  return (
    <>
      <nav dir="ltr" aria-label="التنقل الرئيسي" className="min-w-0">
        <div
          ref={scroller}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
          className="w-full cursor-grab overflow-x-auto overscroll-x-contain active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
        >
          <div className="flex w-max items-center gap-3 px-1">
            {ITEMS.map((item, i) => (
              <Fragment key={item.key}>
                {i > 0 && (
                  <span aria-hidden className="shrink-0 select-none text-primary/40">
                    |
                  </span>
                )}
                {item.to ? (
                  <Link
                    to={item.to}
                    onClick={guardClick}
                    draggable={false}
                    className={linkClass(pathname.startsWith(item.to))}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      if (drag.current.moved) return guardClick(e);
                      setSuggestOpen(true);
                    }}
                    className={linkClass(false)}
                  >
                    {item.label}
                  </button>
                )}
              </Fragment>
            ))}
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
