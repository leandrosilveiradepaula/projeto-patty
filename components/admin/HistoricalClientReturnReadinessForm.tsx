"use client";

import { useActionState } from "react";
import { inspectHistoricalClientReturnAction, type HistoricalReturnReadinessActionState } from "@/app/admin/clientes/[clienteId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./HistoricalClientReturnReadinessForm.module.css";

const reasonLabels: Record<string, string> = {
  invalid_client_id: "O identificador confirmado não corresponde ao cadastro.",
  missing_human_identity_review: "A conferência humana da identidade não foi confirmada.",
  invalid_snapshot: "Os dados consultados estão inconsistentes.",
  duplicate_client: "Há registros duplicados na consulta.",
  client_not_found: "O cadastro não foi encontrado ou não está acessível.",
  not_inactive: "Este cadastro não está inativo.",
  already_linked: "Este cadastro já possui uma identidade de acesso vinculada.",
  active_assignment: "Existe um acompanhamento ativo para este cadastro.",
  invalid_profile_id: "A identidade proposta não é válida.",
  profile_already_used: "A identidade de acesso já está vinculada a outra cliente.",
};

const initialState: HistoricalReturnReadinessActionState = { status: "idle", reasons: [] };

export function HistoricalClientReturnReadinessForm({ clientId }: { clientId: string }) {
  const [state, submit, pending] = useActionState(
    inspectHistoricalClientReturnAction.bind(null, clientId), initialState,
  );

  return (
    <form action={submit} className={styles.form}>
      <p className={styles.note}>
        Esta conferência usa o estado atual do banco. Ela não comprova a identidade
        por conta própria e não cria conta, senha, vínculo ou acompanhamento.
      </p>
      <label htmlFor="historical-return-confirmed-id" className={styles.label}>
        Confirme o ID do cadastro existente
      </label>
      <TextInput
        id="historical-return-confirmed-id"
        name="confirmedClientId"
        required
        autoComplete="off"
        spellCheck={false}
        aria-describedby="historical-return-id-instructions"
        placeholder="Cole o ID da cliente já conferida"
      />
      <p id="historical-return-id-instructions" className={styles.note}>
        Copie o identificador exibido abaixo. A confirmação não pode ser feita por nome ou e-mail.
      </p>
      <code className={styles.identifier}>{clientId}</code>
      <label className={styles.confirmation}>
        <input type="checkbox" name="identityReviewedByHuman" value="yes" required />
        <span>Conferi manualmente a identidade e confirmei que este é o cadastro histórico correto, sem associar automaticamente dados de outra pessoa.</span>
      </label>
      <Button type="submit" loading={pending} disabled={pending}>
        Conferir condições do retorno
      </Button>
      {state.status === "unavailable" ? (
        <Alert variant="warning" live="polite">
          Não foi possível atualizar a verificação. Nenhuma alteração foi realizada. Confira novamente antes de prosseguir.
        </Alert>
      ) : state.status === "blocked" ? (
        <Alert variant="warning" title="Retorno bloqueado para revisão" live="polite">
          <ul className={styles.reasons}>
            {state.reasons.map((reason) => <li key={reason}>{reasonLabels[reason] ?? "Pendência de validação."}</li>)}
          </ul>
          Nenhum acesso foi ativado.
        </Alert>
      ) : state.status === "pending_authorized_backend_verification" ? (
        <Alert variant="info" title="Pré-conferência sem bloqueios identificados" live="polite">
          O cadastro está inativo, sem perfil de acesso vinculado e sem acompanhamento ativo.
          Ainda são obrigatórios a validação autorizada da identidade, a conclusão do Cadastro Atual
          e a ativação segura de login e senha no mesmo cadastro. Nenhum acesso foi criado.
        </Alert>
      ) : null}
    </form>
  );
}
