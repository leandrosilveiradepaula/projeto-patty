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
function createExecution(clientId, submissionId, actor, promptId) {
  return insert("ai_executions", {
    client_id: clientId,
    anamnesis_submission_id: submissionId,
    purpose_key: "anamnesis_review",
    prompt_version_id: promptId,
    initiated_by_profile_id: actor,
    provider: "synthetic-only",
    model_identifier: "j7-local-fixture",
  });
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
  const startedExecutionId = createExecution(ownerClientId, submission.submissionId, staff.id, promptId);

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
    await expect(admin.getByText("Resultado da IA indisponível para revisão", { exact: true })).toBeVisible();
    await expect(admin.getByText("Execução sem estado terminal", { exact: true })).toBeVisible();
    await expect(admin.getByText("J7 conteúdo sintético com referência de outra cliente.", { exact: true })).toHaveCount(0);
    await expect(admin.getByText(validFindingText, { exact: true })).toBeVisible();

    await test.step("Accepting a finding preserves output and records a separate decision", async () => {
      const finding = admin.getByText(validFindingText, { exact: true }).locator("..");
      await finding.getByRole("button", { name: "Aceitar como observação interna" }).click();
      await expect.poll(() => rows(
        "select id from public.ai_finding_actions where execution_id=" + literal(validExecutionId) +
        " and finding_index=0 and action='accepted_internal_observation'",
      ).length, { timeout: 25000 }).toBe(1);
      await expect(admin.getByText("Aceito como observação interna", { exact: true })).toBeVisible();
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
      const unauthorized = await otherAdmin.goto(reviewURL);
      expect(unauthorized?.status()).toBe(404);
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
