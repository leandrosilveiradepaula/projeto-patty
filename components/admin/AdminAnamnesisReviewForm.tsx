"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  type AnamnesisReviewFormState,
  addAnamnesisReviewNote,
} from "@/app/admin/anamneses/[anamneseId]/revisao/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import styles from "./AdminAnamnesisReviewForm.module.css";

const initialState: AnamnesisReviewFormState = {
  message: null,
  success: false,
};

type AdminAnamnesisReviewFormProps = {
  submissionId: string;
};

export function AdminAnamnesisReviewForm({
  submissionId,
}: AdminAnamnesisReviewFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inFlightRef = useRef(false);
  const router = useRouter();
  const action = addAnamnesisReviewNote.bind(null, submissionId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    inFlightRef.current = false;
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className={styles.form}
      onSubmit={(event) => {
        if (inFlightRef.current || isPending) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }}
      ref={formRef}
    >
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Nota registrada" : "Não foi possível registrar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <FormField
        description="A nota será adicionada ao histórico interno e não poderá ser editada ou apagada por este fluxo."
        id="anamnesis-review-note"
        label="Nota interna"
        required
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            disabled={isPending}
            maxLength={4000}
            name="note"
            placeholder="Registre a observação profissional sem alterar a resposta original da cliente."
            required
            rows={5}
          />
        )}
      </FormField>
      <Button disabled={isPending} loading={isPending} type="submit">
        Registrar nota
      </Button>
    </form>
  );
}
