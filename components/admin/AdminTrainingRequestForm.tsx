"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type TrainingRequestFormState,
  recordTrainingRequestAction,
} from "@/app/admin/clientes/[clienteId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";

const initialState: TrainingRequestFormState = {
  message: null,
  success: false,
};

type AdminTrainingRequestFormProps = {
  clientId: string;
};

export function AdminTrainingRequestForm({
  clientId,
}: AdminTrainingRequestFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inFlightRef = useRef(false);
  const [allowNext, setAllowNext] = useState(false);
  const router = useRouter();
  const action = recordTrainingRequestAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    inFlightRef.current = false;
    if (state.success) {
      setAllowNext(false);
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} aria-busy={isPending} onSubmit={(event) => {
        if (inFlightRef.current || isPending || (state.success && !allowNext)) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }} ref={formRef}>
      {state.message && (!state.success || !allowNext) ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Solicitação registrada" : "Não foi possível registrar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <FormField
        description="Opcional. Registre contexto factual da solicitação sem prescrever ou gerar treino neste passo."
        id="training-request-note"
        label="Observação da solicitação"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            disabled={isPending || (state.success && !allowNext)}
            maxLength={4000}
            name="note"
            placeholder="Ex.: cliente solicitou inclusão do serviço de treino durante o acompanhamento."
            rows={3}
          />
        )}
      </FormField>
      <p>
        Este registro apenas confirma que houve solicitação. Ele não cria,
        publica ou altera treino automaticamente.
      </p>
      <Button disabled={isPending || (state.success && !allowNext)} loading={isPending} type="submit">
        Registrar solicitação de treino
      </Button>
      {state.success && !allowNext ? (
        <Button onClick={() => setAllowNext(true)} type="button" variant="secondary">
          Registrar outra solicitação
        </Button>
      ) : null}
    </form>
  );
}
