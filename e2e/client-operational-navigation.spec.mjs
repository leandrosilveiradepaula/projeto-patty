import { expect, test } from "@playwright/test";
import {
  clientAreasFromMore,
  clientDirectJourneyAreas,
} from "./helpers/client-journey-routes.mjs";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const email = process.env.E2E_CANONICAL_EMAIL;
const password = process.env.E2E_CANONICAL_PASSWORD;

if (!baseUrl || !email || !password) {
  throw new Error("Missing client journey E2E environment.");
}

// Never run this suite against a real client's account.
if (!/^e2e-canonical-[0-9a-f]+@example\.invalid$/.test(email)) {
  throw new Error("Client journey smoke requires the ephemeral canonical E2E client.");
}

test.use({ baseURL: baseUrl });

test("cliente sintetica percorre a navegação real após login, sem publicar nem criar histórico", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await test.step("autenticar e alcançar a ação principal", async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/cliente\/?$/);
    await expect(page.getByRole("heading", { name: "Área da cliente" })).toBeVisible();
    const nextAction = page.getByRole("link", { name: /Preencher Anamnese/ });
    await expect(nextAction).toBeVisible();
    await nextAction.click();
    await expect(page).toHaveURL(/\/cliente\/anamnese\/?$/);
    await expect(page.getByRole("heading", { name: "Anamnese", exact: true })).toBeVisible();
  });

  await test.step("navegar pelos acessos reais em Mais", async () => {
    for (const area of clientAreasFromMore) {
      await page.goto("/cliente/mais");
      await expect(page.getByRole("heading", { name: "Mais", exact: true })).toBeVisible();
      await page.getByRole("link", { name: new RegExp(area.linkName) }).click();
      await expect(page).toHaveURL(new RegExp(area.path + "/?$"));
      await expect(page.getByRole("heading", { name: area.heading, exact: true, level: 1 })).toBeVisible();
    }
  });

  await test.step("salvar Cadastro Atual, recarregar e confirmar persistência real", async () => {
    await page.goto("/cliente/perfil");
    const city = page.getByLabel("Cidade");
    await city.fill("Cidade Sintetica E2E");
    await page.getByRole("button", { name: "Salvar Cadastro Atual" }).click();
    await expect(page.getByText("Cadastro atualizado")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Cidade")).toHaveValue("Cidade Sintetica E2E");

    await page.goto("/cliente");
    await page.goto("/cliente/perfil");
    await expect(page.getByLabel("Cidade")).toHaveValue("Cidade Sintetica E2E");
  });

  await test.step("consultar áreas do acompanhamento com dados ainda não liberados", async () => {
    for (const area of clientDirectJourneyAreas) {
      const response = await page.goto(area.path);
      expect(response?.status(), area.path).toBe(200);
      await expect(page.getByRole("heading", { name: area.heading, exact: true, level: 1 })).toBeVisible();
      if (area.emptyHeading) {
        await expect(page.getByRole("heading", { name: area.emptyHeading, exact: true })).toBeVisible();
      }
    }
  });

  await test.step("rascunho profissional não aparece à cliente sem publicação", async () => {
    const response = await page.goto("/cliente/protocolo");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Nenhum protocolo foi publicado para você" })).toBeVisible();
    await expect(page.getByText("Protocolo atual")).toHaveCount(0);
  });

  await test.step("confirmar que registros profissionais não aparecem sem publicação", async () => {
    const assessments = await page.goto("/cliente/avaliacoes");
    expect(assessments?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Nenhuma avaliação disponível" })).toBeVisible();

    const progress = await page.goto("/cliente/evolucao");
    expect(progress?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Evolução ainda indisponível" })).toBeVisible();
  });
});
