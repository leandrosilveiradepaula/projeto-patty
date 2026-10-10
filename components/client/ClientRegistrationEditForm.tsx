"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type ClientRegistrationFormState,
  updateCurrentClientRegistrationAction,
} from "@/app/cliente/perfil/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./ClientRegistrationEditForm.module.css";

const initialState: ClientRegistrationFormState = {
  message: null,
  success: false,
};

type ClientRegistrationEditFormProps = {
  city?: string;
  contactEmail?: string;
  instagram?: string;
  phone?: string;
};

export function ClientRegistrationEditForm({
  city,
  contactEmail,
  instagram,
  phone,
}: ClientRegistrationEditFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateCurrentClientRegistrationAction,
    initialState,
  );

  const router = useRouter();
  const inFlightRef = useRef(false);
  const [editedSinceResult, setEditedSinceResult] = useState(false);

  useEffect(() => {
    inFlightRef.current = false;
    if (state.success) {
      setEditedSinceResult(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className={styles.form}
      onChange={() => setEditedSinceResult(true)}
      onSubmit={(event) => {
        if (inFlightRef.current || isPending) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }}
    >
      {state.message && !editedSinceResult ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Cadastro atualizado" : "Não foi possível atualizar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <div className={styles.grid}>
        <FormField id="registration-city" label="Cidade">
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              disabled={isPending}
              defaultValue={city}
              maxLength={120}
              name="city"
            />
          )}
        </FormField>

        <FormField id="registration-phone" label="Telefone">
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              disabled={isPending}
              defaultValue={phone}
              inputMode="tel"
              maxLength={40}
              name="phone"
            />
          )}
        </FormField>

        <FormField
          description="Pode coincidir com o email de acesso, mas continua sendo um dado de contato separado."
          id="registration-contact-email"
          label="Email de contato"
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              disabled={isPending}
              defaultValue={contactEmail}
              maxLength={254}
              name="contactEmail"
              type="email"
            />
          )}
        </FormField>

        <FormField
          description="Dado informativo. Não é enviado à IA por padrão."
          id="registration-instagram"
          label="Instagram"
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              disabled={isPending}
              defaultValue={instagram}
              maxLength={100}
              name="instagram"
            />
          )}
        </FormField>
      </div>

      <p className={styles.notice}>
        Este formulário altera somente o Cadastro Atual. Ele não modifica
        respostas históricas da Anamnese nem o email usado para entrar na conta.
      </p>

      <Button disabled={isPending} loading={isPending} type="submit">
        Salvar Cadastro Atual
      </Button>
    </form>
  );
}
