"use client";

import { useActionState } from "react";

import {
  type AnamnesisCorrectionFormState,
  addAnamnesisAnswerCorrection,
} from "@/app/admin/anamneses/[anamneseId]/correcoes/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import styles from "./AdminAnamnesisCorrectionForm.module.css";

const initialState: AnamnesisCorrectionFormState = {
  message: null,
  success: false,
};

type AdminAnamnesisCorrectionFormProps = {
  answerId: string;
  initialValue: string;
  submissionId: string;
};

export function AdminAnamnesisCorrectionForm({
  answerId,
  initialValue,
  submissionId,
}: AdminAnamnesisCorrectionFormProps) {
  const action = addAnamnesisAnswerCorrection.bind(
    null,
    submissionId,
    answerId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={
            state.success
              ? "Correção registrada"
              : "Não foi possível registrar"
          }
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <FormField
        description={
          <>
            Informe um valor JSON válido. Para texto, mantenha as aspas, por
            exemplo <code>&quot;resposta corrigida&quot;</code>. A resposta
            original não será alterada.
          </>
        }
        id={`anamnesis-correction-${answerId}`}
        label="Novo valor corrigido"
        required
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            defaultValue={initialValue}
            name="correctedAnswerValue"
            required
            rows={5}
            spellCheck={false}
          />
        )}
      </FormField>
      <Button loading={isPending} type="submit">
        Registrar correção
      </Button>
    </form>
  );
}
