import "server-only";
import tls from "node:tls";
import { prepareSmtpMessage, speakSmtpOnTrustedSocket, type SmtpConfig, type SendEmailInput } from "./smtp-wire";

export function getGmailSmtpConfig(): SmtpConfig | null {
  const fromEmail = process.env.GMAIL_SMTP_USER?.trim();
  const appPassword = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s+/g, "");
  const fromName =
    process.env.GMAIL_SMTP_FROM_NAME?.trim() ||
    "Consultoria Corpo e Mente - Patty";

  if (!fromEmail || !appPassword) {
    return null;
  }

  validateMailbox(fromEmail, "GMAIL_SMTP_USER");

  if (appPassword.length < 12 || /[\r\n]/.test(appPassword)) {
    throw new Error("GMAIL_SMTP_APP_PASSWORD is invalid");
  }

  if (!fromName || fromName.length > 120 || /[\r\n]/.test(fromName)) {
    throw new Error("GMAIL_SMTP_FROM_NAME is invalid");
  }

  return { appPassword, fromEmail, fromName };
}


export async function sendGmailSmtpEmail(config: SmtpConfig, input: SendEmailInput) {
  // Validate the entire envelope and payload before opening a network connection.
  const prepared = prepareSmtpMessage(config, input);
  // This is deliberately NOT configurable via a request, env or test argument.
  const socket = tls.connect({
    host: "smtp.gmail.com", port: 465,
    rejectUnauthorized: true, servername: "smtp.gmail.com",
  });
  socket.setTimeout(15_000, () => socket.destroy(new Error("SMTP connection timeout")));
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
    return await speakSmtpOnTrustedSocket(socket, config, prepared);
  } finally {
    socket.end();
  }
}
