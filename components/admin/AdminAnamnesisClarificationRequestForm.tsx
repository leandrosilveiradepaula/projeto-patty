"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  type AnamnesisClarificationRequestFormState,
  addAnamnesisClarificationRequest,
} from "@/app/admin/anamneses/[anamneseId]/esclarecimentos/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import styles from "./AnamnesisClarificationForm.module.css";

const initialState: AnamnesisClarificationRequestFormState = { message: null, success: false };

export function AdminAnamnesisClarificationRequestForm({
  sourceAnswers,
  submissionId,
}: {
  sourceAnswers: Array<{ id: string; label: string }>;
  submissionId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inFlightRef = useRef(false);
  const router = useRouter();
  const action = addAnamnesisClarificationRequest.bind(null, submissionId);
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
          title={state.success ? "Pedido registrado" : "Não foi possível registrar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="clarification-source-answer">
          Resposta original relacionada
        </label>
        <p className={styles.help}>Opcional. Selecione apenas quando o pedido se referir diretamente a uma resposta.</p>
        <select className={styles.select} defaultValue="" disabled={isPending} id="clarification-source-answer" name="sourceAnswerId">
          <option value="">Sem vínculo direto</option>
          {sourceAnswers.map((answer) => (
            <option key={answer.id} value={answer.id}>{answer.label}</option>
          ))}
        </select>
      </div>
      <FormField
        description="A cliente verá este texto no aplicativo. O pedido fica no histórico sem alterar a resposta original."
        id="clarification-request-text"
        label="Pedido de esclarecimento"
        required
      >
        {(fieldProps) => (
          <Textarea {...fieldProps} disabled={isPending} maxLength={4000} name="requestText" placeholder="Explique o que precisa ser complementado ou esclarecido." required rows={5} />
        )}
      </FormField>
      <div className={styles.actions}>
        <Button disabled={isPending} loading={isPending} type="submit">Enviar pedido à cliente</Button>
      </div>
    </form>
  );
}
