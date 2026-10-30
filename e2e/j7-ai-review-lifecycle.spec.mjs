import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { generateTotp, loginAdminWithMfa } from "./helpers/admin-auth.mjs";

// This test may only run against disposable localhost Next.js and Supabase.
// Neither a real OpenAI key nor health-data processing is allowed here.
const baseURL = process.env.J7_E2E_BASE_URL;
const apiURL = process.env.J7_E2E_SUPABASE_URL;
const anonKey = process.env.J7_E2E_ANON_KEY;
const serviceKey = process.env.J7_E2E_SERVICE_ROLE_KEY;
if (
  process.env.J7_E2E_LOCAL_ONLY !== "true" ||
  baseURL !== "http://127.0.0.1:3000" ||
  apiURL !== "http://127.0.0.1:54321" ||
  !anonKey || !serviceKey ||
  process.env.OPENAI_HEALTH_DATA_PROCESSING_ENABLED !== "false" ||
  Boolean(process.env.OPENAI_API_KEY)
) {
  throw new Error("J7 requires disposable localhost services and disabled external AI");
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const writable = new Set([
  "profiles", "user_roles", "clients", "client_assignments",
  "anamnesis_forms", "anamnesis_form_versions", "anamnesis_sections",
  "anamnesis_questions", "anamnesis_submissions", "anamnesis_answers",
  "ai_executions",
]);
const service = createClient(apiURL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function anonClient() {
  return createClient(apiURL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
function literal(value) {
  if (value === null) return "NULL";
  if (typeof value === "object") return literal(JSON.stringify(value)) + "::jsonb";
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    throw new TypeError("Unsupported synthetic SQL value");
  }
  return "'" + String(value).replaceAll("'", "''") + "'";
}
function sql(query) {
  if (
    process.env.J7_E2E_LOCAL_ONLY !== "true" ||
    apiURL !== "http://127.0.0.1:54321"
  ) throw new Error("J7 SQL boundary rejected nonlocal database");
  return execFileSync("docker", [
    "exec", "-i", "supabase_db_projeto-patty", "psql",
    "-X", "-q", "-U", "postgres", "-d", "postgres",
    "-A", "-t", "-v", "ON_ERROR_STOP=1",
  ], { input: query.trimEnd() + "\n", encoding: "utf8", timeout: 15000 }).trim();
}
function rows(query) {
  return JSON.parse(sql(
    "select coalesce(json_agg(row_to_json(t)),'[]'::json)::text from (" + query + ") t;",
  ));
}
function insert(table, fields) {
  if (!writable.has(table) || !Object.keys(fields).every(k => /^[a-z][a-z0-9_]*$/.test(k))) {
    throw new Error("J7 fixture insert denied");
  }
  const pk = table === "user_roles" ? "profile_id" : "id";
  const id = sql(
    "insert into public." + table + " (" + Object.keys(fields).join(",") +
    ") values (" + Object.values(fields).map(literal).join(",") +
    ") returning " + pk + ";",
  );
  if (!UUID.test(id)) throw new Error("J7 fixture did not return a UUID");
  return id;
}
function scopedCount(actor, aal, table, id) {
  const columnByTable = {
    anamnesis_submissions: "id",
    ai_executions: "id",
    ai_execution_outputs: "execution_id",
    ai_finding_actions: "id",
    anamnesis_reviews: "id",
  };
  if (!UUID.test(actor) || !UUID.test(id) || !["aal1", "aal2"].includes(aal) || !columnByTable[table]) {
    throw new Error("J7 RLS count probe denied");
  }
  const claims = JSON.stringify({ sub: actor, role: "authenticated", aal });
  return Number(sql([
    "begin;",
    "set local statement_timeout='5s';",
    "set local role authenticated;",
    "set local request.jwt.claims=" + literal(claims) + ";",
    "set local request.jwt.claim.sub=" + literal(actor) + ";",
    "select count(*) from public." + table + " where " + columnByTable[table] + "=" + literal(id) + ";",
    "rollback;",
  ].join("\n")));
}
async function identity(role, label, nonce) {
  const email = "e2e-j7-" + label + "-" + nonce + "@example.invalid";
  if (!/^e2e-j7-(staff|unassigned|owner|foreign)-[0-9a-f]{16}@example\.invalid$/.test(email)) {
    throw new Error("Only J7 synthetic identities are allowed");
  }
  const password = "J7-" + randomBytes(18).toString("base64url") + "-Aa1!";
  const created = await service.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (created.error || !created.data?.user?.id) {
    throw created.error ?? new Error("Synthetic Auth creation failed");
  }
  const id = created.data.user.id;
  insert("profiles", { id, display_name: "J7 Synthetic " + label });
  insert("user_roles", { profile_id: id, role });
  return { id, email, password };
}
async function enrollTotp(user) {
  const client = anonClient();
  const signed = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (signed.error) throw signed.error;
  try {
    const enrolled = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "J7 disposable TOTP",
    });
    if (enrolled.error) throw enrolled.error;
    const challenge = await client.auth.mfa.challenge({ factorId: enrolled.data.id });
    if (challenge.error) throw challenge.error;
    const verified = await client.auth.mfa.verify({
      challengeId: challenge.data.id,
      factorId: enrolled.data.id,
      code: generateTotp(enrolled.data.totp.secret),
    });
    if (verified.error) throw verified.error;
    return enrolled.data.totp.secret;
  } finally {
    await client.auth.signOut();
  }
}
async function loginClient(page, user) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cliente\/?$/, { timeout: 20000 });
}
function createSubmission(clientId, formVersionId, questionIds) {
  const submissionId = insert("anamnesis_submissions", {
    client_id: clientId, form_version_id: formVersionId,
  });
  const a = insert("anamnesis_answers", {
    submission_id: submissionId, form_version_id: formVersionId,
    question_id: questionIds[0], answer_value: JSON.stringify("J7 resposta sintética A"),
  });
  const b = insert("anamnesis_answers", {
    submission_id: submissionId, form_version_id: formVersionId,
    question_id: questionIds[1], answer_value: JSON.stringify("J7 resposta sintética B"),
  });
  const submitted = sql(
    "update public.anamnesis_submissions set submitted_at=statement_timestamp()" +
    " where id=" + literal(submissionId) + " returning id;",
  );
  expect(submitted).toBe(submissionId);
  return { submissionId, answerIds: [a, b] };
}
function createExecution(clientId, submissionId, actor, promptId, includedAnswerIds = null) {
  const executionId = insert("ai_executions", {
    client_id: clientId,
    anamnesis_submission_id: submissionId,
    purpose_key: "anamnesis_review",
    prompt_version_id: promptId,
    initiated_by_profile_id: actor,
    provider: "synthetic-only",
    model_identifier: "j7-local-fixture",
  });
  // Simulate the immutable source ledger written by the production start RPC.
  // Only disposable, local, synthetic rows are inserted here.
  const allAnswerIds = rows(
    "select id from public.anamnesis_answers where submission_id=" +
    literal(submissionId) + " order by id",
  ).map(row => row.id);
  const included = new Set(includedAnswerIds ?? allAnswerIds);
  for (const answerId of allAnswerIds) {
    if (!included.has(answerId)) continue;
    const sourceId = sql(
      "insert into public.ai_execution_sources" +
      " (execution_id,client_id,source_kind,anamnesis_answer_id,anamnesis_submission_id)" +
      " values (" + [
        executionId, clientId, "anamnesis_answer", answerId, submissionId,
      ].map(literal).join(",") + ") returning id;",
    );
    expect(sourceId).toMatch(UUID);
  }
  return executionId;
}
function completeExecution(executionId, clientId, content) {
  // The DB enforces exactly one output for each completed execution.
  // Both mutations must share a transaction; never weaken this invariant.
  sql([
    "begin;",
    "insert into public.ai_execution_outputs (execution_id,client_id,content) values (" +
      [executionId, clientId, content].map(literal).join(",") + ");",
    "update public.ai_executions set status='completed',completed_at=statement_timestamp()" +
      " where id=" + literal(executionId) + ";",
    "commit;",
  ].join("\n"));
}
function executionRows(executionId) {
  return rows("select e.id,e.status,o.content from public.ai_executions e" +
    " left join public.ai_execution_outputs o on o.execution_id=e.id" +
    " where e.id=" + literal(executionId));
}
test.use({ baseURL });

