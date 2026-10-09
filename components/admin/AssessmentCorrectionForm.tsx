"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  type AssessmentCorrectionFormState,
  correctFinalizedAssessmentMeasurementAction,
} from "@/app/admin/avaliacoes/[avaliacaoId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import styles from "./AssessmentCorrectionForm.module.css";

const initialState: AssessmentCorrectionFormState = {
  message: null,
  success: false,
};

export function AssessmentCorrectionForm({
  assessmentId,
  measurementId,
  measurementUnit,
  measurementValue,
}: {
  assessmentId: string;
  measurementId: string;
  measurementUnit: string;
  measurementValue: number;
}) {
  const action = correctFinalizedAssessmentMeasurementAction.bind(
    null,
    assessmentId,
    measurementId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Correção registrada" : "Não foi possível corrigir"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      {!state.success ? (
        <>
          <label className={styles.field}>
            <span>Valor corrigido</span>
            <input
              defaultValue={String(measurementValue)}
              inputMode="decimal"
              name="correctedMeasurementValue"
              required
            />
          </label>
          <label className={styles.field}>
            <span>Unidade</span>
            <input defaultValue={measurementUnit} maxLength={40} name="correctedUnit" required />
          </label>
          <label className={styles.field}>
            <span>Observação opcional</span>
            <input maxLength={4000} name="correctionNote" />
          </label>
          <Button loading={isPending} type="submit">
            Registrar correção
          </Button>
        </>
      ) : null}
    </form>
  );
}
