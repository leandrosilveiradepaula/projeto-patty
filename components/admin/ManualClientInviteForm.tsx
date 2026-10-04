"use client";

import { useActionState } from "react";

import {
  type ManualInviteClientState,
  generateManualClientInvite,
} from "@/app/admin/clientes/nova/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./ManualClientInviteForm.module.css";

const initialState: ManualInviteClientState = {
  activationLink: null,
  message: null,
  success: false,
};

export function ManualClientInviteForm() {
  const [state, formAction, isPending] = useActionState(
    generateManualClientInvite,
    initialState,
  );

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
