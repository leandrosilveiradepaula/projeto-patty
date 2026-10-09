"use client";

import { useActionState, useEffect, useRef } from "react";
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
  const router = useRouter();
  const action = recordTrainingRequestAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} ref={formRef}>
      {state.message ? (
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
      <Button loading={isPending} type="submit">
        Registrar solicitação de treino
      </Button>
    </form>
  );
}
