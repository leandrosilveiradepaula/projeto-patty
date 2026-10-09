"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createTrainingPlanDraftAction,
  type TrainingPlanFormState,
  updateTrainingPlanDraftAction,
} from "@/app/admin/clientes/[clienteId]/treino/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";

import styles from "./AdminTrainingPlanForms.module.css";

const initialState: TrainingPlanFormState = {
  message: null,
  success: false,
};

type Props = {
  clientId: string;
  notes?: string | null;
  title?: string;
  trainingPlanVersionId?: string;
};

export function AdminTrainingPlanDraftForm({
  clientId,
  notes,
  title,
  trainingPlanVersionId,
}: Props) {
  const action = trainingPlanVersionId
    ? updateTrainingPlanDraftAction.bind(
        null,
        clientId,
        trainingPlanVersionId,
      )
    : createTrainingPlanDraftAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Treino atualizado" : "Não foi possível salvar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Nome livre para identificar esta versão do treino."
        id="training-plan-title"
        label="Título do treino"
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            defaultValue={title}
            maxLength={160}
            name="title"
            required
          />
        )}
      </FormField>

      <FormField
        description="Opcional. Use para contexto geral que a cliente poderá ver depois da publicação."
        id="training-plan-notes"
        label="Observações gerais"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            defaultValue={notes ?? undefined}
            maxLength={4000}
            name="notes"
            rows={4}
          />
        )}
      </FormField>

      <p className={styles.notice}>
        Salvar não publica o treino. A versão continuará em rascunho até revisão
        explícita da Patty.
      </p>

      <Button loading={isPending} type="submit">
        {trainingPlanVersionId ? "Salvar rascunho" : "Criar rascunho"}
      </Button>
    </form>
  );
}
