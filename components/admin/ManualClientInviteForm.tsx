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
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? (
        <Alert
          live="polite"
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
            inputMode="email"
            name="email"
            required
            type="email"
          />
        )}
      </FormField>

      <Button loading={isPending} type="submit">
        Gerar link de ativação
      </Button>

      {state.activationLink ? (
        <div className={styles.linkPanel}>
          <label className={styles.linkLabel} htmlFor="manual-activation-link">
            Link individual de ativação
          </label>
          <textarea
            className={styles.linkValue}
            id="manual-activation-link"
            readOnly
            rows={4}
            value={state.activationLink}
          />
          <div className={styles.linkActions}>
            <Button onClick={copyActivationLink} type="button" variant="secondary">
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
            Copie e envie este link somente para a cliente cujo email foi
            informado acima. O link não deve ser publicado ou compartilhado com
            terceiros.
          </p>
        </div>
      ) : null}
    </form>
  );
}
