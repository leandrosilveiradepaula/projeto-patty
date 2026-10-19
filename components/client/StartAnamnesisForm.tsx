"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/Button";

function SubmitDraftButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending}>
      {pending ? "Iniciando Anamnese…" : "Começar Anamnese"}
    </Button>
  );
}

/**
 * Keeps the existing server action and progressive form submission.
 * The explicit pending state prevents an accidental second click while
 * a draft is being created. data-interactive marks hydration for E2E.
 */
export function StartAnamnesisForm({ action }: { action: () => Promise<void> }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <form action={action} data-interactive={hydrated ? "true" : undefined}>
      <SubmitDraftButton />
    </form>
  );
}
