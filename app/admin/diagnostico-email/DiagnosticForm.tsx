"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { runEmailDiagnostic, type DiagnosticState } from "./actions";

const initialState: DiagnosticState = { result: "idle", reference: null };

export function DiagnosticForm() {
  const [state, action, pending] = useActionState(runEmailDiagnostic, initialState);
  return (
    <form action={action}>
      <p>O destinatário é definido no servidor. Este teste não consulta clientes nem executa a fila de lembretes.</p>
      <Button type="submit" disabled={pending}>Enviar um único e-mail sintético</Button>
      {state.result === "accepted" ? (
        <p role="status">Gmail aceitou a mensagem. Confirme o recebimento na caixa de testes. Referência: {state.reference}</p>
      ) : state.result === "failed" ? (
        <p role="alert">O Gmail não confirmou o aceite da mensagem. Referência: {state.reference}</p>
      ) : state.result === "not_configured" ? (
        <p role="alert">A caixa de teste ou o transporte SMTP não está configurado.</p>
      ) : null}
    </form>
  );
}
