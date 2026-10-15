import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { generateTotp, loginAdminWithMfa } from "./helpers/admin-auth.mjs";

// Intentionally impossible to target production, preview or remote Supabase.
// Service role is used only by this disposable local test fixture, never in the
// browser, Next.js environment or an account owned by a real client.
const baseUrl = process.env.J2_E2E_BASE_URL;
const supabaseUrl = process.env.J2_E2E_SUPABASE_URL;
const anonKey = process.env.J2_E2E_ANON_KEY;
const serviceRoleKey = process.env.J2_E2E_SERVICE_ROLE_KEY;
if (
  process.env.J2_E2E_LOCAL_ONLY !== "true" ||
  baseUrl !== "http://127.0.0.1:3000" ||
  supabaseUrl !== "http://127.0.0.1:54321" ||
  !anonKey || !serviceRoleKey
) {
  throw new Error("J2 browser E2E requires the isolated local Supabase and Next.js runner.");
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function signedClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// The local CLI deliberately does not auto-grant service_role database table
// privileges. Fixture and observation use the PostgreSQL owner INSIDE the
// disposable local DB container, leaving all grants and RLS unchanged.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTables = new Set([
  "profiles", "user_roles", "clients", "client_assignments",
  "protocols", "protocol_versions", "protocol_version_approvals", "protocol_publications",
]);

function localSql(query) {
  if (process.env.J2_E2E_LOCAL_ONLY !== "true" ||
      supabaseUrl !== "http://127.0.0.1:54321") {
    throw new Error("Local SQL fixture cannot execute outside the disposable Supabase runner");
  }
  return execFileSync("docker", [
    "exec", "-i", "supabase_db_projeto-patty",
    "psql", "-X", "-q", "-U", "postgres", "-d", "postgres",
    "-A", "-t", "-v", "ON_ERROR_STOP=1",
  ], { input: query.trimEnd() + "\n", encoding: "utf8", timeout: 12000 }).trim();
}

function sqlLiteral(value) {
  if (value === null) return "NULL";
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("Unsupported local fixture value");
  }
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function insert(table, record) {
  if (!allowedTables.has(table)) throw new Error("Local fixture table not allowed");
  const entries = Object.entries(record);
  const keys = entries.map(([key]) => {
    if (!/^[a-z_]+$/.test(key)) throw new Error("Invalid fixture column name");
    return key;
  });
  const values = entries.map(([, value]) => sqlLiteral(value));
  const returned = localSql(
    "insert into public." + table +
    " (" + keys.join(", ") + ") values (" + values.join(", ") + ") returning " +
    (table === "user_roles" ? "profile_id" : "id") + ";",
  );
  if (!UUID.test(returned)) throw new Error("Local fixture insert returned no valid UUID");
  return returned;
}

function localSelect(query) {
  const output = localSql(
    "select coalesce(json_agg(row_to_json(t)), '[]'::json)::text " +
    "from (" + query + ") as t;",
  );
  return JSON.parse(output);
}

async function createIdentity(role, label, nonce) {
  const email = "e2e-j2-" + label + "-" + nonce + "@example.invalid";
  if (!/^e2e-j2-(admin|client|other-client|unassigned-admin)-[0-9a-f]{16}@example\.invalid$/.test(email)) {
    throw new Error("Refusing non-synthetic J2 identity");
  }
  const password = "E2E-J2-" + randomBytes(18).toString("base64url") + "-Aa1!";
  const { data, error } = await service.auth.admin.createUser({
    email, email_confirm: true, password,
  });
  if (error || !data?.user?.id) throw error ?? new Error("Synthetic Auth user unavailable");
  const id = data.user.id;
  insert("profiles", { id, display_name: "E2E J2 " + label });
  insert("user_roles", { profile_id: id, role });
  return { id, email, password };
}