test("J7: synthetic AI results require authenticated manual actions and preserve scope", async ({ browser }) => {
  test.setTimeout(360000);
  const nonce = randomBytes(8).toString("hex");
  const staff = await identity("admin", "staff", nonce);
  const unassigned = await identity("admin", "unassigned", nonce);
  const owner = await identity("client", "owner", nonce);
  const foreign = await identity("client", "foreign", nonce);
  const ownerClientId = insert("clients", {
    profile_id: owner.id, full_name: "J7 Cliente Sintética", status: "active",
  });
  const foreignClientId = insert("clients", {
    profile_id: foreign.id, full_name: "J7 Cliente Externa", status: "active",
  });
  insert("client_assignments", { client_id: ownerClientId, staff_profile_id: staff.id });

  const formId = insert("anamnesis_forms", { form_key: "e2e-j7-" + nonce });
  const formVersionId = insert("anamnesis_form_versions", {
    form_id: formId, version_number: 1,
  });
  const sectionId = insert("anamnesis_sections", {
    form_version_id: formVersionId, section_key: "j7-synthetic",
    title: "Perguntas sintéticas", display_order: 1,
  });
  const questionIds = [
    insert("anamnesis_questions", {
      form_version_id: formVersionId, section_id: sectionId, question_key: "j7-first",
      label: "J7 pergunta sintética A", display_order: 1, answer_type: "text", required: true,
    }),
    insert("anamnesis_questions", {
      form_version_id: formVersionId, section_id: sectionId, question_key: "j7-second",
      label: "J7 pergunta sintética B", display_order: 2, answer_type: "text", required: true,
    }),
    insert("anamnesis_questions", {
      form_version_id: formVersionId, section_id: sectionId, question_key: "j7-missing",
      label: "J7 pergunta sintética opcional", display_order: 3, answer_type: "text", required: false,
    }),
  ];
  questionIds.push(insert("anamnesis_questions", {
    form_version_id: formVersionId,
    section_id: sectionId,
    question_key: "j7-not-applicable",
    label: "J7 pergunta condicional não aplicável",
    display_order: 4,
    answer_type: "text",
    required: false,
    applicability_source_question_id: questionIds[0],
    applicability_expected_answer: JSON.stringify("Resposta diferente da sintética A"),
  }));
  sql("update public.anamnesis_form_versions set published_at=statement_timestamp()" +
    " where id=" + literal(formVersionId) + ";");

  const submission = createSubmission(ownerClientId, formVersionId, questionIds);
  const foreignSubmission = createSubmission(foreignClientId, formVersionId, questionIds);
  const promptId = sql(
    "select id from public.ai_prompt_versions where prompt_key='anamnesis_review'" +
    " order by version_number desc limit 1;",
  );
  expect(promptId).toMatch(UUID);

  const validFindingText = "J7 achado sintético aguardando decisão da Patty.";
  const secondFindingText = "J7 possível divergência entre duas respostas sintéticas.";
  const noteText = "J7 nota profissional sintética, registrada manualmente.";
  const validExecutionId = createExecution(ownerClientId, submission.submissionId, staff.id, promptId);
  const validFindings = [
    {
      type: "clarification_needed",
      source_answer_ids: [submission.answerIds[0]],
      explanation: validFindingText,
      suggested_follow_up_question: "J7 pergunta de esclarecimento sintética?",
    },
    {
      type: "possible_contradiction",
      source_answer_ids: submission.answerIds,
      explanation: secondFindingText,
    },
    {
      type: "missing_answer",
      source_answer_ids: [],
      target_question_id: questionIds[2],
      explanation: "J7 resposta sintética opcional ausente.",
    },
  ];
  completeExecution(validExecutionId, ownerClientId, { findings: validFindings });

  // Deliberately inconsistent *synthetic* legacy action, inserted by the
  // disposable localhost-only PostgreSQL fixture, never through the app.
  // It verifies that the UI does not attach a decision to the wrong finding.
  const inconsistentActionId = sql(
    "insert into public.ai_finding_actions" +
    " (execution_id,client_id,finding_index,finding_snapshot,action,acted_by_profile_id)" +
    " values (" + [
      validExecutionId, ownerClientId, 2,
      { ...validFindings[2], explanation: "J7 cópia histórica sintética divergente." },
      "accepted_internal_observation", staff.id,
    ].map(literal).join(",") + ") returning id;",
  );
  expect(inconsistentActionId).toMatch(UUID);

  const emptyExecutionId = createExecution(ownerClientId, submission.submissionId, staff.id, promptId);
  completeExecution(emptyExecutionId, ownerClientId, { findings: [] });
  const invalidExecutionId = createExecution(ownerClientId, submission.submissionId, staff.id, promptId);
  completeExecution(invalidExecutionId, ownerClientId, {
    findings: [{
      type: "clarification_needed",
      source_answer_ids: [foreignSubmission.answerIds[0]],
      explanation: "J7 conteúdo sintético com referência de outra cliente.",
    }],
  });
  // Same-submission answer B exists, but only answer A was included when this
  // separate execution started. This must fail exactly like a foreign source.
  const unrecordedSourceExecutionId = createExecution(
    ownerClientId, submission.submissionId, staff.id, promptId,
    [submission.answerIds[0]],
  );
  completeExecution(unrecordedSourceExecutionId, ownerClientId, {
    findings: [{
      type: "clarification_needed",
      source_answer_ids: [submission.answerIds[1]],
      explanation: "J7 achado sintético de resposta não incluída nesta execução.",
    }],
  });
  const falselyMissingAnsweredExecutionId = createExecution(
    ownerClientId, submission.submissionId, staff.id, promptId,
  );
  completeExecution(falselyMissingAnsweredExecutionId, ownerClientId, {
    findings: [{
      type: "missing_answer",
      source_answer_ids: [],
      target_question_id: questionIds[0],
      explanation: "J7 alegação sintética falsa sobre pergunta já respondida.",
    }],
  });
  const falselyMissingHiddenExecutionId = createExecution(
    ownerClientId, submission.submissionId, staff.id, promptId,
  );
  completeExecution(falselyMissingHiddenExecutionId, ownerClientId, {
    findings: [{
      type: "missing_answer",
      source_answer_ids: [],
      target_question_id: questionIds[3],
      explanation: "J7 alegação sintética falsa sobre pergunta condicional não aplicável.",
    }],
  });
  const startedExecutionId = createExecution(ownerClientId, submission.submissionId, staff.id, promptId);

  // Independent service-only RPC probe on a separate disposable execution.
  // Failure is reported by SQLSTATE alone; no note, source or prompt is logged.
  const probeExecutionId = createExecution(ownerClientId, submission.submissionId, staff.id, promptId);
  const probe = await service.rpc("recover_started_ai_execution", {
    p_execution_id: probeExecutionId,
    p_recovered_by_profile_id: staff.id,
    p_reason: "J7 synthetic local service-role recovery preflight",
  });
  if (probe.error) {
    // Classification only: never log any raw DB response or synthetic answer.
    const message = String(probe.error.message ?? "");
    const category = message.includes("AI recovery requires an assigned admin")
      ? "actor-not-assigned"
      : message.includes("permission denied for function")
        ? "function-execute-grant"
        : message.includes("permission denied for table")
          ? "table-privilege"
          : message.includes("row-level security")
            ? "rls"
            : "other";
    // Only expose a fixed allowlist of table identifiers, never raw DB errors
    // or synthetic answers. This identifies the missing grant without
    // altering privileges to get the test green.
    const table = /permission denied for table ([a-z_]+)/.exec(message)?.[1];
    const allowlistedTables = new Set([
      "ai_executions", "ai_execution_outputs", "ai_execution_sources",
      "ai_execution_failure_responses", "client_assignments", "user_roles",
      "profiles", "clients", "anamnesis_submissions",
    ]);
    const safeTable = table && allowlistedTables.has(table) ? table : "unspecified";
    const grants = rows("select " +
      "has_table_privilege('service_role','public.ai_executions','UPDATE') as can_update_execution," +
      "has_table_privilege('service_role','public.client_assignments','SELECT') as can_read_assignment," +
      "has_table_privilege('service_role','public.user_roles','SELECT') as can_read_roles")[0];
    throw new Error("J7 local recovery RPC failed: SQLSTATE " +
      (probe.error.code ?? "unknown") + ", category=" + category +
      ", relation=" + safeTable +
      ", local_role_grants=" + JSON.stringify(grants));
  }
  expect(executionRows(probeExecutionId)[0].status).toBe("failed");

  expect(scopedCount(staff.id, "aal1", "ai_executions", validExecutionId)).toBe(0);
  expect(scopedCount(staff.id, "aal2", "ai_executions", validExecutionId)).toBe(1);
  expect(scopedCount(staff.id, "aal2", "ai_execution_outputs", validExecutionId)).toBe(1);
  expect(scopedCount(unassigned.id, "aal2", "ai_executions", validExecutionId)).toBe(0);
  expect(scopedCount(owner.id, "aal1", "ai_executions", validExecutionId)).toBe(0);
  expect(scopedCount(foreign.id, "aal1", "ai_execution_outputs", validExecutionId)).toBe(0);

  const staffTotp = await enrollTotp(staff);
  const unassignedTotp = await enrollTotp(unassigned);
  const adminContext = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const unassignedContext = await browser.newContext({ baseURL });
  const clientContext = await browser.newContext({ baseURL });
  try {
    const admin = await adminContext.newPage();
    await loginAdminWithMfa(admin, {
      email: staff.email, password: staff.password, totpSecret: staffTotp,
    });
    const reviewURL = "/admin/anamneses/" + submission.submissionId + "/ia";
    const loaded = await admin.goto(reviewURL);
    expect(loaded?.status()).toBe(200);
    await expect(admin.getByText("Revisão humana obrigatória", { exact: true })).toBeVisible();
    await expect(admin.getByText("J7 Cliente Sintética", { exact: true })).toBeVisible();
    await expect(admin.getByRole("button", { name: "Executar análise assistida" })).toBeDisabled();
    await expect(admin.getByText("Execução concluída sem achados para revisão.", { exact: true })).toBeVisible();
    await expect(admin.getByText("Resultado da IA indisponível para revisão", { exact: true })).toHaveCount(4);
    await expect(admin.getByText(
      "J7 alegação sintética falsa sobre pergunta já respondida.", { exact: true },
    )).toHaveCount(0);
    await expect(admin.getByText(
      "J7 alegação sintética falsa sobre pergunta condicional não aplicável.", { exact: true },
    )).toHaveCount(0);
    await expect(admin.getByText("J7 achado sintético de resposta não incluída nesta execução.", { exact: true })).toHaveCount(0);
    expect(rows(
      "select anamnesis_answer_id from public.ai_execution_sources where execution_id=" +
      literal(unrecordedSourceExecutionId),
    )).toEqual([{ anamnesis_answer_id: submission.answerIds[0] }]);
    await expect(admin.getByText("Execução sem estado terminal", { exact: true })).toBeVisible();
    await expect(admin.getByText("J7 conteúdo sintético com referência de outra cliente.", { exact: true })).toHaveCount(0);
    await expect(admin.getByText(validFindingText, { exact: true })).toBeVisible();

    await test.step("AI queue opens the exact started execution and prioritizes existing review on mobile and desktop", async () => {
      for (const width of [390, 1440]) {
        await admin.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await admin.goto("/admin/ia");
        const row = admin.locator("#execucao-ia-" + startedExecutionId);
        await expect(row).toBeVisible();
        const direct = row.getByRole("link", { name: /Abrir revisão da Anamnese/ });
        await expect(direct).toHaveAttribute(
          "href", reviewURL + "#execucao-ia-" + startedExecutionId,
        );
        await direct.focus();
        await expect(direct).toBeFocused();
        await admin.keyboard.press("Enter");
        await expect(admin).toHaveURL(new RegExp("#execucao-ia-" + startedExecutionId + "$"));
        await expect(admin.locator("#execucao-ia-" + startedExecutionId)).toBeVisible();
        const order = await admin.getByText("Histórico da IA", { exact: true }).evaluate(
          element => Math.round(element.getBoundingClientRect().top + window.scrollY),
        );
        const newExecution = await admin.getByText("Nova execução", { exact: true }).evaluate(
          element => Math.round(element.getBoundingClientRect().top + window.scrollY),
        );
        expect(order).toBeLessThan(newExecution);
        await expect(admin.getByRole("link", { name: "Voltar à fila de análises" })).toHaveAttribute("href", "/admin/ia");
        const widths = await admin.evaluate(() => ({
          actual: document.documentElement.scrollWidth,
          viewport: document.documentElement.clientWidth,
        }));
        expect(widths.actual).toBeLessThanOrEqual(widths.viewport + 2);
      }
      await admin.goto(reviewURL);
    });

    await test.step("Inconsistent historical snapshots remain auditable but never become a decision on a different finding", async () => {
      await expect(admin.getByText("Vínculo histórico de decisão exige conferência", { exact: true })).toBeVisible();
      const inconsistent = admin.getByText("J7 resposta sintética opcional ausente.", { exact: true }).locator("..");
      await expect(inconsistent.getByText("Decisão histórica não associável", { exact: true })).toBeVisible();
      await expect(inconsistent.getByRole("button", { name: "Aceitar como observação interna" })).toHaveCount(0);
      await expect(inconsistent.getByRole("button", { name: "Salvar como anotação da Patty" })).toHaveCount(0);
      const next = admin.getByRole("link", { name: "Ir ao primeiro achado aguardando decisão" });
      await expect(next).toHaveAttribute("href", "#achado-ia-" + validExecutionId + "-0");
      await next.click();
      await expect(admin).toHaveURL(new RegExp("#achado-ia-" + validExecutionId + "-0$"));
      await admin.getByText("Consultar decisões históricas sem vínculo confirmado", { exact: true }).click();
      await admin.getByText("Ver identificadores de auditoria", { exact: true }).click();
      await expect(admin.getByText("Ação: " + inconsistentActionId, { exact: true })).toBeVisible();
      await admin.goto(reviewURL);
    });

    await test.step("AI sources open exact original answers and missing questions on mobile", async () => {
      const first = admin.getByText(validFindingText, { exact: true }).locator("..");
      const source = first.getByRole("link", { name: "Ver resposta original: J7 pergunta sintética A" });
      await expect(source).toHaveAttribute(
        "href", "/admin/anamneses/" + submission.submissionId + "#resposta-" + questionIds[0],
      );
      await source.click();
      const original = admin.locator('[id="resposta-' + questionIds[0] + '"]');
      await expect(original).toBeVisible();
      await expect(original).toContainText("J7 pergunta sintética A");
      await expect(original).toContainText("J7 resposta sintética A");

      await admin.goto(reviewURL);
      const missing = admin.getByText("J7 resposta sintética opcional ausente.", { exact: true }).locator("..");
      const missingLink = missing.getByRole("link", { name: "Ver pergunta original: J7 pergunta sintética opcional" });
      await expect(missingLink).toHaveAttribute(
        "href", "/admin/anamneses/" + submission.submissionId + "#resposta-" + questionIds[2],
      );
      await missingLink.click();
      const target = admin.locator('[id="resposta-' + questionIds[2] + '"]');
      await expect(target).toBeVisible();
      await expect(target).toContainText("Não respondida");
      await admin.goto(reviewURL);
    });

    await test.step("Accepting a finding preserves output and records a separate decision", async () => {
      const finding = admin.getByText(validFindingText, { exact: true }).locator("..");
      await finding.getByRole("button", { name: "Aceitar como observação interna" }).click();
      await expect.poll(() => rows(
        "select id from public.ai_finding_actions where execution_id=" + literal(validExecutionId) +
        " and finding_index=0 and action='accepted_internal_observation'",
      ).length, { timeout: 25000 }).toBe(1);
      await expect(admin.getByText("Aceito como observação interna", { exact: true })).toBeVisible();
      await expect(finding.getByText("Responsável pela decisão: J7 Synthetic staff", { exact: true })).toBeVisible();
      await finding.getByText("Ver identificador do responsável", { exact: true }).click();
      await expect(finding.getByText(staff.id, { exact: true })).toBeVisible();
      expect(executionRows(validExecutionId)[0].content).toEqual({ findings: validFindings });
    });

    await test.step("Saving Patty's note creates an exact, independently authorized history entry", async () => {
      const finding = admin.getByText(secondFindingText, { exact: true }).locator("..");
      await finding.getByLabel("Anotação da Patty").fill(noteText);
      await finding.getByRole("button", { name: "Salvar como anotação da Patty" }).click();
      await expect.poll(() => rows(
        "select id from public.ai_finding_actions where execution_id=" + literal(validExecutionId) +
        " and finding_index=1 and action='converted_to_patty_note'",
      ).length, { timeout: 25000 }).toBe(1);
      const action = rows(
        "select id,anamnesis_review_id,finding_snapshot from public.ai_finding_actions" +
        " where execution_id=" + literal(validExecutionId) + " and finding_index=1",
      )[0];
      expect(action.finding_snapshot).toEqual(validFindings[1]);
      await expect(finding.getByText("Responsável pela decisão: J7 Synthetic staff", { exact: true })).toBeVisible();
      await expect(admin.getByText("2 de 3 achado(s) com decisão humana vinculada; 0 aguardando decisão.", { exact: true })).toBeVisible();
      const review = rows(
        "select id,submission_id,reviewer_profile_id,note from public.anamnesis_reviews" +
        " where id=" + literal(action.anamnesis_review_id),
      )[0];
      expect(review).toEqual({
        id: action.anamnesis_review_id,
        submission_id: submission.submissionId,
        reviewer_profile_id: staff.id,
        note: noteText,
      });
      await expect(admin.getByRole("link", { name: "Abrir anotação profissional exata" }))
        .toHaveAttribute("href",
          "/admin/anamneses/" + submission.submissionId +
          "/revisao#revisao-" + action.anamnesis_review_id);
      await admin.getByRole("link", { name: "Abrir anotação profissional exata" }).click();
      await expect(admin.getByText(noteText, { exact: true })).toBeVisible();
      expect(scopedCount(staff.id, "aal2", "ai_finding_actions", action.id)).toBe(1);
      expect(scopedCount(unassigned.id, "aal2", "ai_finding_actions", action.id)).toBe(0);
      expect(scopedCount(owner.id, "aal1", "anamnesis_reviews", review.id)).toBe(0);
    });

    await test.step("Interrupted execution requires an explicit human recovery reason", async () => {
      await admin.goto(reviewURL);
      await admin.getByLabel("Motivo da recuperação manual").fill(
        "J7 recuperação local sintética após interrupção voluntária.",
      );
      await admin.getByRole("button", { name: "Encerrar como falha e liberar nova tentativa" }).click();
      await expect.poll(() => executionRows(startedExecutionId)[0]?.status, {
        timeout: 25000,
      }).toBe("failed");
      const failed = rows(
        "select failure_stage,failure_code from public.ai_executions where id=" + literal(startedExecutionId),
      )[0];
      expect(failed).toEqual({ failure_stage: "recovery", failure_code: "manual_recovery" });
      expect(rows("select execution_id from public.ai_execution_outputs where execution_id=" +
        literal(startedExecutionId))).toHaveLength(0);
    });

    await test.step("Unassigned staff and clients cannot read or act on AI history", async () => {
      const otherAdmin = await unassignedContext.newPage();
      await loginAdminWithMfa(otherAdmin, {
        email: unassigned.email, password: unassigned.password, totpSecret: unassignedTotp,
      });
      expect(scopedCount(unassigned.id, "aal2", "anamnesis_submissions", submission.submissionId)).toBe(0);
      const unauthorized = await otherAdmin.goto(reviewURL);
      // Next.js can stream the shell with 200 before a Server Component calls
      // notFound(). Verify the denial UI and RLS, never rely on status alone.
      expect([200, 404]).toContain(unauthorized?.status());
      await expect(otherAdmin.getByText("Página ou registro indisponível", { exact: true })).toBeVisible();
      await expect(otherAdmin.getByText("J7 Cliente Sintética", { exact: true })).toHaveCount(0);
      await expect(otherAdmin.getByText(validFindingText, { exact: true })).toHaveCount(0);
      const clientPage = await clientContext.newPage();
      await loginClient(clientPage, owner);
      await clientPage.goto(reviewURL);
      await expect(clientPage.getByText(validFindingText, { exact: true })).toHaveCount(0);
      expect(scopedCount(staff.id, "aal2", "anamnesis_submissions", foreignSubmission.submissionId)).toBe(0);
      expect(scopedCount(owner.id, "aal1", "anamnesis_submissions", submission.submissionId)).toBe(1);
      expect(scopedCount(foreign.id, "aal1", "anamnesis_submissions", submission.submissionId)).toBe(0);
    });

    const originals = rows(
      "select id,answer_value from public.anamnesis_answers where submission_id=" +
      literal(submission.submissionId) + " order by id",
    );
    expect(originals).toHaveLength(2);
    expect(originals.map(a => a.answer_value).sort()).toEqual([
      "J7 resposta sintética A", "J7 resposta sintética B",
    ]);
    expect(rows("select id from public.ai_draft_versions where client_id=" +
      literal(ownerClientId))).toHaveLength(0);
    expect(executionRows(emptyExecutionId)[0].content).toEqual({ findings: [] });
    expect(executionRows(invalidExecutionId)[0].content.findings).toHaveLength(1);
    expect(await admin.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(2);
  } finally {
    await Promise.all([
      adminContext.close(), unassignedContext.close(), clientContext.close(),
    ]);
  }
});
