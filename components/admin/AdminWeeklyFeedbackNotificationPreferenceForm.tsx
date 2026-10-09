"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  type WeeklyFeedbackNotificationPreferenceFormState,
  updateWeeklyFeedbackNotificationPreferenceAction,
} from "@/app/admin/clientes/[clienteId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import styles from "./AdminWeeklyFeedbackNotificationPreferenceForm.module.css";

const initialState: WeeklyFeedbackNotificationPreferenceFormState = {
  message: null,
  success: false,
};

type Props = {
  clientId: string;
  currentChannel?: string | null;
  currentVersionId?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
};

function channelStatus(
  channel: string | null | undefined,
  contactEmail: string | null | undefined,
  phone: string | null | undefined,
) {
  if (!channel) {
    return {
      text: "Nenhum canal foi configurado para esta cliente.",
      variant: "warning" as const,
    };
  }

  if (channel === "in_app") {
    return {
      text: "Notificação dentro do aplicativo está operacional.",
      variant: "success" as const,
    };
  }

  if (channel === "email" && !contactEmail?.trim()) {
    return {
      text: "Email selecionado, mas a cliente não possui email de contato cadastrado.",
      variant: "warning" as const,
    };
  }

  if (channel === "whatsapp" && !phone?.trim()) {
    return {
      text: "WhatsApp selecionado, mas a cliente não possui telefone cadastrado.",
      variant: "warning" as const,
    };
  }

  if (channel === "email") {
    return {
      text: "Email selecionado. O sistema possui a esteira de entrega; a disponibilidade real depende da configuração SMTP do ambiente.",
      variant: "info" as const,
    };
  }

  return {
    text: "WhatsApp selecionado. O provedor externo ainda não está ativado.",
    variant: "info" as const,
  };
}

export function AdminWeeklyFeedbackNotificationPreferenceForm({
  clientId,
  currentChannel,
  currentVersionId,
  contactEmail,
  phone,
}: Props) {
  const action = updateWeeklyFeedbackNotificationPreferenceAction.bind(
    null,
    clientId,
    currentVersionId ?? null,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);
  const status = channelStatus(currentChannel, contactEmail, phone);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Canal atualizado" : "Não foi possível atualizar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <Alert title="Situação atual" variant={status.variant}>
        {status.text}
      </Alert>

      <label className={styles.field}>
        <span>Canal do Feedback Semanal</span>
        <select
          className={styles.select}
          defaultValue={currentChannel ?? ""}
          disabled={isPending}
          key={currentVersionId ?? "unconfigured"}
          name="channel"
          required
        >
          <option disabled value="">
            Selecione
          </option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="in_app">Notificação dentro do app</option>
        </select>
      </label>

      <p className={styles.notice}>
        A escolha cria uma nova versão da preferência. Telefone e email de contato
        continuam separados desta configuração.
      </p>

      <Button loading={isPending} type="submit">
        Salvar canal
      </Button>
    </form>
  );
}
