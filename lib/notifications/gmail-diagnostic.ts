import "server-only";

import { randomUUID } from "node:crypto";
import { getGmailSmtpConfig, sendGmailSmtpEmail } from "./gmail-smtp";
import { validateMailbox } from "./smtp-wire";

export async function sendIsolatedGmailDiagnostic() {
  const config = getGmailSmtpConfig();
  const recipient = process.env.GMAIL_SMTP_TEST_RECIPIENT?.trim();
  if (!config || !recipient) return { state: "not_configured" as const };
  // The recipient is an operator-controlled environment variable, never a request value.
  validateMailbox(recipient, "GMAIL_SMTP_TEST_RECIPIENT");
  const reference = randomUUID();
  try {
    await sendGmailSmtpEmail(config, {
      to: recipient,
      subject: "Projeto Patty — diagnóstico SMTP",
      messageId: `<${reference}@patty-diagnostic.invalid>`,
      bodyText: `Teste sintético de entrega SMTP do Projeto Patty.\nReferência: ${reference}\nSem dados de clientes.\n`,
    });
    return { state: "accepted" as const, reference };
  } catch {
    // Never return provider details, recipient, credentials or payload.
    return { state: "failed" as const, reference };
  }
}
