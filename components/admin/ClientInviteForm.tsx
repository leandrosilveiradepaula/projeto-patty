"use client";

import { validateInvitationDraft } from "@/lib/onboarding/validation";

import { useActionState, useRef, useEffect, useState } from "react";

import {
  type InviteClientState,
  inviteClient,
} from "@/app/admin/clientes/nova/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./ClientInviteForm.module.css";

const initialState: InviteClientState = { message: null };

export function ClientInviteForm({ onProvisioningAttempt }: { onProvisioningAttempt?: () => void } = {}) {
  const [state, formAction, isPending] = useActionState(
    inviteClient,
    initialState,
  );

  const [confirmed,setConfirmed] = useState(false);
  const [draft,setDraft] = useState({displayName:"",email:""});
  const validation=validateInvitationDraft(draft);
  const [fieldErrors,setFieldErrors] = useState(false);
  const inFlightRef = useRef(false);
  useEffect(() => {
    inFlightRef.current = false;
  }, [state]);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className={styles.form}
      onSubmit={(event) => {
        if (inFlightRef.current || isPending || !validation.ok || !confirmed) {
          setFieldErrors(true);
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
        onProvisioningAttempt?.();
      }}
    >
      <input type="hidden" name="confirmNewClient" value={confirmed?"yes":"no"} />
      {state.message ? (
        <Alert
          live="assertive"
          title="Não foi possível concluir"
          variant="critical"
        >
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Nome usado para identificar a cliente no painel da Patty."
        id="client-invitation-display-name"
        label="Nome da cliente"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="name"
            disabled={isPending}
            maxLength={120}
            minLength={2}
            name="displayName"
            value={draft.displayName}
            onChange={event=>{setDraft(previous=>({...previous,displayName:event.target.value}));setFieldErrors(false);}}
            aria-invalid={fieldErrors && !validation.ok && validation.field==="displayName"}
            required
            type="text"
          />
        )}
      </FormField>

      <FormField
        description="Este procedimento cria uma nova conta. Não use para reenviar convite ou recuperar conta existente. Esse endereço será usado como email de autenticação. O email de contato da cliente continua sendo um dado cadastral separado."
        id="client-invitation-email"
        label="Email da cliente"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="email"
            inputMode="email"
            disabled={isPending}
            maxLength={254}
            name="email"
            value={draft.email}
            onChange={event=>{setDraft(previous=>({...previous,email:event.target.value}));setFieldErrors(false);}}
            aria-invalid={fieldErrors && !validation.ok && validation.field==="email"}
            required
            type="email"
          />
        )}
      </FormField>

      {fieldErrors && !validation.ok ? <p role="alert">{validation.message}</p> : null}
      <label style={{display:"flex",gap:"0.75rem",alignItems:"flex-start"}}>
        <input type="checkbox" checked={confirmed} disabled={isPending} onChange={event=>setConfirmed(event.target.checked)} />
        Confirmo que este é um cadastro novo, não um reenvio ou recuperação de acesso.
      </label>
      {state.message && state.retryable ? <p role="status">Validação concluída antes de criar a identidade. Corrija os campos e tente novamente.</p> : null}
      {isPending ? <p role="status">Verificando o acesso da cliente…</p> : null}
      <Button disabled={isPending || !confirmed || !validation.ok} loading={isPending} type="submit">
        Criar cliente e enviar convite
      </Button>
    </form>
  );
}
