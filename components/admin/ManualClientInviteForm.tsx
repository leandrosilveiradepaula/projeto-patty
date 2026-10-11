import { validateInvitationDraft } from "@/lib/onboarding/validation";
"use client";

import { useActionState, useState, useRef, useEffect } from "react";

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

export function ManualClientInviteForm({ onProvisioningAttempt }: { onProvisioningAttempt?: () => void } = {}) {
  const [state, formAction, isPending] = useActionState(
    generateManualClientInvite,
    initialState,
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const linkFieldRef = useRef<HTMLTextAreaElement>(null);

  async function copyActivationLink() {
    if (!state.activationLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.activationLink);
      setCopyStatus("Link copiado.");
    } catch {
      linkFieldRef.current?.focus();
      linkFieldRef.current?.select();
      setCopyStatus(
        "Não foi possível copiar automaticamente. Selecione o link abaixo e copie manualmente.",
      );
    }
  }

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
        if (inFlightRef.current || isPending || state.success || !validation.ok || !confirmed) {
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
            disabled={state.success || isPending}
            maxLength={120}
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
        description="O endereço é usado somente para criar a identidade de acesso. O email de contato continua separado."
        id="manual-client-invitation-email"
        label="Email da cliente"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="email"
            disabled={state.success || isPending}
            inputMode="email"
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
        <input type="checkbox" checked={confirmed} disabled={isPending || state.success} onChange={event=>setConfirmed(event.target.checked)} />
        Confirmo que este é um cadastro novo, não um reenvio ou recuperação de acesso.
      </label>
      {state.message && state.retryable ? <p role="status">Validação concluída antes de criar a identidade. Corrija os campos e tente novamente.</p> : null}
      {isPending ? <p role="status">Verificando o acesso da cliente…</p> : null}
      <Button disabled={state.success || isPending || !confirmed || !validation.ok} loading={isPending} type="submit">
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
            ref={linkFieldRef}
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
