import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const email = process.env.E2E_CLIENT_EMAIL;
const password = process.env.E2E_CLIENT_PASSWORD;

if (!baseUrl || !email || !password) {
  throw new Error(
    "Missing E2E_BASE_URL, E2E_CLIENT_EMAIL or E2E_CLIENT_PASSWORD",
  );
}

test.use({
  acceptDownloads: true,
  baseURL: baseUrl,
});

const syntheticFileName = "e2e-private-file-smoke.png";
const syntheticPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZcokAAAAASUVORK5CYII=",
  "base64",
);

test("cliente consegue autenticar, enviar, listar e baixar arquivo privado", async ({
  page,
}) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/cliente\/?$/);
  await expect(
    page.getByRole("heading", { name: "Área da cliente" }),
  ).toBeVisible();

  await page.goto("/cliente/arquivos");
  await expect(
    page.getByRole("heading", { name: "Meus arquivos" }),
  ).toBeVisible();

  const existingFile = page.getByRole("heading", {
    exact: true,
    name: syntheticFileName,
  });

  if ((await existingFile.count()) === 0) {
    await page.locator('input[type="file"]').setInputFiles({
      buffer: syntheticPng,
      mimeType: "image/png",
      name: syntheticFileName,
    });

    await page.getByRole("button", { name: "Enviar arquivo" }).click();

    await expect(
      page.getByText("Arquivo enviado e validado com sucesso."),
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByRole("heading", {
        exact: true,
        name: syntheticFileName,
      }),
    ).toBeVisible({ timeout: 30_000 });
  }

  const fileCard = page
    .locator("li")
    .filter({
      has: page.getByRole("heading", {
        exact: true,
        name: syntheticFileName,
      }),
    })
    .first();

  await expect(fileCard).toContainText("Foto");
  await expect(fileCard).toContainText("image/png");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    fileCard.getByRole("link", { name: "Baixar arquivo" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe(syntheticFileName);
  expect(await download.failure()).toBeNull();
});
