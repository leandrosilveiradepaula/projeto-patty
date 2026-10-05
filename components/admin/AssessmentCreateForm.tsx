"use client";

import { useActionState, useMemo, useState } from "react";

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
    semanticKey: "basic" | "complete";
    value: "fortnightly" | "monthly";
  }>;
  schedulePreferences: {
    basicPlacementLabel: string;
    completePreferredWeekdayLabels: string[];
  };
};

export function AssessmentCreateForm({
  clientId,
  kindOptions,
  schedulePreferences,
}: AssessmentCreateFormProps) {
  const action = createAssessmentAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedKind, setSelectedKind] = useState("");

  const selectedOption = useMemo(
    () => kindOptions.find((option) => option.value === selectedKind) ?? null,
    [kindOptions, selectedKind],
  );

  const scheduleGuidance =
    selectedOption?.semanticKey === "complete"
      ? `Preferência atual para Avaliação Completa: ${schedulePreferences.completePreferredWeekdayLabels.join(
          " ou ",
        )}. Outras datas continuam permitidas.`
      : selectedOption?.semanticKey === "basic"
        ? schedulePreferences.basicPlacementLabel
        : null;

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert live="assertive" title="Não foi possível criar" variant="critical">
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Os tipos disponíveis e seus requisitos são resolvidos a partir da configuração ativa do método."
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
            onChange={(event) => setSelectedKind(event.target.value)}
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

      {scheduleGuidance ? (
        <p aria-live="polite" className={styles.notice}>
          {scheduleGuidance}
        </p>
      ) : null}

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
