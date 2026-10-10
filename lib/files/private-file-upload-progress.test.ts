import assert from "node:assert/strict";
import test from "node:test";
import { privateFileUploadProgressMessage } from "./private-file-upload-progress.ts";

test("private file upload phases never describe an unfinished upload as accepted", () => {
  const expected = [
    ["authorizing", "Preparando autorização privada do arquivo..."],
    ["transferring", "Transferindo arquivo para a área privada..."],
    ["verifying", "Validando o conteúdo e registrando o arquivo..."],
  ] as const;
  for (const [phase, message] of expected) {
    assert.equal(privateFileUploadProgressMessage(phase), message);
    assert.ok(!message.includes("concluído"));
    assert.ok(!message.includes("liberado"));
  }
  assert.equal(privateFileUploadProgressMessage(null), null);
});
