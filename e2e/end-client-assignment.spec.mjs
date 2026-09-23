import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

if (!baseUrl || !adminEmail || !adminPassword) {
  throw new Error(
    "Missing E2E_BASE_URL, E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD",
  );
}

test.use({
  baseURL: baseUrl,
});

test("admin encerra assignment sintetico e cliente sai da lista atribuida", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Senha").fill(adminPassword);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/admin\/?$/);

  await page.goto("/admin/clientes");
  await expect(
    page.getByRole("heading", { name: "Clientes" }),
  ).toBeVisible();

  const clientRow = page
    .locator("li")
    .filter({ hasText: "E2E Client" })
    .first();

  if ((await clientRow.count()) === 0) {
    await expect(
      page.getByText("Nenhuma cliente está atribuída ao seu perfil no momento."),
    ).toBeVisible();
    return;
  }

  await clientRow.getByRole("link", { name: "Abrir" }).click();

  await expect(
    page.getByRole("heading", { name: "E2E Client" }),
  ).toBeVisible();
  await expect(page.getByText("Atribuição ativa", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Encerrar atribuição" }).click();

  await expect(page).toHaveURL(/\/admin\/clientes\?assignment=ended$/);
  await expect(
    page.getByText(
      "O vínculo atual foi encerrado e o histórico do assignment foi preservado.",
      { exact: true },
    ),
  ).toBeVisible();

  await expect(
    page.locator("li").filter({ hasText: "E2E Client" }),
  ).toHaveCount(0);
});
