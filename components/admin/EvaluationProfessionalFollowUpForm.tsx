"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type ProfessionalFollowUpFormState,
  addProfessionalFollowUp,
} from "@/app/admin/avaliacoes/[avaliacaoId]/actions";
import { Alert } from "@/components/ui/Alert";
import { PROFESSIONAL_DECISION_OPTIONS } from "@/lib/follow-up/professional-decisions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import styles from "./EvaluationProfessionalFollowUpForm.module.css";
import { useAssessmentSubmitGuard } from "./useAssessmentSubmitGuard";

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
  const router = useRouter();
  const action = addProfessionalFollowUp.bind(null, assessmentId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [readyForAnother, setReadyForAnother] = useState(false);
  const guardSubmit = useAssessmentSubmitGuard(state, isPending, state.success && !readyForAnother);
  const lockedAfterSuccess = state.success && !readyForAnother;

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setReadyForAnother(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} aria-busy={isPending} className={styles.form} onSubmit={guardSubmit} ref={formRef}>
      {state.message && (!state.success || !readyForAnother) ? (
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
            maxLength={4000}
            disabled={isPending || lockedAfterSuccess}
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
            maxLength={4000}
            disabled={isPending || lockedAfterSuccess}
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
            disabled={isPending || lockedAfterSuccess}
            name="professionalDecision"
            required
          >
            <option disabled value="">
              Selecione
            </option>
            {PROFESSIONAL_DECISION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
            maxLength={4000}
            disabled={isPending || lockedAfterSuccess}
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
            maxLength={4000}
            disabled={isPending || lockedAfterSuccess}
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

      {lockedAfterSuccess ? (
        <Button onClick={() => setReadyForAnother(true)} type="button" variant="secondary">
          Registrar outro acompanhamento
        </Button>
      ) : (
        <Button disabled={isPending} loading={isPending} type="submit">
          Registrar acompanhamento
        </Button>
      )}
    </form>
  );
}
