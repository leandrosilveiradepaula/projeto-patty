"use client";

import { useActionState, useEffect, useState } from "react";
import {
  registerHistoricalClientReturnRequestAction,
  type HistoricalReturnRequestActionState,
} from "@/app/admin/clientes/[clienteId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./HistoricalClientReturnReadinessForm.module.css";

const initialState: HistoricalReturnRequestActionState = {
  success: false,
  message: null,
};

export function HistoricalClientReturnRequestForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(
    registerHistoricalClientReturnRequestAction.bind(null, clientId),
    initialState,
  );
  const [requestId, setRequestId] = useState("");
  useEffect(() => setRequestId(crypto.randomUUID()), []);

  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <input type="hidden" name="requestId" value={requestId} />
      <p className={styles.note}>
        Registre uma solicitação administrativa de retorno usando o cadastro original.
        Esta etapa preserva o histórico e não cria login ou acompanhamento.
      </p>
      <label htmlFor="historical-return-request-confirmed-id" className={styles.label}>
        Confirme novamente o ID da cliente
      </label>
      <TextInput
        id="historical-return-request-confirmed-id"
        name="confirmedClientId"
        autoComplete="off"
        spellCheck={false}
        placeholder="Cole o ID do cadastro já conferido"
        required
        disabled={pending || state.success}
      />
      <code className={styles.identifier}>{clientId}</code>
      <label className={styles.confirmation}>
        <input
          type="checkbox"
          name="identityReviewedByHuman"
          value="yes"
          required
          disabled={pending || state.success}
        />
        <span>
          Declaro que conferi a identidade e que esta solicitação corresponde ao
          cadastro histórico acima. Entendo que o registro não comprova
          tecnicamente a identidade e não autoriza liberar dados antigos.
        </span>
      </label>
      {state.message ? (
        <Alert variant={state.success ? "success" : "warning"} live="polite">
          {state.message}
        </Alert>
      ) : null}
      <Button type="submit" disabled={!requestId || pending || state.success} loading={pending}>
        Registrar solicitação de retorno
      </Button>
      <p className={styles.note}>
        Acesso à conta, senha, Cadastro Atual e liberação de históricos exigem
        etapas próprias. Não utilize o convite de nova cliente.
      </p>
    </form>
  );
}
