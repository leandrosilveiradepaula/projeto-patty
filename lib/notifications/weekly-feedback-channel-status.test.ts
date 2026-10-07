import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(
  path.join(root, "components/admin/AdminWeeklyFeedbackNotificationPreferenceForm.tsx"),
  "utf8",
);

test("weekly feedback admin status does not claim email delivery is unimplemented", () => {
  assert.match(source, /possui a esteira de entrega/);
  assert.match(source, /configuração SMTP do ambiente/);
  assert.doesNotMatch(
    source,
    /Email selecionado\. O provedor de envio externo ainda não está ativado\./,
  );
  assert.match(source, /WhatsApp selecionado\. O provedor externo ainda não está ativado\./);
});