async function enrollLocalTotp(identity) {
  const auth = signedClient();
  const login = await auth.auth.signInWithPassword(identity);
  if (login.error) throw login.error;
  try {
    const enrolled = await auth.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Disposable J2 local browser test",
    });
    if (enrolled.error) throw enrolled.error;
    const factorId = enrolled.data.id;
    const secret = enrolled.data.totp.secret;
    const challenge = await auth.auth.mfa.challenge({ factorId });
    if (challenge.error) throw challenge.error;
    const verified = await auth.auth.mfa.verify({
      factorId, challengeId: challenge.data.id, code: generateTotp(secret),
    });
    if (verified.error) throw verified.error;
    return secret;
  } finally {
    await auth.auth.signOut();
  }
}

async function loginClient(page, identity) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(identity.email);
  await page.getByLabel("Senha").fill(identity.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cliente\/?$/);
}

async function feedbackRecord(clientId, periodStart) {
  if (!UUID.test(clientId) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(periodStart)) {
    throw new Error("Invalid local feedback lookup keys");
  }
  const rows = localSelect(
    "select id, client_id, form_version_id, request_source, answers, submitted_at " +
    "from public.client_weekly_feedbacks where client_id = " + sqlLiteral(clientId) +
    " and period_start = " + sqlLiteral(periodStart),
  );
  if (rows.length > 1) throw new Error("Synthetic feedback unique period was violated");
  return rows[0] ?? null;
}

async function seedPublishedProtocol(staffProfileId, clientId) {
  // This is a synthetic fixture, not the clinical approval/publishing flow
  // under test. No actual patient or production database can be reached.
  const protocolId = await insert("protocols", { client_id: clientId });
  const versionId = await insert("protocol_versions", {
    protocol_id: protocolId, client_id: clientId, version_number: 1,
    created_by_profile_id: staffProfileId,
    submitted_for_review_at: new Date().toISOString(),
  });
  const approvalId = await insert("protocol_version_approvals", {
    protocol_version_id: versionId, client_id: clientId,
    approved_by_profile_id: staffProfileId,
  });
  await insert("protocol_publications", {
    protocol_version_id: versionId, client_id: clientId, approval_id: approvalId,
    published_by_profile_id: staffProfileId,
  });
}

test.use({ baseURL: baseUrl });

