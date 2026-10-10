"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/Button";

/**
 * This guard prevents duplicate submissions within one mounted form, including
 * clicks occurring before React has rendered its pending state. All ownership,
 * validation, and historical corrections remain authoritative on the server.
 *
 * The check-in actions redirect on success and on validation/database errors,
 * so the next page load provides a fresh form for another intentional attempt.
 */
export function CheckinActionForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const inFlightRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (inFlightRef.current) {
      event.preventDefault();
      return;
    }
    inFlightRef.current = true;
    setSubmitting(true);
  }

  return (
    <form action={action} aria-busy={submitting} className={className} onSubmit={onSubmit}>
      {children}
      {submitting ? (
        <p aria-live="polite" role="status">
          Registrando alteração. Aguarde a confirmação antes de enviar novamente.
        </p>
      ) : null}
    </form>
  );
}

/**
 * Both Yes/No actions use the submitter's own name/value, preserving the
 * original FormData intent. The server action is not called from this button.
 */
export function CheckinSubmitButton({
  children,
  disabled,
  name,
  value,
  ...props
}: Omit<ButtonProps, "loading" | "type">) {
  const { pending, data } = useFormStatus();
  const thisSubmission = !name || data?.get(name) === value;

  return (
    <Button
      {...props}
      disabled={Boolean(disabled || pending)}
      loading={Boolean(pending && thisSubmission)}
      name={name}
      type="submit"
      value={value}
    >
      {children}
    </Button>
  );
}
