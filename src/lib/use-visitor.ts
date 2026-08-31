import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { ensureVisitor } from "@/lib/gate.functions";

export const VISITOR_KEY = "outlaw-visitor-token";

/** Returns the stable visitor number for the current browser (null while loading). */
export function useVisitorNumber() {
  const visitorFn = useServerFn(ensureVisitor);
  const [visitorNumber, setVisitorNumber] = useState<number | null>(null);

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

  return visitorNumber;
}
