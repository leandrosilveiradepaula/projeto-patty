import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const clientEmail = process.env.E2E_CLIENT_EMAIL;
const clientPassword = process.env.E2E_CLIENT_PASSWORD;

if (
  !baseUrl ||
  !adminEmail ||
  !adminPassword ||
  !clientEmail ||
  !clientPassword
) {
  throw new Error(
    "Missing E2E_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_CLIENT_EMAIL or E2E_CLIENT_PASSWORD",
  );
}

const syntheticFileName = "e2e-admin-private-file-smoke.png";
const syntheticPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZcokAAAAASUVORK5CYII=",
  "base64",
);

async function login(page, email, password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("admin envia arquivo oculto, libera explicitamente e cliente passa a ver", async ({
  browser,
}) => {
  const adminContext = await browser.newContext({
    acceptDownloads: true,
    baseURL: baseUrl,
  });
  const adminPage = await adminContext.newPage();

  await login(adminPage, adminEmail, adminPassword);
  await expect(adminPage).toHaveURL(/\/admin\/?$/);

  await adminPage.goto("/admin/arquivos");
  await expect(
    adminPage.getByRole("heading", { name: "Arquivos privados" }),
  ).toBeVisible();

  const clientLink = adminPage
    .getByRole("link")
    .filter({ hasText: "E2E Client" })
    .first();
  await expect(clientLink).toBeVisible();
  await clientLink.click();

  await expect(
    adminPage.getByRole("heading", { name: /Arquivos de E2E Client/ }),
  ).toBeVisible();

  let fileHeading = adminPage.getByRole("heading", {
    exact: true,
    name: syntheticFileName,
  });

  if ((await fileHeading.count()) === 0) {
    await adminPage.locator('input[type="file"]').setInputFiles({
      buffer: syntheticPng,
      mimeType: "image/png",
      name: syntheticFileName,
    });

    await adminPage.getByRole("button", { name: "Enviar arquivo" }).click();

    await expect(
      adminPage.getByText(
        "Arquivo enviado e validado. Ele permanece oculto para a cliente até liberação explícita.",
      ),
    ).toBeVisible({ timeout: 30_000 });

    fileHeading = adminPage.getByRole("heading", {
      exact: true,
      name: syntheticFileName,
    });
    await expect(fileHeading).toBeVisible({ timeout: 30_000 });
  }

  let fileCard = adminPage
    .locator("li")
    .filter({ has: fileHeading })
    .first();

  await expect(fileCard).toContainText("Upload administrativo");

  const clientContext = await browser.newContext({
    acceptDownloads: true,
    baseURL: baseUrl,
  });
  const clientPage = await clientContext.newPage();

  await login(clientPage, clientEmail, clientPassword);
  await expect(clientPage).toHaveURL(/\/cliente\/?$/);
  await clientPage.goto("/cliente/arquivos");
  await expect(
    clientPage.getByRole("heading", { name: "Meus arquivos" }),
  ).toBeVisible();

  const hiddenBeforeRelease =
    (await fileCard.getByText("Oculto para cliente", { exact: true }).count()) >
    0;

  if (hiddenBeforeRelease) {
    await expect(
      clientPage.getByRole("heading", {
        exact: true,
        name: syntheticFileName,
      }),
    ).toHaveCount(0);

    await fileCard.getByRole("button", { name: "Liberar para cliente" }).click();

    await expect(
      fileCard.getByText("Arquivo liberado para a cliente.", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await adminPage.reload();
    fileHeading = adminPage.getByRole("heading", {
      exact: true,
      name: syntheticFileName,
    });
    fileCard = adminPage
      .locator("li")
      .filter({ has: fileHeading })
      .first();
    await expect(fileCard).toContainText("Visível para cliente");

    await clientPage.reload();
  }

  const clientFileHeading = clientPage.getByRole("heading", {
    exact: true,
    name: syntheticFileName,
  });
  await expect(clientFileHeading).toBeVisible({ timeout: 15_000 });

  const clientFileCard = clientPage
    .locator("li")
    .filter({ has: clientFileHeading })
    .first();

  const [download] = await Promise.all([
    clientPage.waitForEvent("download"),
    clientFileCard.getByRole("link", { name: "Baixar arquivo" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe(syntheticFileName);
  expect(await download.failure()).toBeNull();

  await adminContext.close();
  await clientContext.close();
});
