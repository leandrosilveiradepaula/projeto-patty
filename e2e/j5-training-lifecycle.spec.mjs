import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { generateTotp, loginAdminWithMfa } from "./helpers/admin-auth.mjs";

// Synthetic-only disposable runtime. Never connect this test to SaaS.
const baseURL = process.env.J5_E2E_BASE_URL;
const apiURL = process.env.J5_E2E_SUPABASE_URL;
const anonKey = process.env.J5_E2E_ANON_KEY;
const serviceKey = process.env.J5_E2E_SERVICE_ROLE_KEY;
if (process.env.J5_E2E_LOCAL_ONLY !== "true" ||
    baseURL !== "http://127.0.0.1:3000" ||
    apiURL !== "http://127.0.0.1:54321" || !anonKey || !serviceKey) {
  throw new Error("J5 test is restricted to disposable localhost services");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedFixtureTables = new Set(["profiles", "user_roles", "clients", "client_assignments"]);
const service = createClient(apiURL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function anonClient() {
  return createClient(apiURL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
function literal(value) {
  if (typeof value !== "string" && typeof value !== "number" && value !== null)
    throw new TypeError("Unsupported fixture value");
  return value === null ? "NULL" : "'" + String(value).replaceAll("'", "''") + "'";
}
function sql(statement) {
  if (process.env.J5_E2E_LOCAL_ONLY !== "true" ||
      apiURL !== "http://127.0.0.1:54321")
    throw new Error("Local-only SQL boundary rejected");
  return execFileSync("docker", [
    "exec", "-i", "supabase_db_projeto-patty", "psql", "-X", "-q",
    "-U", "postgres", "-d", "postgres", "-A", "-t", "-v", "ON_ERROR_STOP=1",
  ], { input: statement.trimEnd() + "\n", encoding: "utf8", timeout: 12000 }).trim();
}
function rows(query) {
  return JSON.parse(sql(
    "select coalesce(json_agg(row_to_json(t)),'[]'::json)::text from (" +
    query + ") t;",
  ));
}
function insert(table, fields) {
  if (!allowedFixtureTables.has(table) ||
      !Object.keys(fields).every(x => /^[a-z_]+$/.test(x)))
    throw new Error("Fixture table/column is not permitted");
  const pk = table === "user_roles" ? "profile_id" : "id";
  const id = sql("insert into public." + table + " (" +
    Object.keys(fields).join(",") + ") values (" +
    Object.values(fields).map(literal).join(",") + ") returning " + pk + ";");
  if (!UUID.test(id)) throw new Error("Synthetic fixture did not return UUID");
  return id;
}
async function identity(role, label, nonce) {
  const email = "e2e-j5-" + label + "-" + nonce + "@example.invalid";
  if (!/^e2e-j5-(staff|unassigned|client|foreign)-[0-9a-f]{16}@example\.invalid$/.test(email))
    throw new Error("Only local synthetic J5 identities are permitted");
  const password = "J5-" + randomBytes(18).toString("base64url") + "-Aa1!";
  const created = await service.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (created.error || !created.data?.user?.id)
    throw created.error ?? new Error("Synthetic Auth setup failed");
  const id = created.data.user.id;
  insert("profiles", { id, display_name: "J5 synthetic " + label });
  insert("user_roles", { profile_id: id, role });
  return { id, email, password };
}
async function enrollTotp(user) {
  const api = anonClient();
  const auth = await api.auth.signInWithPassword({
    email: user.email, password: user.password,
  });
  if (auth.error) throw auth.error;
  try {
    const factor = await api.auth.mfa.enroll({
      factorType: "totp", friendlyName: "Disposable J5 TOTP",
    });
    if (factor.error) throw factor.error;
    const challenge = await api.auth.mfa.challenge({ factorId: factor.data.id });
    if (challenge.error) throw challenge.error;
    const verify = await api.auth.mfa.verify({
      factorId: factor.data.id,
      challengeId: challenge.data.id,
      code: generateTotp(factor.data.totp.secret),
    });
    if (verify.error) throw verify.error;
    return factor.data.totp.secret;
  } finally {
    await api.auth.signOut();
  }
}
async function loginClient(page, user) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cliente\/?$/, { timeout: 20000 });
  await page.goto("/cliente/treino");
  await expect(page.getByRole("heading", { name: "Treino", exact: true })).toBeVisible();
}
async function pollRows(query, number) {
  await expect.poll(() => rows(query).length, { timeout: 25000 }).toBe(number);
  return rows(query);
}
function versions(clientId) {
  return rows("select v.id,v.version_number,v.title,v.reviewed_at,v.published_at" +
    " from public.client_training_plan_versions v" +
    " join public.client_training_plans p on p.id=v.training_plan_id" +
    " where p.client_id=" + literal(clientId) + " order by v.version_number");
}
function items(versionId) {
  return rows("select id,exercise_name,sets_text,repetitions_text,exercise_version_id" +
    " from public.client_training_plan_items where training_plan_version_id=" +
    literal(versionId) + " order by position");
}
// SQL-level access test uses actual RLS with an authenticated role, never
// service_role. Count results only; no private records or tokens are logged.
function visibleCount(userId, aal, table, recordId) {
  if (!UUID.test(userId) || !UUID.test(recordId) ||
      !["aal1", "aal2"].includes(aal) ||
      !["client_training_plan_versions", "client_training_plan_items"].includes(table))
    throw new Error("Invalid local RLS probe");
  const claims = JSON.stringify({ sub: userId, role: "authenticated", aal });
  return Number(sql([
    "begin;",
    "set local statement_timeout = '5s';",
    "set local role authenticated;",
    "set local request.jwt.claims = " + literal(claims) + ";",
    "set local request.jwt.claim.sub = " + literal(userId) + ";",
    "select count(*) from public." + table + " where id=" + literal(recordId) + ";",
    "rollback;",
  ].join("\n")));
}
async function mobileWidth(page) {
  const width = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.document).toBeLessThanOrEqual(width.viewport + 2);
}

test.use({ baseURL });

test("J5: client requests, Patty reviews/publishes exact training versions and access stays isolated", async ({ browser }) => {
  test.setTimeout(360000);
  const nonce = randomBytes(8).toString("hex");
  const staff = await identity("admin", "staff", nonce);
  const unassigned = await identity("admin", "unassigned", nonce);
  const owner = await identity("client", "client", nonce);
  const foreign = await identity("client", "foreign", nonce);
  const clientId = insert("clients", {
    profile_id: owner.id, full_name: "J5 Cliente sintetica", status: "active",
  });
  insert("clients", {
    profile_id: foreign.id, full_name: "J5 Outra cliente sintetica", status: "active",
  });
  insert("client_assignments", { client_id: clientId, staff_profile_id: staff.id });
  const totp = await enrollTotp(staff);
  const otherTotp = await enrollTotp(unassigned);
  const adminCtx = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const clientCtx = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const outsiderCtx = await browser.newContext({ baseURL });
  const foreignCtx = await browser.newContext({ baseURL });
  try {
    const adminPage = await adminCtx.newPage();
    const clientPage = await clientCtx.newPage();
    const outsiderPage = await outsiderCtx.newPage();
    const foreignPage = await foreignCtx.newPage();
    await loginAdminWithMfa(adminPage, {
      email: staff.email, password: staff.password, totpSecret: totp,
    });
    await loginClient(clientPage, owner);
    await loginClient(foreignPage, foreign);

    const adminRoute = "/admin/clientes/" + clientId + "/treino";
    await test.step("No prescription is created before a request", async () => {
      await adminPage.goto(adminRoute);
      await expect(adminPage.getByText("Treino ainda não solicitado", { exact: true })).toBeVisible();
      expect(rows("select id from public.client_training_plans where client_id=" + literal(clientId))).toEqual([]);
      await expect(clientPage.getByText("Nenhum treino publicado", { exact: true })).toBeVisible();
    });

    await test.step("Client requests training using own session", async () => {
      await clientPage.getByLabel("Observação", { exact: true }).fill("Pedido sintetico J5");
      await clientPage.getByRole("button", { name: "Solicitar treino" }).click();
      await pollRows("select id from public.client_training_requests where client_id=" + literal(clientId), 1);
      expect(rows("select id from public.client_training_plans where client_id=" + literal(clientId))).toEqual([]);
      await adminPage.reload();
      await expect(adminPage.getByRole("heading", { name: "Criar primeiro treino" })).toBeVisible();
    });

    let first;
    let firstItem;
    await test.step("Admin creates a versioned manual draft with one exercise", async () => {
      await adminPage.getByLabel("Título do treino").fill("J5 Treino A sintetico");
      await adminPage.getByLabel("Observações gerais").fill("Versao inicial sintética");
      await adminPage.getByRole("button", { name: "Criar rascunho" }).click();
      await expect.poll(() => versions(clientId).length, { timeout: 25000 }).toBe(1);
      first = versions(clientId)[0];
      expect(first.version_number).toBe(1);
      expect(first.reviewed_at).toBeNull();
      expect(first.published_at).toBeNull();
      expect(visibleCount(staff.id, "aal2", "client_training_plan_versions", first.id)).toBe(1);
      expect(visibleCount(staff.id, "aal1", "client_training_plan_versions", first.id)).toBe(0);
      expect(visibleCount(unassigned.id, "aal2", "client_training_plan_versions", first.id)).toBe(0);
      expect(visibleCount(owner.id, "aal1", "client_training_plan_versions", first.id)).toBe(0);
      await expect(clientPage.getByText("Nenhum treino publicado", { exact: true })).toBeVisible();
      await expect(adminPage.getByRole("heading", { name: "Adicionar exercício" })).toBeVisible();
      await adminPage.getByLabel("Nome manual do exercício").fill("J5 Exercicio manual");
      await adminPage.getByLabel("Séries", { exact: true }).fill("3");
      await adminPage.getByLabel("Repetições", { exact: true }).fill("12");
      await adminPage.getByRole("button", { name: "Adicionar exercício" }).click();
      await expect.poll(() => items(first.id).length, { timeout: 25000 }).toBe(1);
      firstItem = items(first.id)[0];
      expect(firstItem.exercise_name).toBe("J5 Exercicio manual");
      expect(firstItem.exercise_version_id).toBeNull();
      expect(visibleCount(owner.id, "aal1", "client_training_plan_items", firstItem.id)).toBe(0);
      await mobileWidth(adminPage);
    });

    await test.step("Review freezes the draft; only publication releases it", async () => {
      await adminPage.getByRole("button", { name: "Revisar treino" }).click();
      await adminPage.getByRole("button", { name: "Confirmar revisão" }).click();
      await expect.poll(() => Boolean(versions(clientId)[0]?.reviewed_at), { timeout: 25000 }).toBe(true);
      expect(versions(clientId)[0].published_at).toBeNull();
      expect(visibleCount(owner.id, "aal1", "client_training_plan_versions", first.id)).toBe(0);
      await clientPage.reload();
      await expect(clientPage.getByText("Nenhum treino publicado", { exact: true })).toBeVisible();
      await expect(adminPage.getByRole("heading", { name: "Publicar para a cliente" })).toBeVisible();
      await adminPage.getByRole("button", { name: "Publicar treino" }).click();
      await adminPage.getByRole("button", { name: "Confirmar publicação" }).click();
      await expect.poll(() => Boolean(versions(clientId)[0]?.published_at), { timeout: 25000 }).toBe(true);
      expect(visibleCount(owner.id, "aal1", "client_training_plan_versions", first.id)).toBe(1);
      expect(visibleCount(owner.id, "aal1", "client_training_plan_items", firstItem.id)).toBe(1);
      expect(visibleCount(foreign.id, "aal1", "client_training_plan_versions", first.id)).toBe(0);
      await clientPage.reload();
      await expect(clientPage.getByRole("heading", { name: "J5 Treino A sintetico" })).toBeVisible();
      await expect(clientPage.getByText("J5 Exercicio manual", { exact: false }).first()).toBeVisible();
      await expect(foreignPage.getByText("Nenhum treino publicado", { exact: true })).toBeVisible();
      await mobileWidth(clientPage);
    });

    let second;
    await test.step("Independent v2 stays private while v1 is still current", async () => {
      await expect(adminPage.getByRole("heading", { name: "Criar nova versão" })).toBeVisible();
      await adminPage.getByLabel("Título do treino").fill("J5 Treino B sintetico");
      await adminPage.getByRole("button", { name: "Criar rascunho" }).click();
      await expect.poll(() => versions(clientId).length, { timeout: 25000 }).toBe(2);
      second = versions(clientId)[1];
      expect(second.version_number).toBe(2);
      expect(second.published_at).toBeNull();
      expect(visibleCount(owner.id, "aal1", "client_training_plan_versions", second.id)).toBe(0);
      await clientPage.reload();
      await expect(clientPage.getByRole("heading", { name: "J5 Treino A sintetico" })).toBeVisible();
      await expect(clientPage.getByText("J5 Treino B sintetico", { exact: true })).toHaveCount(0);
      await mobileWidth(adminPage);
    });

    let copied;
    await test.step("Explicit copy from v1 is independent and editable in v2", async () => {
      await adminPage.locator("summary").filter({ hasText: "Versão 1 · J5 Treino A sintetico" }).click();
      await adminPage.getByRole("checkbox", { name: /Confirmo a cópia dos exercícios/ }).check();
      await adminPage.getByRole("button", { name: "Copiar exercícios publicados" }).click();
      await expect.poll(() => items(second.id).length, { timeout: 25000 }).toBe(1);
      // The copy form intentionally does not trigger router.refresh. Read the
      // persisted item in a fresh server-rendered view before editing it.
      await adminPage.reload();
      await expect(adminPage.locator("summary").filter({
        hasText: "Editar exercício 1 · J5 Exercicio manual",
      })).toBeVisible();
      copied = items(second.id)[0];
      expect(copied.id).not.toBe(firstItem.id);
      expect(copied.exercise_name).toBe(firstItem.exercise_name);
      await adminPage.locator("details").filter({ hasText: "Editar exercício 1 · J5 Exercicio manual" })
        .locator("summary").first().click();
      await adminPage.locator('input[name="repetitionsText"]').first().fill("8");
      await adminPage.getByRole("button", { name: "Salvar exercício" }).click();
      await expect.poll(() => items(second.id)[0]?.repetitions_text, { timeout: 25000 }).toBe("8");
      expect(items(first.id)[0].repetitions_text).toBe("12");
      expect(visibleCount(owner.id, "aal1", "client_training_plan_items", copied.id)).toBe(0);
    });

    await test.step("v2 is reviewed and published explicitly; both versions remain", async () => {
      await adminPage.getByRole("button", { name: "Revisar treino" }).click();
      await adminPage.getByRole("button", { name: "Confirmar revisão" }).click();
      await expect.poll(() => Boolean(versions(clientId)[1]?.reviewed_at), { timeout: 25000 }).toBe(true);
      expect(visibleCount(owner.id, "aal1", "client_training_plan_versions", second.id)).toBe(0);
      await adminPage.getByRole("button", { name: "Publicar treino" }).click();
      await adminPage.getByRole("button", { name: "Confirmar publicação" }).click();
      await expect.poll(() => Boolean(versions(clientId)[1]?.published_at), { timeout: 25000 }).toBe(true);
      expect(items(first.id)[0].repetitions_text).toBe("12");
      expect(items(second.id)[0].repetitions_text).toBe("8");
      expect(visibleCount(owner.id, "aal1", "client_training_plan_versions", second.id)).toBe(1);
      expect(visibleCount(owner.id, "aal1", "client_training_plan_items", copied.id)).toBe(1);
      await clientPage.reload();
      await expect(clientPage.getByRole("heading", { name: "J5 Treino B sintetico" })).toBeVisible();
      await expect(clientPage.getByRole("heading", { name: "Treinos anteriores" })).toBeVisible();
      await expect(clientPage.getByText("Versão 1 · J5 Treino A sintetico", { exact: false }).first()).toBeVisible();
      await mobileWidth(clientPage);
    });

    await test.step("Other admin cannot access client workspace", async () => {
      await loginAdminWithMfa(outsiderPage, {
        email: unassigned.email, password: unassigned.password, totpSecret: otherTotp,
      });
      const response = await outsiderPage.goto(adminRoute);
      expect(response?.status()).toBe(404);
      expect(visibleCount(unassigned.id, "aal2", "client_training_plan_versions", second.id)).toBe(0);
    });
  } finally {
    await Promise.all([adminCtx.close(), clientCtx.close(), outsiderCtx.close(), foreignCtx.close()]);
  }
});
