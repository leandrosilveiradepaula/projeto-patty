"use client";

import { useActionState } from "react";

import {
  type CreateAssessmentState,
  createAssessmentAction,
} from "@/app/admin/clientes/[clienteId]/avaliacoes/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./AssessmentCreateForm.module.css";

const initialState: CreateAssessmentState = {
  message: null,
};

type AssessmentCreateFormProps = {
  clientId: string;
  kindOptions: Array<{
    label: string;
    value: "fortnightly" | "monthly";
  }>;
};

export function AssessmentCreateForm({
  clientId,
  kindOptions,
}: AssessmentCreateFormProps) {
  const action = createAssessmentAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert live="assertive" title="Não foi possível criar" variant="critical">
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Básica: peso, cintura, abdômen e quadril. Completa: conjunto completo de medidas, peso e fotos. A validação automática do catálogo completo ainda está em evolução."
        id="assessment-kind"
        label="Tipo de avaliação"
        required
      >
        {(fieldProps) => (
          <select
            {...fieldProps}
            className={styles.select}
            defaultValue=""
            name="assessmentKind"
            required
          >
            <option disabled value="">
              Selecione
            </option>
            {kindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField
        description="Data profissional da coleta/avaliação. Pode ser ajustada enquanto o registro estiver em rascunho."
        id="assessment-date"
        label="Data da avaliação"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            name="assessedAt"
            required
            type="date"
          />
        )}
      </FormField>

      <p className={styles.notice}>
        A avaliação será criada como rascunho. Medidas e fotos poderão ser
        ajustadas até a finalização explícita.
      </p>

      <Button loading={isPending} type="submit">
        Criar rascunho de avaliação
      </Button>
    </form>
  );
}
