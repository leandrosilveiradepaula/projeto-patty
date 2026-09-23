import { expect, test } from "@playwright/test";

import { loginAdminWithMfa } from "./helpers/admin-auth.mjs";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const adminTotpSecret = process.env.E2E_ADMIN_TOTP_SECRET;

if (!baseUrl || !adminEmail || !adminPassword || !adminTotpSecret) {
  throw new Error(
    "Missing E2E_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD or E2E_ADMIN_TOTP_SECRET",
  );
}

test.use({
  baseURL: baseUrl,
});

test("admin encerra assignment sintetico e cliente sai da lista atribuida", async ({
  page,
}) => {
  await loginAdminWithMfa(page, {
    email: adminEmail,
    password: adminPassword,
    totpSecret: adminTotpSecret,
  });

  await expect(page).toHaveURL(/\/admin\/?$/);

  await page.goto("/admin/clientes");
  await expect(
    page.getByRole("heading", { name: "Clientes", exact: true }),
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
  await expect(
    page.getByRole("heading", { name: "Atribuição", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Encerrar atribuição" }),
  ).toBeVisible();

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
