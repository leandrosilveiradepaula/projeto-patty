"use client";

import { useFormStatus } from "react-dom";

import { requestTrainingAction } from "@/app/cliente/treino/actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";

import styles from "@/app/cliente/treino/page.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button loading={pending} type="submit">
      Solicitar treino
    </Button>
  );
}

export function ClientTrainingRequestForm() {
  return (
    <form action={requestTrainingAction} className={styles.form}>
      <FormField
        description="Opcional. Use este campo para registrar algo importante sobre a solicitação."
        id="client-training-request-note"
        label="Observação"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            maxLength={1000}
            name="note"
            placeholder="Se quiser, conte algo importante sobre sua solicitação."
            rows={4}
          />
        )}
      </FormField>
      <SubmitButton />
    </form>
  );
}
