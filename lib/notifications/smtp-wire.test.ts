import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import tls from "node:tls";
import test from "node:test";
import { prepareSmtpMessage, speakSmtpOnTrustedSocket } from "./smtp-wire.ts";

const config = {
  appPassword: "synthetic-app-password",
  fromEmail: "patty@example.invalid",
  fromName: "Consultoria Corpo e Mente",
};
const input = {
  to: "cliente@example.invalid",
  subject: "Lembrete do seu Feedback Semanal",
  messageId: "<synthetic-notification@example.invalid>",
  bodyText: "Período sintético: 05/10/2026 a 11/10/2026\n.Linha iniciada com ponto",
};

test("SMTP TLS loopback receives synthetic envelope, UTF-8 body and dot-stuffing", async () => {
  const temp = mkdtempSync(join(tmpdir(), "patty-smtp-"));
  let server: tls.Server | undefined;
  let client: tls.TLSSocket | undefined;
  try {
    const key = join(temp, "key.pem");
    const cert = join(temp, "cert.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
      "-keyout", key, "-out", cert, "-days", "1",
      "-subj", "/CN=localhost"], { stdio: "ignore" });
    const commands: string[] = [];
    const dataLines: string[] = [];
    let stage = "greeting";
    server = tls.createServer({
      key: readFileSync(key), cert: readFileSync(cert),
    }, socket => {
      socket.write("220 local-smtp.test ESMTP ready\r\n");
      let buffer = "";
      socket.setEncoding("utf8");
      socket.on("data", chunk => {
        buffer += chunk;
        while (buffer.includes("\r\n")) {
          const index = buffer.indexOf("\r\n");
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          if (stage === "data") {
            if (line === ".") {
              stage = "accepted";
              socket.write("250 2.0.0 queued-local\r\n");
            } else dataLines.push(line);
            continue;
          }
          commands.push(line);
          if (line.startsWith("EHLO ")) socket.write("250-localhost\r\n250 AUTH LOGIN\r\n");
          else if (line === "AUTH LOGIN") socket.write("334 VXNlcm5hbWU6\r\n");
          else if (line === Buffer.from(config.fromEmail).toString("base64")) socket.write("334 UGFzc3dvcmQ6\r\n");
          else if (line === Buffer.from(config.appPassword).toString("base64")) socket.write("235 2.7.0 authenticated\r\n");
          else if (line.startsWith("MAIL FROM:")) socket.write("250 ok\r\n");
          else if (line.startsWith("RCPT TO:")) socket.write("250 ok\r\n");
          else if (line === "DATA") {
            stage = "data";
            socket.write("354 send data\r\n");
          } else if (line === "QUIT") {
            socket.write("221 bye\r\n");
            socket.end();
          } else socket.write("500 unexpected\r\n");
        }
      });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    // Only the test uses an ephemeral self-signed cert; production always verifies Gmail TLS.
    client = tls.connect({ host: "127.0.0.1", port: address.port, rejectUnauthorized: false });
    await once(client, "secureConnect");
    const outcome = await speakSmtpOnTrustedSocket(client, config, prepareSmtpMessage(config, input));
    assert.match(outcome.providerMessageId, /queued-local/);
    assert.ok(commands.includes("MAIL FROM:<patty@example.invalid>"));
    assert.ok(commands.includes("RCPT TO:<cliente@example.invalid>"));
    assert.ok(commands.includes("DATA"));
    assert.ok(commands.includes("QUIT"));
    assert.ok(dataLines.includes("..Linha iniciada com ponto"));
    assert.ok(dataLines.join("\n").includes("Período sintético: 05/10/2026 a 11/10/2026"));
    assert.ok(!dataLines.join("\n").includes(config.appPassword));
  } finally {
    client?.destroy();
    server?.close();
    rmSync(temp, { recursive: true, force: true });
  }
});

test("invalid envelope and header are rejected before opening a connection", () => {
  for (const invalid of [
    { ...input, to: "not-a-mailbox" },
    { ...input, subject: "safe\r\nBcc:someone@example.invalid" },
    { ...input, messageId: "<bad\r\n>" },
  ]) {
    assert.throws(() => prepareSmtpMessage(config, invalid));
  }
});
