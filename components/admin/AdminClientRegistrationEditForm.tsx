"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type AdminClientRegistrationFormState,
  updateAdminClientRegistrationAction,
} from "@/app/admin/clientes/[clienteId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./AdminClientRegistrationEditForm.module.css";

const initialState: AdminClientRegistrationFormState = {
  message: null,
  success: false,
};

type AdminClientRegistrationEditFormProps = {
  city?: string;
  clientId: string;
  contactEmail?: string;
  instagram?: string;
  phone?: string;
};

export function AdminClientRegistrationEditForm({
  city,
  clientId,
  contactEmail,
  instagram,
  phone,
}: AdminClientRegistrationEditFormProps) {
  const action = updateAdminClientRegistrationAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const inFlightRef = useRef(false);
  const [editedSinceResult, setEditedSinceResult] = useState(false);
  const router = useRouter();

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
        <FormField id="admin-registration-city" label="Cidade">
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

        <FormField id="admin-registration-phone" label="Telefone">
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
          description="Email operacional de contato. Não altera o email de login da cliente."
          id="admin-registration-contact-email"
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
          description="Dado informativo e fora do contexto padrão de IA."
          id="admin-registration-instagram"
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
        Esta ação altera somente o Cadastro Atual. Anamneses históricas e a
        identidade de autenticação permanecem separadas.
      </p>

      <Button disabled={isPending} loading={isPending} type="submit">
        Salvar Cadastro Atual
      </Button>
    </form>
  );
}
