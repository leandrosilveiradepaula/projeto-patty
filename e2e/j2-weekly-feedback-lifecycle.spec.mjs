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
  "client_assessments", // Synthetic local finalized evaluation for manual J2 handoff.
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
  // A finalized assessment is a fixture prerequisite to testing the manual
  // handoff, NOT an automatically generated assessment or professional act.
  // This insert is restricted to the disposable local PostgreSQL container.
  const finalizedAssessmentId = await insert("client_assessments", {
    client_id: clientId,
    assessed_at: "2026-10-13T12:00:00Z",
    assessment_kind: "monthly",
    created_by_profile_id: admin.id,
    finalized_at: "2026-10-14T12:00:00Z",
    finalized_by_profile_id: admin.id,
  });

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

      const startInput = adminPage.getByLabel("Semana de referência · início");
      const endInput = adminPage.getByLabel("Semana de referência · fim");
      const submitRequest = adminPage.getByRole("button", { name: "Criar solicitação" });

      // This is a progressively enhanced server-action form. The browser must
      // retain the native date value before submission; the server action is
      // still the authoritative validation boundary. Do not use React's
      // derived `min` attribute as a hydration probe: it is a UX aid and its
      // render timing is not a security or persistence contract.
      await expect(startInput).toBeVisible();
      await startInput.fill(periodStart);
      await expect(startInput).toHaveValue(periodStart);
      await endInput.fill(periodEnd);
      await expect(endInput).toHaveValue(periodEnd);
      await expect(submitRequest).toBeEnabled();
      await expect.poll(
        () => submitRequest.evaluate((button) => button.form?.checkValidity() ?? false),
        { message: "The synthetic request must pass native date constraints before submitting", timeout: 10_000 },
      ).toBe(true);
      await submitRequest.click();
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
        // Report only transport/UI states, never user input, health answers,
        // auth tokens, full URLs, HTML content or console output.
        const buttonPresent = await submitRequest.count() === 1;
        const formValid = buttonPresent
          ? await submitRequest.evaluate((button) => button.form?.checkValidity() ?? false)
          : null;
        const hydrated = await endInput.count() === 1
          ? (await endInput.getAttribute("min")) === periodStart
          : false;
        throw new Error(
          "Synthetic admin request not persisted; successVisible=" + successVisible +
          "; knownErrorIndexes=" + JSON.stringify(states) +
          "; path=" + new URL(adminPage.url()).pathname +
          "; formValid=" + formValid + "; hydrated=" + hydrated,
        );
      }
    });

    const initial = await feedbackRecord(clientId, periodStart);
    expect(initial?.id).toBeTruthy();
    expect(initial.client_id).toBe(clientId);
    expect(initial.answers).toEqual({});
    expect(initial.submitted_at).toBeNull();
    const feedbackId = initial.id;

    await test.step("J2 professional prioritizes existing requests and retains keyboard/mobile navigation", async () => {
      await adminPage.goto("/admin/clientes/" + clientId + "/feedback-semanal");
      const nav = adminPage.getByRole("navigation", { name: "Etapas do Feedback Semanal" });
      const pending = adminPage.locator("#feedback-pendentes");
      const manual = adminPage.locator("#solicitar-feedback");
      await expect(nav.getByRole("link", { name: /Aguardando cliente/ })).toBeVisible();
      for (const width of [1280, 390]) {
        await adminPage.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        const positions = await Promise.all([pending, manual].map(item =>
          item.evaluate(el => Math.round(el.getBoundingClientRect().top + window.scrollY))));
        expect(positions[0]).toBeLessThan(positions[1]);
        const dimensions = await adminPage.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 2);
      }
      await nav.getByRole("link", { name: /Aguardando cliente/ }).focus();
      await adminPage.keyboard.press("Tab");
      await expect(nav.getByRole("link", { name: "Nova solicitação manual" })).toBeFocused();
      await adminPage.keyboard.press("Enter");
      await expect(adminPage).toHaveURL(/#solicitar-feedback$/);
      await adminPage.setViewportSize({ width: 1280, height: 900 });
    });

    await test.step("caixa profissional mostra a solicitação pendente, sem expor respostas", async () => {
      await adminPage.goto("/admin/feedback-semanal?situacao=pendentes&cliente=" + clientId);
      await expect(adminPage.getByRole("heading", { name: "Aguardando resposta da cliente" })).toBeVisible();
      await expect(adminPage.getByText("Solicitação manual — lembrete automático não programado.", { exact: false })).toBeVisible();
      await adminPage.getByRole("link", { name: "Ver acompanhamento" }).click();
      await expect(adminPage.getByRole("link", {
        name: "Voltar à caixa de Feedbacks Semanais",
      })).toHaveAttribute("href",
        "/admin/feedback-semanal?situacao=pendentes&cliente=" + clientId + "#aguardando-cliente");
      await adminPage.getByRole("link", { name: "Voltar à caixa de Feedbacks Semanais" }).click();
      await expect(adminPage.getByRole("heading", { name: "Aguardando resposta da cliente" })).toBeVisible();
      await adminPage.getByRole("link", { name: "Abrir solicitação" }).click();
      await expect(adminPage.locator("#feedback-pendente-" + feedbackId)).toBeVisible();
      await expect(adminPage.getByText("Solicitação manual — lembrete automático não programado.", { exact: false })).toBeVisible();
      await adminPage.locator('select[name="origem"]').selectOption("manual");
      await adminPage.getByRole("button", { name: "Filtrar histórico" }).click();
      await expect(adminPage.locator('select[name="origem"]')).toHaveValue("manual");
      await expect(adminPage.getByRole("link", {
        name: "Voltar à caixa de Feedbacks Semanais",
      })).toHaveAttribute("href",
        "/admin/feedback-semanal?situacao=pendentes&cliente=" + clientId + "#aguardando-cliente");
      await adminPage.getByRole("link", { name: "Voltar à caixa de Feedbacks Semanais" }).click();
      await expect(adminPage).toHaveURL(/situacao=pendentes/);
      await expect(adminPage.getByRole("heading", { name: "Aguardando resposta da cliente" })).toBeVisible();
    });

    const clientPage = await clientContext.newPage();
    // Scope input lookup to the exact pending feedback. Multiple periods reuse
    // question keys but must never share labels, focus or test locators.
    const answerInput = (questionKey) => clientPage
      .locator("#feedback-pendente-" + feedbackId + " form")
      .locator('[name="' + questionKey + '"]');
    await test.step("cliente autenticada salva rascunho e retoma após recarregar o celular", async () => {
      await loginClient(clientPage, client);
      await clientPage.goto("/cliente/feedback-semanal");
      await expect(clientPage.getByRole("heading", { name: "Feedback Semanal", exact: true })).toBeVisible();
      const firstQuestion = answerInput("q01");
      await expect(firstQuestion).toBeVisible();
      await firstQuestion.fill("2");
      await clientPage.getByRole("button", { name: "Salvar rascunho" }).click();
      await expect.poll(async () => {
        const row = await feedbackRecord(clientId, periodStart);
        return row?.answers ?? null;
      }, { timeout: 25_000 }).toEqual({ q01: 2 });
      expect((await feedbackRecord(clientId, periodStart)).submitted_at).toBeNull();

      await clientPage.reload();
      await expect(answerInput("q01")).toHaveValue("2");
      // A 21-question mobile form can jump directly to its last answer
      // without changing the saved draft or leaking answers into the URL.
      const questionNav = clientPage.locator("#feedback-pendente-" + feedbackId + " form")
        .getByRole("combobox", { name: "Ir para uma pergunta" });
      await expect(questionNav).toBeVisible();
      await expect(questionNav.locator("option", { hasText: "Pergunta 1 · Preenchida" })).toHaveCount(1);
      await questionNav.selectOption("q21");
      await expect(answerInput("q21")).toBeFocused();
      await expect(questionNav).toHaveValue("");
      await expect(answerInput("q21")).toHaveValue("");
      expect((await feedbackRecord(clientId, periodStart)).answers).toEqual({ q01: 2 });
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
      await answerInput("q01").fill("5");
      await answerInput("q02").fill("3");
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
      await expect(answerInput("q01")).toHaveValue("5");
      await expect(answerInput("q02")).toHaveValue("3");
      const combine = clientPage.getByRole("button", { name: "Combinar respostas para continuar" });
      await expect(combine).toBeDisabled();
      await clientPage.getByLabel("Manter minha edição").check();
      await expect(combine).toBeEnabled();
      await combine.click();
      await expect(answerInput("q01")).toHaveValue("5");
      await expect(answerInput("q02")).toHaveValue("3");
      await expect(answerInput("q03"))
        .toHaveValue("Resposta remota sintética J2");
      // No implicit save: only the explicit "Salvar rascunho" changes the row.
      expect((await feedbackRecord(clientId, periodStart)).answers).toEqual({
        q01: 4, q03: "Resposta remota sintética J2",
      });
      await clientPage.getByRole("button", { name: "Salvar rascunho" }).click();
      await expect.poll(async () => (await feedbackRecord(clientId, periodStart)).answers, {
        timeout: 25_000,
      }).toEqual({ q01: 5, q02: 3, q03: "Resposta remota sintética J2" });
      // The server action also refreshes the RSC snapshot asynchronously.
      // Observe the persisted post-conflict draft on a fully reloaded page
      // before typing the 21 next answers, instead of racing with that refresh.
      await clientPage.reload();
      await expect(answerInput("q01")).toHaveValue("5");
      await expect(answerInput("q02")).toHaveValue("3");
      await expect(answerInput("q03")).toHaveValue("Resposta remota sintética J2");
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
        const input = answerInput(question.key);
        const value = question.input_type === "integer" ? "2" :
          question.input_type === "rating_0_10" ? "7" :
            "Resposta sintética J2 exclusivamente local";
        await expect(input).toBeVisible();
        await input.fill(value);
      }
      await expect(answerInput("q01")).toHaveValue("2");
      await clientPage.getByRole("button", { name: "Revisar respostas para enviar" }).click();
      await expect(clientPage.getByRole("heading", { name: "Revise antes de enviar" })).toBeFocused();
      await expect(clientPage.getByRole("region", { name: "Revisão antes do envio" }).locator("dl div").first().locator("dd")).toHaveText("2");
      await expect(clientPage.getByRole("button", { name: "Confirmar envio definitivo" })).toBeVisible();
      await clientPage.getByRole("button", { name: "Editar pergunta 17" }).click();
      await expect(answerInput("q17")).toBeFocused();
      await expect(clientPage.getByRole("heading", { name: "Revise antes de enviar" })).toHaveCount(0);
      await answerInput("q17").fill("8");
      expect((await feedbackRecord(clientId, periodStart)).submitted_at).toBeNull();
      await clientPage.getByRole("button", { name: "Revisar respostas para enviar" }).click();
      await expect(clientPage.getByRole("heading", { name: "Revise antes de enviar" })).toBeFocused();
      await clientPage.getByRole("button", { name: "Confirmar envio definitivo" }).click();
      await expect.poll(async () => {
        const row = await feedbackRecord(clientId, periodStart);
        return row?.submitted_at ?? null;
      }, { timeout: 30_000 }).not.toBeNull();
      const submitted = await feedbackRecord(clientId, periodStart);
      expect(Object.keys(submitted.answers)).toHaveLength(21);
      expect(submitted.answers.q01).toBe(2);
      expect(submitted.answers.q17).toBe(8);
      // Navigation is only emitted after the server action confirmed persistence.
      await expect(clientPage.getByText("Envio confirmado", { exact: true })).toBeVisible();
      await expect(clientPage).toHaveURL(new RegExp("registro=" + feedbackId));
      await expect(clientPage.locator("#feedback-enviado-" + feedbackId)).toHaveAttribute("open", "");
      await expect(clientPage.getByText("Resposta sintética J2 exclusivamente local").first()).toBeVisible();
      await clientPage.reload();
      await expect(clientPage.getByText("Envio confirmado", { exact: true })).toBeVisible();
      await expect(clientPage.getByRole("heading", { name: "Histórico enviado" })).toBeVisible();
      await expect(clientPage.locator("#feedback-pendente-" + feedbackId)).toHaveCount(0);
      // A forged/unknown record identifier must never create a confirmation.
      await clientPage.goto("/cliente/feedback-semanal?registro=00000000-0000-4000-8000-000000000000");
      await expect(clientPage.getByText("Envio confirmado", { exact: true })).toHaveCount(0);
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
      await adminPage.goto("/admin/feedback-semanal?cliente=" + clientId + "&origem=manual&mes=2026-10");
      await expect(adminPage.getByRole("heading", { name: "Histórico de recebimentos" })).toBeVisible();
      await adminPage.getByRole("link", { name: "Abrir respostas originais" }).click();
      await expect(adminPage.locator("#feedback-enviado-" + feedbackId)).toBeVisible();
      await expect(adminPage.getByText("Resposta sintética J2 exclusivamente local").first()).toBeVisible();
      await expect(adminPage.getByRole("link", {
        name: "Voltar à caixa de Feedbacks Semanais",
      })).toHaveAttribute("href",
        "/admin/feedback-semanal?cliente=" + clientId + "&origem=manual&mes=2026-10#recebidos");
      await adminPage.getByRole("link", { name: "Voltar à caixa de Feedbacks Semanais" }).click();
      await expect(adminPage.getByRole("heading", { name: "Histórico de recebimentos" })).toBeVisible();
      await expect(adminPage.locator('select[name="origem"]')).toHaveValue("manual");
      await expect(adminPage.locator('input[name="mes"]')).toHaveValue("2026-10");
    });

    await test.step("Patty compara duas semanas e filtra somente respostas literalmente diferentes", async () => {
      // Create a second historical period through the actual protected admin
      // request workflow, never through a fixture or a service-role write.
      const previousStart = "2026-09-28";
      const previousEnd = "2026-10-04";
      await adminPage.goto("/admin/clientes/" + clientId + "/feedback-semanal");
      const from = adminPage.getByLabel("Semana de referência · início");
      const to = adminPage.getByLabel("Semana de referência · fim");
      // Clearing first guarantees a real change event even when the date
      // was filled before Next.js finished hydrating this second request.
      await expect.poll(async () => {
        await from.fill("");
        await from.fill(previousStart);
        return await to.getAttribute("min");
      }, { timeout: 20_000 }).toBe(previousStart);
      await to.fill(previousEnd);
      await expect(adminPage.getByRole("button", { name: "Criar solicitação" })).toBeEnabled();
      await adminPage.getByRole("button", { name: "Criar solicitação" }).click();
      await expect.poll(async () => (await feedbackRecord(clientId, previousStart))?.request_source ?? null, {
        timeout: 25_000,
      }).toBe("manual");
      const older = await feedbackRecord(clientId, previousStart);
      expect(older?.id).toBeTruthy();
      expect(older?.submitted_at).toBeNull();
      const olderId = older.id;

      await clientPage.goto("/cliente/feedback-semanal");
      const olderInput = (key) => clientPage.locator("#feedback-pendente-" + olderId + " form")
        .locator('[name="' + key + '"]');
      // The two periods share a form version; one synthetic rating differs.
      // It is only a data-difference fixture, NOT an adherence signal.
      const definition = localSelect(
        "select definition from public.weekly_feedback_form_versions where id = " +
        sqlLiteral(older.form_version_id),
      );
      const oldQuestions = definition[0]?.definition?.questions;
      expect(oldQuestions).toHaveLength(21);
      for (const question of oldQuestions) {
        const value = question.input_type === "integer" ? "2" :
          question.input_type === "rating_0_10" ? "7" :
            "Resposta sintética J2 exclusivamente local";
        await expect(olderInput(question.key)).toBeVisible();
        await olderInput(question.key).fill(value);
      }
      const priorForm = clientPage.locator("#feedback-pendente-" + olderId + " form");
      await priorForm.getByRole("button", { name: "Revisar respostas para enviar" }).click();
      await expect(priorForm.getByRole("button", { name: "Confirmar envio definitivo" })).toBeVisible();
      await priorForm.getByRole("button", { name: "Confirmar envio definitivo" }).click();
      await expect.poll(async () => (await feedbackRecord(clientId, previousStart))?.submitted_at ?? null, {
        timeout: 30_000,
      }).not.toBeNull();

      await adminPage.goto("/admin/clientes/" + clientId + "/feedback-semanal?registro=" + feedbackId);
      await expect(adminPage.locator("#feedback-enviado-" + feedbackId)).toBeVisible();
      await adminPage.locator("#feedback-enviado-" + feedbackId).getByRole("link", {
        name: "Comparar com o Feedback Semanal de período anterior",
      }).click();
      await expect(adminPage.getByRole("heading", {
        name: "Comparação factual de dois Feedbacks Semanais",
      })).toBeVisible();
      await expect(adminPage.getByText("1 de 21 pergunta(s) com respostas diferentes.")).toBeVisible();
      await expect(adminPage.locator('[data-comparison-answer="true"]')).toHaveCount(21);
      await adminPage.getByRole("link", { name: "Somente respostas diferentes" }).click();
      await expect(adminPage).toHaveURL(/visao=diferentes/);
      await expect(adminPage.locator('[data-comparison-answer="true"]')).toHaveCount(1);
      await expect(adminPage.locator('[data-comparison-answer="true"]').getByText("8", { exact: true })).toBeVisible();
      await expect(adminPage.locator('[data-comparison-answer="true"]').getByText("7", { exact: true })).toBeVisible();
      await adminPage.getByRole("link", { name: "Todas as respostas" }).click();
      await expect(adminPage.locator('[data-comparison-answer="true"]')).toHaveCount(21);

      // Alternative historical comparison uses the real GET selector.
      // The detail and comparison routes both re-check current admin access.
      await adminPage.getByRole("link", { name: "Voltar ao feedback selecionado" }).click();
      const selectedFeedback = adminPage.locator("#feedback-enviado-" + feedbackId);
      await expect(selectedFeedback).toBeVisible();
      await selectedFeedback.getByText("Escolher semana anterior específica para comparar").click();
      const historicalForm = selectedFeedback.locator('form[action$="/feedback-semanal/comparar"]');
      const previousSelector = historicalForm.getByRole("combobox", { name: "Semana anterior enviada" });
      await expect(previousSelector).toBeVisible();
      await previousSelector.selectOption(olderId);
      await historicalForm.getByRole("button", { name: "Comparar semanas selecionadas" }).click();
      await expect(adminPage).toHaveURL(new RegExp("atual=" + feedbackId + "&anterior=" + olderId));
      await expect(adminPage.getByText("1 de 21 pergunta(s) com respostas diferentes.")).toBeVisible();
      const compareParams = new URL(adminPage.url()).searchParams;
      expect([...compareParams.keys()]).toEqual(["atual", "anterior"]);
    });

    await test.step("Patty retorna da decisão manual à comparação com as diferenças filtradas", async () => {
      // Reuse the exact pair created and submitted via the authenticated UI.
      // No responses, clinical texts or internal records enter the navigation URL.
      const comparisonPage = new URL(adminPage.url());
      const currentId = comparisonPage.searchParams.get("atual");
      const previousId = comparisonPage.searchParams.get("anterior");
      expect(currentId).toBe(feedbackId);
      expect(previousId).toMatch(UUID);
      await adminPage.getByRole("link", { name: "Somente respostas diferentes" }).click();
      await expect(adminPage.locator('[data-comparison-answer="true"]')).toHaveCount(1);
      const manualLink = adminPage.getByRole("link", {
        name: "Abrir avaliação e registrar decisão manual",
      });
      await expect(manualLink).toHaveAttribute("href", new RegExp(
        "feedbackAtual=" + feedbackId + "&feedbackAnterior=" + previousId +
        "&feedbackVisao=diferentes",
      ));
      await manualLink.click();
      await expect(adminPage).toHaveURL(new RegExp("/admin/avaliacoes/" + finalizedAssessmentId));
      await expect(adminPage.getByRole("link", {
        name: "Voltar à comparação dos Feedbacks Semanais",
      })).toHaveAttribute("href", new RegExp(
        "atual=" + feedbackId + "&anterior=" + previousId + "&visao=diferentes#respostas-comparadas",
      ));

      const decisionCount = () => localSelect(
        "select id, professional_decision, decision_reason from public.professional_follow_ups" +
        " where assessment_id = " + sqlLiteral(finalizedAssessmentId),
      );
      expect(decisionCount()).toHaveLength(0);
      await adminPage.locator('select[name="professionalDecision"]').selectOption("maintain");
      await adminPage.locator('textarea[name="decisionReason"]').fill(
        "Manter até revisão individual da avaliação sintética J2.",
      );
      await adminPage.getByRole("button", { name: "Registrar acompanhamento", exact: true }).click();
      await expect(adminPage.getByText("Acompanhamento profissional registrado.")).toBeVisible();
      await expect.poll(() => decisionCount().length, { timeout: 20_000 }).toBe(1);
      expect(decisionCount()[0].professional_decision).toBe("maintain");
      expect((await feedbackRecord(clientId, periodStart)).answers.q17).toBe(8);
      const publications = localSelect(
        "select id from public.protocol_publications where client_id = " + sqlLiteral(clientId),
      );
      expect(publications).toHaveLength(1);

      await adminPage.getByRole("link", {
        name: "Voltar à comparação dos Feedbacks Semanais",
      }).click();
      await expect(adminPage).toHaveURL(/visao=diferentes#respostas-comparadas/);
      await expect(adminPage.getByText("1 de 21 pergunta(s) com respostas diferentes.")).toBeVisible();
      await expect(adminPage.locator('[data-comparison-answer="true"]')).toHaveCount(1);
    });

    await test.step("Patty AAL2 revisa Feedback Semanal em celular sem overflow ou ações implícitas", async () => {
      // The existing E2E exercises the client on mobile and the professional
      // on desktop. This second REAL authenticated browser checks the mobile
      // professional inbox, original answers, comparison and assessment link.
      // It does not perform another professional decision or alter health data.
      const mobileContext = await browser.newContext({
        baseURL: baseUrl,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const professionalDecisionsBefore = localSelect(
        "select id, professional_decision, decision_reason from public.professional_follow_ups" +
        " where assessment_id = " + sqlLiteral(finalizedAssessmentId) + " order by id",
      );
      const answersBefore = await feedbackRecord(clientId, periodStart);
      const fitMobile = async (page, label) => {
        const widths = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(widths.viewport, label + " viewport should be 390 CSS pixels").toBe(390);
        expect(widths.content, label + " has no horizontal page overflow")
          .toBeLessThanOrEqual(widths.viewport + 2);
      };

      try {
        const mobileAdmin = await mobileContext.newPage();
        await loginAdminWithMfa(mobileAdmin, {
          email: admin.email,
          password: admin.password,
          totpSecret: adminTotp,
        });
        await mobileAdmin.goto("/admin/feedback-semanal?cliente=" + clientId +
          "&origem=manual&mes=2026-10");
        await expect(mobileAdmin.getByRole("heading", {
          name: "Histórico de recebimentos",
        })).toBeVisible();
        await fitMobile(mobileAdmin, "J2 professional inbox");
        const originalLink = mobileAdmin.getByRole("link", {
          name: "Abrir respostas originais",
        }).first();
        await expect(originalLink).toBeVisible();
        await originalLink.tap();

        const originalCard = mobileAdmin.locator("#feedback-enviado-" + feedbackId);
        await expect(originalCard).toBeVisible();
        await expect(originalCard.getByText(
          "Resposta sintética J2 exclusivamente local",
        ).first()).toBeVisible();
        await fitMobile(mobileAdmin, "J2 original answers");
        const compare = originalCard.getByRole("link", {
          name: "Comparar com o Feedback Semanal de período anterior",
        });
        await expect(compare).toBeVisible();
        await compare.tap();
        await expect(mobileAdmin.getByRole("heading", {
          name: "Comparação factual de dois Feedbacks Semanais",
        })).toBeVisible();
        await expect(mobileAdmin.getByText(
          "1 de 21 pergunta(s) com respostas diferentes.",
        )).toBeVisible();
        await fitMobile(mobileAdmin, "J2 weekly comparison");
        await mobileAdmin.getByRole("link", {
          name: "Somente respostas diferentes",
        }).tap();
        await expect(mobileAdmin.locator('[data-comparison-answer="true"]'))
          .toHaveCount(1);
        await fitMobile(mobileAdmin, "J2 one-answer comparison");

        const evaluationLink = mobileAdmin.getByRole("link", {
          name: "Abrir avaliação e registrar decisão manual",
        });
        await expect(evaluationLink).toBeVisible();
        await evaluationLink.tap();
        await expect(mobileAdmin).toHaveURL(new RegExp(
          "/admin/avaliacoes/" + finalizedAssessmentId,
        ));
        await expect(mobileAdmin.getByRole("link", {
          name: "Voltar à comparação dos Feedbacks Semanais",
        })).toBeVisible();
        await fitMobile(mobileAdmin, "J2 linked assessment");
        await mobileAdmin.getByRole("link", {
          name: "Voltar à comparação dos Feedbacks Semanais",
        }).tap();
        await expect(mobileAdmin.locator('[data-comparison-answer="true"]'))
          .toHaveCount(1);
        await fitMobile(mobileAdmin, "J2 comparison return");
      } finally {
        await mobileContext.close();
      }
      expect(localSelect(
        "select id, professional_decision, decision_reason from public.professional_follow_ups" +
        " where assessment_id = " + sqlLiteral(finalizedAssessmentId) + " order by id",
      )).toEqual(professionalDecisionsBefore);
      const answersAfter = await feedbackRecord(clientId, periodStart);
      expect(answersAfter.answers).toEqual(answersBefore.answers);
      expect(answersAfter.submitted_at).toBe(answersBefore.submitted_at);
      expect(localSelect(
        "select id from public.protocol_publications where client_id = " +
        sqlLiteral(clientId),
      )).toHaveLength(1);
    });

    await test.step("feedback enviado abre avaliacao existente ou novo rascunho com retorno autorizado", async () => {
      await adminPage.goto("/admin/clientes/" + clientId + "/feedback-semanal?registro=" + feedbackId);
      const submittedCard = adminPage.locator("#feedback-enviado-" + feedbackId);
      await expect(submittedCard).toBeVisible();
      await submittedCard.getByRole("link", {
        name: "Criar ou retomar avaliação para este feedback",
      }).click();
      await expect(adminPage).toHaveURL(new RegExp(
        "/admin/clientes/" + clientId + "/avaliacoes\\?feedbackAtual=" + feedbackId,
      ));
      await expect(adminPage.getByText("Continuidade do Feedback Semanal", { exact: true })).toBeVisible();
      await adminPage.getByRole("link", { name: "Voltar às respostas originais" }).click();
      await expect(adminPage.locator("#feedback-enviado-" + feedbackId)).toBeVisible();

      await adminPage.getByRole("link", {
        name: "Criar ou retomar avaliação para este feedback",
      }).click();
      await expect(adminPage.getByRole("heading", { name: "Nova avaliação" })).toBeVisible();
      await adminPage.locator('select[name="assessmentKind"]').selectOption("monthly");
      await adminPage.locator('input[name="assessedAt"]').fill("2026-10-15");
      await adminPage.getByRole("button", { name: "Criar rascunho de avaliação" }).click();
      await expect(adminPage).toHaveURL(new RegExp(
        "/admin/avaliacoes/[0-9a-f-]+\\?feedbackAtual=" + feedbackId + "#coleta",
      ));
      await expect(adminPage.getByRole("link", {
        name: "Voltar ao Feedback Semanal enviado",
      })).toBeVisible();
      await adminPage.getByRole("link", { name: "Voltar ao Feedback Semanal enviado" }).click();
      await expect(adminPage.locator("#feedback-enviado-" + feedbackId)).toBeVisible();
      // Rascunho criado pela Patty não publica protocolo e não altera a resposta.
      expect((await feedbackRecord(clientId, periodStart)).answers.q17).toBe(8);
      expect(localSelect("select id from public.protocol_publications where client_id = " +
        sqlLiteral(clientId))).toHaveLength(1);
    });

    await test.step("agenda gera semana anterior e lembrete in-app acessível sem novo estado clínico", async () => {
      // Run the existing server-side cron functions with deterministic local
      // timestamps; no cron, role grant or production schedule is modified.
      await adminPage.goto("/admin/clientes/" + clientId + "#preferencia-feedback");
      const preference = adminPage.locator("#preferencia-feedback");
      await expect(preference).toBeVisible();
      await preference.locator('select[name="channel"]').selectOption("in_app");
      const preferenceHttpStatuses = [];
      const observePreferencePost = (response) => {
        // Status codes only: never capture cookies, URLs, headers or bodies.
        if (response.request().method() === "POST" && response.url().startsWith(baseUrl)) {
          preferenceHttpStatuses.push(response.status());
        }
      };
      adminPage.on("response", observePreferencePost);
      try {
        await preference.getByRole("button", { name: "Salvar canal" }).click();
        // An action error is distinct from a delayed write or transient UI remount.
        // Do not turn a failed preference action into a synthetic DB fixture.
        await expect.poll(async () => {
          const stored = localSelect(
            "select channel_key from public.client_notification_preference_versions " +
            "where client_id = " + sqlLiteral(clientId) +
            " and purpose_key = 'weekly_feedback' and retired_at is null",
          ).map((row) => row.channel_key);
          if (stored.length === 1 && stored[0] === "in_app") return "persisted";
          if (await preference.getByText("Não foi possível atualizar", { exact: true }).count()) {
            // Only expose one of the action's fixed, non-sensitive UI error
            // categories. Never print response bodies, PII, cookies or tokens.
            const knownErrors = [
              ["invalid-client", "Cliente inválida para configurar o canal do Feedback Semanal."],
              ["invalid-version", "A versão atual da preferência é inválida. Atualize a página."],
              ["assignment", "Esta cliente não está acessível para sua atribuição atual."],
              ["invalid-channel", "Selecione um canal válido para o Feedback Semanal."],
              ["persistence", "Não foi possível alterar o canal. A configuração pode ter mudado; atualize a página e tente novamente."],
            ];
            for (const [code, label] of knownErrors) {
              if (await preference.getByText(label, { exact: true }).count()) {
                return "action-rejected:" + code;
              }
            }
            return "action-rejected:unknown";
          }
          const currentPath = new URL(adminPage.url()).pathname;
          if (currentPath.startsWith("/mfa/") || currentPath === "/login") return "authorization-redirect";
          if (preferenceHttpStatuses.some((status) => status >= 400)) return "http-failure";
          if (preferenceHttpStatuses.length) return "post-completed-without-persistence";
          return "post-not-observed";
        }, { timeout: 25_000 }).toBe("persisted");
      } finally {
        adminPage.off("response", observePreferencePost);
      }
      await expect(preference.getByText(
        "Notificação dentro do aplicativo está operacional.", { exact: true },
      )).toBeVisible({ timeout: 15_000 });

      const scheduleStart = "2026-10-12";
      const scheduleEnd = "2026-10-18";
      const generated = localSelect(
        "select public.generate_scheduled_weekly_feedback_requests(" +
          "'2026-10-19 11:00:00+00'::timestamptz) as result",
      );
      expect(generated[0].result).toBe(1);
      const scheduled = localSelect(
        "select id, period_start, period_end, request_source, submitted_at, requested_by_profile_id, " +
        "schedule_configuration_version_id from public.client_weekly_feedbacks " +
        "where client_id = " + sqlLiteral(clientId) +
        " and period_start = " + sqlLiteral(scheduleStart),
      );
      expect(scheduled).toHaveLength(1);
      const scheduledId = scheduled[0].id;
      expect(scheduled[0].period_end).toBe(scheduleEnd);
      expect(scheduled[0].request_source).toBe("schedule");
      expect(scheduled[0].requested_by_profile_id).toBeNull();
      expect(scheduled[0].schedule_configuration_version_id).toMatch(UUID);
      expect(scheduled[0].submitted_at).toBeNull();
      expect(localSelect(
        "select public.generate_scheduled_weekly_feedback_requests(" +
          "'2026-10-19 11:00:00+00'::timestamptz) as result",
      )[0].result).toBe(0);

      expect(localSelect(
        "select public.generate_weekly_feedback_reminder_events(" +
          "'2026-10-20 15:17:00+00'::timestamptz) as result",
      )[0].result).toBe(0);
      expect(localSelect(
        "select public.generate_weekly_feedback_reminder_events(" +
          "'2026-10-21 15:17:00+00'::timestamptz) as result",
      )[0].result).toBe(1);
      expect(localSelect(
        "select public.generate_weekly_feedback_reminder_events(" +
          "'2026-10-21 18:00:00+00'::timestamptz) as result",
      )[0].result).toBe(0);
      const notice = localSelect(
        "select client_id, channel_key, delivery_state, delivered_at " +
        "from public.client_notification_events where weekly_feedback_id = " + sqlLiteral(scheduledId),
      );
      expect(notice).toHaveLength(1);
      expect(notice[0].client_id).toBe(clientId);
      expect(notice[0].channel_key).toBe("in_app");
      expect(notice[0].delivery_state).toBe("delivered");
      expect(notice[0].delivered_at).not.toBeNull();

      await clientPage.goto("/cliente/avisos");
      await expect(clientPage.getByRole("heading", { name: "Avisos no aplicativo" })).toBeVisible();
      const pendingNotice = clientPage.getByRole("link", { name: "Abrir Feedback Semanal pendente" });
      await expect(pendingNotice).toHaveCount(1);
      await pendingNotice.click();
      await expect(clientPage.locator("#feedback-pendente-" + scheduledId)).toBeVisible();
      await expect(clientPage).toHaveURL(new RegExp("#feedback-pendente-" + scheduledId + "$"));

      await adminPage.goto("/admin/feedback-semanal?situacao=pendentes&cliente=" + clientId +
        "&origem=schedule&mes=2026-10");
      await expect(adminPage.getByText("Último evento registrado:", { exact: false })).toBeVisible();
      await adminPage.getByRole("link", { name: "Abrir solicitação" }).click();
      await expect(adminPage.locator("#feedback-pendente-" + scheduledId)).toBeVisible();
      expect((await feedbackRecord(clientId, scheduleStart)).submitted_at).toBeNull();
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
      // A reminder is scoped to the same client as the feedback, even after
      // an authorized scheduled generation and a manual submission.
      const otherNotices = await otherApi.from("client_notification_events")
        .select("id").eq("client_id", clientId);
      if (otherNotices.error && otherNotices.error.code !== "42501") throw otherNotices.error;
      expect(otherNotices.data ?? []).toEqual([]);
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

      await unassignedPage.goto("/admin/avaliacoes/" + finalizedAssessmentId);
      await expect(unassignedPage.getByText("Página ou registro indisponível", { exact: true })).toBeVisible();
      await expect(unassignedPage.getByRole("button", { name: "Registrar acompanhamento" })).toHaveCount(0);

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
