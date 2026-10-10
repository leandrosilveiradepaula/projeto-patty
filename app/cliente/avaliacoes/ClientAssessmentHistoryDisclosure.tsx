"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Only finalized, already client-visible measurements are rendered here.
 * The element is an ordinary native disclosure: manual toggling still works,
 * while links from the factual evolution table reveal the requested record.
 */
export function ClientAssessmentHistoryDisclosure({
  children,
  className,
  id,
  summary,
}: {
  children: ReactNode;
  className?: string;
  id: string;
  summary: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function revealTarget() {
      if (window.location.hash !== "#" + id) return;
      const details = detailsRef.current;
      if (!details) return;
      details.open = true;
      details.scrollIntoView({ block: "start" });
    }

    // Handle both direct arrival from Evolução and same-page history links.
    revealTarget();
    window.addEventListener("hashchange", revealTarget);
    return () => window.removeEventListener("hashchange", revealTarget);
  }, [id]);

  return (
    <details className={className} id={id} ref={detailsRef}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
