import assert from "node:assert/strict";
import test from "node:test";

import { parseClientRegistrationForm } from "./registration.ts";

function form(values: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}

test("Cadastro Atual trims fields and keeps blank values nullable", () => {
  const result = parseClientRegistrationForm(
    form({
      city: "  Porto Alegre ",
      phone: "",
      contactEmail: " contato@example.com ",
      instagram: " @perfil ",
    }),
  );

  assert.deepEqual(result, {
    ok: true,
    value: {
      city: "Porto Alegre",
      phone: null,
      contactEmail: "contato@example.com",
      instagram: "@perfil",
    },
  });
});

test("Cadastro Atual rejects invalid contact email without touching login identity", () => {
  const result = parseClientRegistrationForm(
    form({
      city: "Porto Alegre",
      phone: "51999999999",
      contactEmail: "invalido",
      instagram: "",
    }),
  );

  assert.deepEqual(result, {
    ok: false,
    message: "Informe um email de contato válido.",
  });
});
