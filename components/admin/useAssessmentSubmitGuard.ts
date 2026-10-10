"use client";

import { useEffect, useRef, type FormEvent } from "react";

/**
 * A synchronous per-form lock closes the repeated-click window before React
 * exposes useActionState pending. A server response releases the lock for an
 * explicit retry; a successful terminal action may independently stay closed.
 * This is a UI safeguard, not cross-session transactional idempotency.
 */
export function useAssessmentSubmitGuard(
  actionState: unknown,
  isPending: boolean,
  completed = false,
) {
  const inFlightRef = useRef(false);

  useEffect(() => {
    inFlightRef.current = false;
  }, [actionState]);

  return (event: FormEvent<HTMLFormElement>) => {
    if (inFlightRef.current || isPending || completed) {
      event.preventDefault();
      return;
    }
    inFlightRef.current = true;
  };
}
