"use client";

import { useActionState } from "react";
import {
  type AdminAiReviewFormState,
  runAdminAnamnesisAiReview,
} from "@/app/admin/anamneses/[anamneseId]/ia/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./AdminAiReviewForm.module.css";

const initialState: AdminAiReviewFormState = {
  message: null,
  success: false,
};

export function AdminAiReviewForm({
  financialAnswerId,
  model,
  providerReady,
  submissionId,
}: {
  financialAnswerId: string | null;
  model: string | null;
  providerReady: boolean;
  submissionId: string;
}) {
  const action = runAdminAnamnesisAiReview.bind(null, submissionId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Análise concluída" : "Análise não concluída"}
          variant={state.success ? "success" : "warning"}
        >
          {state.message}
        </Alert>
      ) : null}

      {financialAnswerId ? (
        <label className={styles.checkboxRow}>
          <input
            name="financialAnswerId"
            type="checkbox"
            value={financialAnswerId}
          />
          <span>
            Incluir explicitamente a resposta sobre capacidade financeira nesta
            execução.
          </span>
        </label>
      ) : null}

      <div className={styles.actions}>
        <Button
          disabled={!providerReady}
          loading={isPending}
          type="submit"
        >
          Executar análise assistida
        </Button>
        <p className={styles.help}>
          {providerReady
            ? `OpenAI configurada com o modelo ${model}. O resultado ficará somente para revisão da Patty.`
            : "A chamada externa permanece bloqueada até a configuração de privacidade e credenciais ser habilitada."}
        </p>
      </div>
    </form>
  );
}
