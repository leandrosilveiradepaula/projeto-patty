export type AdminFeedbackReminderEvent = {
  channel_key: string | null;
  delivery_state: string;
};

export type AdminFeedbackReminderDisplay = {
  label: string;
  nextStep?: {
    anchor: "cadastro-atual" | "preferencia-feedback";
    label: string;
  };
};

/**
 * These labels describe persisted delivery events, not inbox receipt.
 * A link is only shown when an existing client workspace form can help.
 */
export function describeAdminFeedbackReminder(
  event: AdminFeedbackReminderEvent | null | undefined,
): AdminFeedbackReminderDisplay | null {
  if (!event) return null;

  if (event.delivery_state === "delivered" && event.channel_key === "in_app") {
    return { label: "Lembrete disponível no app" };
  }

  if (event.delivery_state === "delivered" && event.channel_key === "email") {
    return { label: "Envio aceito pelo SMTP; recebimento do email não confirmado" };
  }

  if (event.delivery_state === "queued_external" && event.channel_key === "email") {
    return { label: "Lembrete por email aguardando envio" };
  }

  if (event.delivery_state === "delivery_failed" && event.channel_key === "email") {
    return { label: "Falha no envio do lembrete por email" };
  }

  if (event.delivery_state === "blocked_no_channel") {
    return {
      label: "Lembrete bloqueado: canal não configurado",
      nextStep: { anchor: "preferencia-feedback", label: "Configurar canal" },
    };
  }

  if (event.delivery_state === "blocked_missing_contact") {
    return {
      label:
        event.channel_key === "email"
          ? "Lembrete bloqueado: email de contato ausente"
          : "Lembrete bloqueado: telefone ausente",
      nextStep: { anchor: "cadastro-atual", label: "Completar contato" },
    };
  }

  if (event.delivery_state === "blocked_provider") {
    if (event.channel_key === "email") {
      return { label: "Email configurado; envio externo ainda não concluído" };
    }

    return {
      label: "WhatsApp configurado; provedor externo ainda não ativado",
      nextStep: { anchor: "preferencia-feedback", label: "Rever canal" },
    };
  }

  return { label: "Lembrete registrado" };
}
