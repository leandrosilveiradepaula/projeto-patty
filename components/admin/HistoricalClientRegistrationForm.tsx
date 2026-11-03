"use client";

import { useActionState, useEffect, useState } from "react";
import { registerHistoricalClient, type HistoricalRegistrationState } from "@/app/admin/clientes/historico/actions";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Alert } from "@/components/ui/Alert";
import styles from "./HistoricalClientRegistrationForm.module.css";

const initialState: HistoricalRegistrationState = { message: null, success: false };

export function HistoricalClientRegistrationForm() {
  const [state, action, pending] = useActionState(registerHistoricalClient, initialState);
  const [requestId, setRequestId] = useState("");
  useEffect(() => setRequestId(crypto.randomUUID()), []);

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="requestId" value={requestId} />
      <label className={styles.label} htmlFor="historical-client-name">Nome profissional da cliente</label>
      <TextInput id="historical-client-name" name="fullName" required minLength={2} maxLength={120} autoComplete="off" />
      <p className={styles.note}>Consulte o diretório antes de cadastrar. Nome igual bloqueia a criação para revisão humana; nomes diferentes não comprovam identidades diferentes.</p>
      <label className={styles.confirmation}>
        <input name="confirmedNoExistingClient" type="checkbox" value="yes" required />
        <span>Conferi o diretório e o acervo disponível e confirmei que este cadastro interno não duplica uma cliente já registrada.</span>
      </label>
      {state.message ? <Alert variant="warning" live="assertive">{state.message}</Alert> : null}
      <Button type="submit" loading={pending} disabled={pending || !requestId}>Criar cadastro histórico inativo</Button>
      <p className={styles.note}>Não cria login, senha, convite, acompanhamento, arquivos nem liberação de conteúdo.</p>
    </form>
  );
}
