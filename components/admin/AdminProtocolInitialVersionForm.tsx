"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/Button";

type ProtocolInitialVersionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  clientId: string;
  protocolId?: string;
};

function ProtocolSubmitButton({
  inFlight,
  recovery,
}: {
  inFlight: { current: boolean };
  recovery: boolean;
}) {
  const { pending } = useFormStatus();

  useEffect(() => {
    // On an unsuccessful server action without navigation, allow a deliberate retry.
    if (!pending) inFlight.current = false;
  }, [pending, inFlight]);

  return (
    <>
      <Button disabled={pending} loading={pending} type="submit" variant={recovery ? "secondary" : "primary"}>
        {recovery ? "Retomar versão inicial" : "Criar primeiro protocolo"}
      </Button>
      <span aria-live="polite" role="status">
        {pending ? "Verificando a versão e registrando o rascunho…" : ""}
      </span>
    </>
  );
}

/** Only guards the mounted form; the server owns all access and uniqueness checks. */
export function AdminProtocolInitialVersionForm({
  action,
  clientId,
  protocolId,
}: ProtocolInitialVersionFormProps) {
  const inFlight = useRef(false);
  const recovery = Boolean(protocolId);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }
    inFlight.current = true;
  }

  return (
    <form action={action} onSubmit={submit}>
      <input name="clientId" type="hidden" value={clientId} />
      {protocolId ? <input name="protocolId" type="hidden" value={protocolId} /> : null}
      <ProtocolSubmitButton inFlight={inFlight} recovery={recovery} />
    </form>
  );
}