test("J2: solicitação MFA, rascunho, CAS, envio, histórico e acesso por vínculo", async ({ browser }) => {
  test.setTimeout(360_000);
  const nonce = randomBytes(8).toString("hex");

  const admin = await createIdentity("admin", "admin", nonce);
  const client = await createIdentity("client", "client", nonce);
  const other = await createIdentity("client", "other-client", nonce);
  const unassigned = await createIdentity("admin", "unassigned-admin", nonce);

  const clientId = await insert("clients", {
    profile_id: client.id, full_name: "Cliente sintética J2", status: "active",
  });
  await insert("clients", {
    profile_id: other.id, full_name: "Outra cliente sintética J2", status: "active",
  });
  await insert("client_assignments", {
    client_id: clientId, staff_profile_id: admin.id,
  });
  await seedPublishedProtocol(admin.id, clientId);

  const adminTotp = await enrollLocalTotp(admin);
  const unassignedTotp = await enrollLocalTotp(unassigned);
  const periodStart = "2026-10-05";
  const periodEnd = "2026-10-11";

  const adminContext = await browser.newContext({
    baseURL: baseUrl, viewport: { width: 1280, height: 900 },
  });
  const clientContext = await browser.newContext({
    baseURL: baseUrl, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const otherContext = await browser.newContext({ baseURL: baseUrl });
  const unassignedContext = await browser.newContext({ baseURL: baseUrl });
  const anonymousContext = await browser.newContext({ baseURL: baseUrl });

  const clientApi = signedClient();
  const otherApi = signedClient();

  try {
    const adminPage = await adminContext.newPage();
    await test.step("Patty MFA cria uma única solicitação após protocolo sintético publicado", async () => {
      await loginAdminWithMfa(adminPage, {
        email: admin.email, password: admin.password, totpSecret: adminTotp,
      });
      await adminPage.goto("/admin/clientes/" + clientId + "/feedback-semanal");
      await expect(adminPage.getByRole("heading", { name: "Solicitar Feedback Semanal" })).toBeVisible();
      await adminPage.getByLabel("Semana de referência · início").fill(periodStart);
      await adminPage.getByLabel("Semana de referência · fim").fill(periodEnd);
      await adminPage.getByRole("button", { name: "Criar solicitação" }).click();
      try {
        await expect.poll(async () => {
          const row = await feedbackRecord(clientId, periodStart);
          return row?.request_source ?? null;
        }, { timeout: 25_000 }).toBe("manual");
      } catch {
        // Report only known operational states, never any form values,
        // session cookies, request payloads or client health information.
        const knownFailureLabels = [
          "O Feedback Semanal só pode ser solicitado depois que a cliente receber o primeiro protocolo publicado.",
          "Nenhuma versão publicada do Feedback Semanal está disponível.",
          "Informe um período válido.",
          "A data final não pode ser anterior à data inicial.",
          "Não foi possível criar a solicitação. Confira o período e tente novamente.",
          "Este período já tem um Feedback Semanal solicitado. Abra a solicitação existente.",
        ];
        const states = [];
        for (const label of knownFailureLabels) {
          if (await adminPage.getByText(label, { exact: true }).isVisible()) {
            states.push(knownFailureLabels.indexOf(label));
          }
        }
        const successVisible = await adminPage.getByText(
          "Feedback Semanal solicitado para a cliente.", { exact: true },
        ).isVisible();
        throw new Error(
          "Synthetic admin request not persisted; successVisible=" + successVisible +
          "; knownErrorIndexes=" + JSON.stringify(states),
        );
      }
    });

    const initial = await feedbackRecord(clientId, periodStart);
    expect(initial?.id).toBeTruthy();
    expect(initial.client_id).toBe(clientId);
    expect(initial.answers).toEqual({});
    expect(initial.submitted_at).toBeNull();
    const feedbackId = initial.id;

    await test.step("caixa profissional mostra a solicitação pendente, sem expor respostas", async () => {
      await adminPage.goto("/admin/feedback-semanal?situacao=pendentes&cliente=" + clientId);
      await expect(adminPage.getByRole("heading", { name: "Aguardando resposta da cliente" })).toBeVisible();
      await expect(adminPage.getByRole("link", { name: "Abrir solicitação" })).toBeVisible();
    });

    const clientPage = await clientContext.newPage();
    await test.step("cliente autenticada salva rascunho e retoma após recarregar o celular", async () => {
      await loginClient(clientPage, client);
      await clientPage.goto("/cliente/feedback-semanal");
      await expect(clientPage.getByRole("heading", { name: "Feedback Semanal", exact: true })).toBeVisible();
      const firstQuestion = clientPage.locator("#weekly-feedback-answer-q01");
      await expect(firstQuestion).toBeVisible();
      await firstQuestion.fill("2");
      await clientPage.getByRole("button", { name: "Salvar rascunho" }).click();
      await expect.poll(async () => {
        const row = await feedbackRecord(clientId, periodStart);
        return row?.answers ?? null;
      }, { timeout: 25_000 }).toEqual({ q01: 2 });
      expect((await feedbackRecord(clientId, periodStart)).submitted_at).toBeNull();

      await clientPage.reload();
      await expect(clientPage.locator("#weekly-feedback-answer-q01")).toHaveValue("2");
      const dimensions = await clientPage.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scroll, "J2 mobile form must fit viewport").toBeLessThanOrEqual(dimensions.width + 1);
    });

    await test.step("outra sessão não sobrescreve o rascunho usando respostas antigas", async () => {
      const login = await clientApi.auth.signInWithPassword({
        email: client.email, password: client.password,
      });
      if (login.error) throw login.error;
      const outdated = await clientApi.rpc("save_client_weekly_feedback_if_unchanged", {
        p_client_id: clientId, p_feedback_id: feedbackId, p_expected_answers: {},
        p_answers: { q01: 9 }, p_submit: false,
      });
      if (outdated.error) throw outdated.error;
      expect(outdated.data).toEqual([]);
      expect((await feedbackRecord(clientId, periodStart)).answers).toEqual({ q01: 2 });
    });

    await test.step("cliente reconcilia rascunhos simultâneos sem perder respostas", async () => {
      // The original page still holds the first snapshot. Keep two local edits
      // while the second authenticated session changes one of the same fields.
      await clientPage.locator("#weekly-feedback-answer-q01").fill("5");
      await clientPage.locator("#weekly-feedback-answer-q02").fill("3");
      const savedByOtherTab = await clientApi.rpc("save_client_weekly_feedback_if_unchanged", {
        p_client_id: clientId, p_feedback_id: feedbackId,
        p_expected_answers: { q01: 2 },
        p_answers: { q01: 4, q03: "Resposta remota sintética J2" },
        p_submit: false,
      });
      if (savedByOtherTab.error) throw savedByOtherTab.error;
      expect(savedByOtherTab.data).toHaveLength(1);

      await clientPage.getByRole("button", { name: "Salvar rascunho" }).click();
      await expect(clientPage.getByRole("button", {
        name: "Conferir versão salva",
      })).toBeVisible();

      await clientPage.getByRole("button", {
        name: "Conferir versão salva",
      }).click();
      await expect(clientPage.getByRole("heading", {
        name: "Há outra versão salva deste rascunho",
      })).toBeVisible();
      // A refresh must keep unsaved health answers in the same form.
      await expect(clientPage.locator("#weekly-feedback-answer-q01")).toHaveValue("5");
      await expect(clientPage.locator("#weekly-feedback-answer-q02")).toHaveValue("3");
      const combine = clientPage.getByRole("button", { name: "Combinar respostas para continuar" });
      await expect(combine).toBeDisabled();
      await clientPage.getByLabel("Manter minha edição").check();
      await expect(combine).toBeEnabled();
      await combine.click();
      await expect(clientPage.locator("#weekly-feedback-answer-q01")).toHaveValue("5");
      await expect(clientPage.locator("#weekly-feedback-answer-q02")).toHaveValue("3");
      await expect(clientPage.locator("#weekly-feedback-answer-q03"))
        .toHaveValue("Resposta remota sintética J2");
      // No implicit save: only the explicit "Salvar rascunho" changes the row.
      expect((await feedbackRecord(clientId, periodStart)).answers).toEqual({
        q01: 4, q03: "Resposta remota sintética J2",
      });
      await clientPage.getByRole("button", { name: "Salvar rascunho" }).click();
      await expect.poll(async () => (await feedbackRecord(clientId, periodStart)).answers, {
        timeout: 25_000,
      }).toEqual({ q01: 5, q02: 3, q03: "Resposta remota sintética J2" });
    });

    await test.step("cliente revisa as 21 respostas sintéticas e envia definitivamente", async () => {
      if (!UUID.test(initial.form_version_id)) throw new Error("Invalid local form version");
      const version = localSelect(
        "select definition from public.weekly_feedback_form_versions where id = " +
        sqlLiteral(initial.form_version_id),
      );
      const questions = version[0]?.definition?.questions;
      expect(Array.isArray(questions)).toBe(true);
      expect(questions).toHaveLength(21);
      for (const question of questions) {
        const input = clientPage.locator("#weekly-feedback-answer-" + question.key);
        const value = question.input_type === "integer" ? "2" :
          question.input_type === "rating_0_10" ? "7" :
            "Resposta sintética J2 exclusivamente local";
        await expect(input).toBeVisible();
        await input.fill(value);
      }
      await clientPage.getByRole("button", { name: "Revisar respostas para enviar" }).click();
      await expect(clientPage.getByRole("button", { name: "Confirmar envio definitivo" })).toBeVisible();
      await clientPage.getByRole("button", { name: "Confirmar envio definitivo" }).click();
      await expect.poll(async () => {
        const row = await feedbackRecord(clientId, periodStart);
        return row?.submitted_at ?? null;
      }, { timeout: 30_000 }).not.toBeNull();
      const submitted = await feedbackRecord(clientId, periodStart);
      expect(Object.keys(submitted.answers)).toHaveLength(21);
      expect(submitted.answers.q01).toBe(2);
      expect(submitted.answers.q17).toBe(7);
      await clientPage.reload();
      await expect(clientPage.getByRole("heading", { name: "Histórico enviado" })).toBeVisible();
      await expect(clientPage.locator("#feedback-pendente-" + feedbackId)).toHaveCount(0);
    });

    await test.step("envio original fica imutável, inclusive na RPC de uma sessão antiga", async () => {
      const sent = await feedbackRecord(clientId, periodStart);
      const overwrite = await clientApi.rpc("save_client_weekly_feedback_if_unchanged", {
        p_client_id: clientId, p_feedback_id: feedbackId,
        p_expected_answers: sent.answers, p_answers: { q01: 9 }, p_submit: false,
      });
      if (overwrite.error) throw overwrite.error;
      expect(overwrite.data).toEqual([]);
      const after = await feedbackRecord(clientId, periodStart);
      expect(after.answers).toEqual(sent.answers);
      expect(after.submitted_at).toBe(sent.submitted_at);
    });

    await test.step("Patty autenticada vê envio na caixa e abre a resposta original", async () => {
      await adminPage.goto("/admin/feedback-semanal?cliente=" + clientId);
      await expect(adminPage.getByRole("heading", { name: "Histórico de recebimentos" })).toBeVisible();
      await adminPage.getByRole("link", { name: "Abrir respostas originais" }).click();
      await expect(adminPage.locator("#feedback-enviado-" + feedbackId)).toBeVisible();
      await expect(adminPage.getByText("Resposta sintética J2 exclusivamente local").first()).toBeVisible();
    });

    await test.step("outra cliente, outro profissional e anônimo não acessam o registro", async () => {
      const login = await otherApi.auth.signInWithPassword({
        email: other.email, password: other.password,
      });
      if (login.error) throw login.error;
      const visible = await otherApi.from("client_weekly_feedbacks")
        .select("id").eq("id", feedbackId);
      if (visible.error) throw visible.error;
      expect(visible.data).toEqual([]);
      const stolen = await otherApi.rpc("save_client_weekly_feedback_if_unchanged", {
        p_client_id: clientId, p_feedback_id: feedbackId,
        p_expected_answers: {}, p_answers: { q01: 9 }, p_submit: false,
      });
      if (stolen.error) throw stolen.error;
      expect(stolen.data).toEqual([]);

      const otherPage = await otherContext.newPage();
      await loginClient(otherPage, other);
      await otherPage.goto("/cliente/feedback-semanal");
      await expect(otherPage.getByText("Nenhum feedback solicitado", { exact: true })).toBeVisible();
      const anonymousPage = await anonymousContext.newPage();
      await anonymousPage.goto("/cliente/feedback-semanal");
      await expect(anonymousPage).toHaveURL(/\/login\/?$/);
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const anonymousRead = await anon.from("client_weekly_feedbacks").select("id").eq("id", feedbackId);
      expect(anonymousRead.data ?? []).toEqual([]);

      const unassignedPage = await unassignedContext.newPage();
      await loginAdminWithMfa(unassignedPage, {
        email: unassigned.email, password: unassigned.password, totpSecret: unassignedTotp,
      });
      const denied = await unassignedPage.goto("/admin/clientes/" + clientId + "/feedback-semanal");
      // Next.js can stream the notFound boundary with HTTP 200 after headers
      // have already been sent. Assert the *rendered access boundary* rather
      // than treating transport status alone as proof of data isolation.
      expect([200, 404], "navigation should complete at an access boundary").toContain(denied?.status());
      await expect(unassignedPage.getByText("Página ou registro indisponível", { exact: true })).toBeVisible();
      await expect(unassignedPage.locator("#feedback-enviado-" + feedbackId)).toHaveCount(0);
      await expect(unassignedPage.getByText("Resposta sintética J2 exclusivamente local")).toHaveCount(0);

      await unassignedPage.goto("/admin/feedback-semanal?cliente=" + clientId);
      await expect(unassignedPage.getByText("Filtros indisponíveis", { exact: true })).toBeVisible();
      await expect(unassignedPage.getByRole("link", { name: "Abrir respostas originais" })).toHaveCount(0);
    });
  } finally {
    await Promise.allSettled([
      adminContext.close(), clientContext.close(), otherContext.close(),
      unassignedContext.close(), anonymousContext.close(),
    ]);
    await Promise.allSettled([clientApi.auth.signOut(), otherApi.auth.signOut()]);
    // The runner destroys its local Supabase and database in an ALWAYS step.
    // No synthetic account or medical answer was ever created in production.
  }
});
