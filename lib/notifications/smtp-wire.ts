import type { TLSSocket } from "node:tls";

// The protocol has no network endpoint or credential lookup; the caller owns the socket.
export type SmtpConfig = {
  appPassword: string;
  fromEmail: string;
  fromName: string;
};

export type SendEmailInput = {
  bodyText: string;
  messageId: string;
  subject: string;
  to: string;
};

type SmtpResponse = {
  code: number;
  lines: string[];
};


function encodeHeader(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) {
    return value;
  }

  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

export function validateMailbox(value: string, label: string) {
  if (
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
    /[\r\n]/.test(value)
  ) {
    throw new Error(`${label} is invalid`);
  }

  return value;
}


class SmtpConnection {
  private buffer = "";
  private pending:
    | {
        reject: (error: Error) => void;
        resolve: (response: SmtpResponse) => void;
      }
    | null = null;

  constructor(private readonly socket: TLSSocket) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      this.buffer += chunk;
      this.flush();
    });
    socket.on("error", (error) => {
      if (this.pending) {
        const pending = this.pending;
        this.pending = null;
        pending.reject(error);
      }
    });
  }

  private flush() {
    if (!this.pending) return;

    const normalized = this.buffer.replace(/\r\n/g, "\n");
    const lines = normalized.split("\n");
    const completeLines = lines.slice(0, -1);

    if (completeLines.length === 0) return;

    const last = completeLines[completeLines.length - 1];
    const match = /^(\d{3}) /.exec(last);

    if (!match) return;

    const code = Number(match[1]);
    const consumed = completeLines.join("\r\n") + "\r\n";
    this.buffer = this.buffer.slice(consumed.length);

    const pending = this.pending;
    this.pending = null;
    pending.resolve({ code, lines: completeLines });
  }

  read(): Promise<SmtpResponse> {
    if (this.pending) {
      throw new Error("SMTP response already pending");
    }

    return new Promise((resolve, reject) => {
      this.pending = { reject, resolve };
      this.flush();
    });
  }

  async command(command: string, expected: number | number[]) {
    if (/\r|\n/.test(command)) {
      throw new Error("SMTP command contains newline");
    }

    this.socket.write(command + "\r\n");
    const response = await this.read();
    const expectedCodes = Array.isArray(expected) ? expected : [expected];

    if (!expectedCodes.includes(response.code)) {
      throw new Error(
        `SMTP command failed with code ${response.code}: ${response.lines.join(" ")}`,
      );
    }

    return response;
  }

  writeData(data: string) {
    this.socket.write(data);
  }

  end() {
    this.socket.end();
  }
}

function dotStuff(value: string) {
  return value
    .replace(/\r?\n/g, "\r\n")
    .replace(/^\./gm, "..");
}


export function prepareSmtpMessage(config: SmtpConfig, input: SendEmailInput) {
  const to = validateMailbox(input.to.trim(), "recipient");
  const from = validateMailbox(config.fromEmail, "sender");
  if (!input.subject.trim() || input.subject.length > 200 || /[\r\n]/.test(input.subject)) {
    throw new Error("Email subject is invalid");
  }
  if (!/^<[A-Za-z0-9._@-]+>$/.test(input.messageId) || input.messageId.length > 200) {
    throw new Error("Email Message-ID is invalid");
  }
  const message = [
    `From: ${encodeHeader(config.fromName)} <${from}>`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(input.subject.trim())}`,
    `Message-ID: ${input.messageId}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.bodyText),
    "",
    ".",
    "",
  ].join("\r\n");
  return { from, to, message };
}

export async function speakSmtpOnTrustedSocket(
  socket: TLSSocket,
  config: SmtpConfig,
  prepared: ReturnType<typeof prepareSmtpMessage>,
) {
  const smtp = new SmtpConnection(socket);
  const greeting = await smtp.read();
  if (greeting.code !== 220) throw new Error(`Unexpected SMTP greeting: ${greeting.code}`);
  await smtp.command("EHLO projeto-patty", 250);
  await smtp.command("AUTH LOGIN", 334);
  await smtp.command(Buffer.from(config.fromEmail).toString("base64"), 334);
  await smtp.command(Buffer.from(config.appPassword).toString("base64"), 235);
  await smtp.command(`MAIL FROM:<${prepared.from}>`, 250);
  await smtp.command(`RCPT TO:<${prepared.to}>`, [250, 251]);
  await smtp.command("DATA", 354);
  smtp.writeData(prepared.message);
  const accepted = await smtp.read();
  if (accepted.code !== 250) {
    throw new Error(`SMTP DATA failed with code ${accepted.code}: ${accepted.lines.join(" ")}`);
  }
  try {
    await smtp.command("QUIT", 221);
  } catch {
    // DATA was accepted: a failure during QUIT must not request a duplicate send.
  }
  return { providerMessageId: accepted.lines.join(" ").slice(0, 255) };
}
