"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A native, user-toggleable disclosure for historical client records.
 * Opens the exact requested hash target (or a child of this disclosure).
 * No client health data, state or navigation parameters are persisted.
 */
export function ClientHistoryDisclosure({
  children,
  className,
  id,
  summary,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  summary: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function revealTarget() {
      const rawHash = window.location.hash.slice(1);
      if (!rawHash) return;
      let targetId: string;
      try {
        targetId = decodeURIComponent(rawHash);
      } catch {
        return;
      }

      const details = detailsRef.current;
      const target = document.getElementById(targetId);
      if (!details || !target || (target !== details && !details.contains(target))) {
        return;
      }

      details.open = true;
      target.scrollIntoView({ block: "start" });
    }

    revealTarget();
    window.addEventListener("hashchange", revealTarget);
    return () => window.removeEventListener("hashchange", revealTarget);
  }, []);

  return (
    <details className={className} id={id} ref={detailsRef}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
