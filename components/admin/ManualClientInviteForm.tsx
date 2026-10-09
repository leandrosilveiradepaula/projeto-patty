"use client";

import { useActionState, useState } from "react";

import {
  type ManualInviteClientState,
  generateManualClientInvite,
} from "@/app/admin/clientes/nova/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./ManualClientInviteForm.module.css";

const initialState: ManualInviteClientState = {
  activationLink: null,
  clientId: null,
  message: null,
  success: false,
};

export function ManualClientInviteForm() {
  const [state, formAction, isPending] = useActionState(
    generateManualClientInvite,
    initialState,
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  async function copyActivationLink() {
    if (!state.activationLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.activationLink);
      setCopyStatus("Link copiado.");
    } catch {
      setCopyStatus(
        "Não foi possível copiar automaticamente. Selecione o link abaixo e copie manualmente.",
      );
    }
  }

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Link gerado" : "Não foi possível gerar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Nome usado para identificar a cliente no painel da Patty."
        id="manual-client-invitation-display-name"
        label="Nome da cliente"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="name"
            disabled={state.success}
            maxLength={120}
            name="displayName"
            required
            type="text"
          />
        )}
      </FormField>

      <FormField
        description="O endereço é usado somente para criar a identidade de acesso. O email de contato continua separado."
        id="manual-client-invitation-email"
        label="Email da cliente"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="email"
            disabled={state.success}
            inputMode="email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        )}
      </FormField>

      <Button disabled={state.success} loading={isPending} type="submit">
        Gerar link de ativação
      </Button>

      {state.activationLink ? (
        <div className={styles.linkPanel}>
          <label className={styles.linkLabel} htmlFor="manual-activation-link">
            Link individual de ativação — acesso sensível
          </label>
          <textarea
            className={styles.linkValue}
            id="manual-activation-link"
            readOnly
            rows={4}
            value={state.activationLink}
          />
          <div className={styles.linkActions}>
            <Button disabled={isPending} onClick={copyActivationLink} type="button" variant="secondary">
              Copiar link
            </Button>
            {copyStatus ? (
              <p aria-live="polite" className={styles.copyStatus}>
                {copyStatus}
              </p>
            ) : null}
          </div>
          {state.clientId ? (
            <Link
              className={styles.clientLink}
              href={`/admin/clientes/${state.clientId}?onboarding=link-generated`}
            >
              Abrir acompanhamento desta cliente
            </Link>
          ) : null}
          <p className={styles.note}>
            O link permite ativar a conta e deve ser tratado como credencial temporária. Não salve em anotações públicas, capturas de tela ou mensagens de grupo. Copie e envie somente para a cliente cujo email foi
            informado acima. O link não deve ser publicado ou compartilhado com
            terceiros. Se o link expirar ou a conta já existir, não crie outro cadastro: use o fluxo de recuperação de acesso.
          </p>
        </div>
      ) : null}
    </form>
  );
}
