"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  type ProfessionalFollowUpFormState,
  addProfessionalFollowUp,
} from "@/app/admin/avaliacoes/[avaliacaoId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import styles from "./EvaluationProfessionalFollowUpForm.module.css";

const initialState: ProfessionalFollowUpFormState = {
  message: null,
  success: false,
};

type EvaluationProfessionalFollowUpFormProps = {
  assessmentId: string;
};

export function EvaluationProfessionalFollowUpForm({
  assessmentId,
}: EvaluationProfessionalFollowUpFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = addProfessionalFollowUp.bind(null, assessmentId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={
            state.success
              ? "Acompanhamento registrado"
              : "Não foi possível registrar"
          }
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Registro textual da dificuldade relatada, quando houver."
        id="follow-up-difficulty"
        label="Dificuldade relatada pela cliente"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            name="difficulty"
            placeholder="Opcional"
            rows={3}
          />
        )}
      </FormField>

      <FormField
        description="Registro profissional descritivo. Não use score automático."
        id="follow-up-adherence"
        label="Percepção de adesão"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            name="adherencePerception"
            placeholder="Opcional"
            rows={3}
          />
        )}
      </FormField>

      <FormField
        id="follow-up-decision"
        label="Decisão profissional"
        required
      >
        {(fieldProps) => (
          <select
            {...fieldProps}
            className={styles.select}
            defaultValue=""
            name="professionalDecision"
            required
          >
            <option disabled value="">
              Selecione
            </option>
            <option value="maintain">Manter</option>
            <option value="simplify">Simplificar</option>
            <option value="advance">Avançar</option>
            <option value="return">Retornar</option>
          </select>
        )}
      </FormField>

      <FormField
        description="Explique o motivo factual/profissional da decisão registrada."
        id="follow-up-decision-reason"
        label="Motivo da decisão"
        required
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            name="decisionReason"
            required
            rows={4}
          />
        )}
      </FormField>

      <FormField
        description="Observação interna da Patty. Não é exibida para a cliente."
        id="follow-up-patty-observation"
        label="Observação interna"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            name="pattyObservation"
            placeholder="Opcional"
            rows={4}
          />
        )}
      </FormField>

      <p className={styles.notice}>
        Registrar este acompanhamento não altera protocolo, fase ou publicação
        automaticamente.
      </p>

      <Button loading={isPending} type="submit">
        Registrar acompanhamento
      </Button>
    </form>
  );
}
