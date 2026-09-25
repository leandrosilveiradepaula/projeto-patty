import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseSecretKey = process.env.E2E_SUPABASE_SECRET_KEY;

if (!baseUrl || !supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Missing E2E_BASE_URL, E2E_SUPABASE_URL or E2E_SUPABASE_SECRET_KEY",
  );
}

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SOURCE_KEY = "has_health_plan";
const DETAIL_KEY = "health_plan_details";

const canonicalEmail = process.env.E2E_CANONICAL_EMAIL;
const canonicalPassword = process.env.E2E_CANONICAL_PASSWORD;
const canonicalProfileId = process.env.E2E_CANONICAL_PROFILE_ID;
const canonicalClientId = process.env.E2E_CANONICAL_CLIENT_ID;

if (
  !canonicalEmail ||
  !canonicalPassword ||
  !canonicalProfileId ||
  !canonicalClientId
) {
  throw new Error("Missing ephemeral canonical E2E client environment.");
}

const syntheticClient = {
  clientId: canonicalClientId,
  email: canonicalEmail,
  password: canonicalPassword,
  profileId: canonicalProfileId,
};

async function loadCanonicalV1() {
  const form = await admin
    .from("anamnesis_forms")
    .select("id")
    .eq("form_key", "client-anamnesis")
    .single();

  if (form.error) throw form.error;

  const version = await admin
    .from("anamnesis_form_versions")
    .select("id, version_number, published_at")
    .eq("form_id", form.data.id)
    .eq("version_number", 1)
    .not("published_at", "is", null)
    .single();

  if (version.error) throw version.error;

  const questions = await admin
    .from("anamnesis_questions")
    .select("id, question_key, label")
    .eq("form_version_id", version.data.id)
    .in("question_key", [SOURCE_KEY, DETAIL_KEY]);

  if (questions.error) throw questions.error;

  const byKey = new Map(
    questions.data.map((question) => [question.question_key, question]),
  );

  const source = byKey.get(SOURCE_KEY);
  const detail = byKey.get(DETAIL_KEY);

  if (!source || !detail) {
    throw new Error("Canonical draft-edit questions are missing.");
  }

  return {
    formVersionId: version.data.id,
    source,
    detail,
  };
}

async function cleanupCanonicalDraft(clientId, formVersionId) {
  const drafts = await admin
    .from("anamnesis_submissions")
    .select("id")
    .eq("client_id", clientId)
    .eq("form_version_id", formVersionId)
    .is("submitted_at", null);

  if (drafts.error) throw drafts.error;

  for (const draft of drafts.data) {
    const answers = await admin
      .from("anamnesis_answers")
      .delete()
      .eq("submission_id", draft.id);
    if (answers.error) throw answers.error;

    const submission = await admin
      .from("anamnesis_submissions")
      .delete()
      .eq("id", draft.id)
      .is("submitted_at", null);
    if (submission.error) throw submission.error;
  }
}

async function createCanonicalDraft(clientId, canonical) {
  await cleanupCanonicalDraft(clientId, canonical.formVersionId);

  const submission = await admin
    .from("anamnesis_submissions")
    .insert({
      client_id: clientId,
      form_version_id: canonical.formVersionId,
    })
    .select("id")
    .single();

  if (submission.error) throw submission.error;

  const sourceAnswer = await admin.from("anamnesis_answers").insert({
    answer_value: "Nao",
    form_version_id: canonical.formVersionId,
    question_id: canonical.source.id,
    submission_id: submission.data.id,
  });

  if (sourceAnswer.error) throw sourceAnswer.error;

  return submission.data.id;
}

async function loadAnswer(submissionId, questionId) {
  const answer = await admin
    .from("anamnesis_answers")
    .select("id, answer_value")
    .eq("submission_id", submissionId)
    .eq("question_id", questionId);

  if (answer.error) throw answer.error;
  return answer.data;
}

async function createUserScopedClient(email, password) {
  const client = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    throw new Error(`User-scoped RLS preflight failed: ${signedIn.error.message}`);
  }

  return client;
}

test.use({ baseURL: baseUrl });

test("cliente sintetica edita respostas reais e aplica condicional da client-anamnesis v1", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const client = syntheticClient;
  const canonical = await loadCanonicalV1();
  const submissionId = await createCanonicalDraft(client.clientId, canonical);
  const userScoped = await createUserScopedClient(client.email, client.password);

  try {
    await test.step("autentica e abre o draft canonico", async () => {
      await page.goto("/login");
      await page.getByLabel("Email").fill(client.email);
      await page.getByLabel("Senha").fill(client.password);
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).toHaveURL(/\/cliente\/?$/);

      await page.goto(`/cliente/anamnese/${submissionId}`);
      await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
      await expect(
        page.getByLabel(canonical.detail.label, { exact: true }),
      ).toHaveCount(0);
    });

    await test.step("altera a controladora de Nao para Sim e exibe o detalhe", async () => {
      const sourceForm = page
        .locator("form")
        .filter({ hasText: canonical.source.label });

      await sourceForm.getByLabel("Sim", { exact: true }).check();
      await sourceForm
        .getByRole("button", { name: "Salvar no rascunho" })
        .click();

      await expect
        .poll(async () => {
          const answers = await loadAnswer(submissionId, canonical.source.id);
          return answers.map((answer) => answer.answer_value);
        }, { timeout: 20_000 })
        .toEqual(["Sim"]);

      const userVisibleSourceAnswer = await userScoped
        .from("anamnesis_answers")
        .select("answer_value")
        .eq("submission_id", submissionId)
        .eq("question_id", canonical.source.id)
        .single();

      if (userVisibleSourceAnswer.error) {
        throw userVisibleSourceAnswer.error;
      }

      expect(userVisibleSourceAnswer.data.answer_value).toBe("Sim");

      await expect(
        page.getByLabel(canonical.detail.label, { exact: true }),
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step("salva o detalhe condicional", async () => {
      const detailInput = page.getByLabel(canonical.detail.label, {
        exact: true,
      });
      const detailForm = detailInput.locator("xpath=ancestor::form");

      await detailInput.fill("Plano E2E");
      await detailForm
        .getByRole("button", { name: "Salvar no rascunho" })
        .click();

      await expect
        .poll(async () => {
          const answers = await loadAnswer(submissionId, canonical.detail.id);
          return answers.map((answer) => answer.answer_value);
        }, { timeout: 20_000 })
        .toEqual(["Plano E2E"]);
    });

    await test.step("altera a controladora de Sim para Nao sem duplicar resposta", async () => {
      const sourceForm = page
        .locator("form")
        .filter({ hasText: canonical.source.label });

      await sourceForm.getByLabel("Nao", { exact: true }).check();
      await sourceForm
        .getByRole("button", { name: "Salvar no rascunho" })
        .click();

      await expect
        .poll(async () => {
          const answers = await loadAnswer(submissionId, canonical.source.id);
          return answers.map((answer) => answer.answer_value);
        }, { timeout: 20_000 })
        .toEqual(["Nao"]);

      await expect(
        page.getByLabel(canonical.detail.label, { exact: true }),
      ).toHaveCount(0, { timeout: 20_000 });
    });

    const submission = await admin
      .from("anamnesis_submissions")
      .select("submitted_at")
      .eq("id", submissionId)
      .single();

    if (submission.error) throw submission.error;
    expect(submission.data.submitted_at).toBeNull();
  } finally {
    await userScoped.auth.signOut();
    await cleanupCanonicalDraft(client.clientId, canonical.formVersionId);
  }

  const residue = await admin
    .from("anamnesis_submissions")
    .select("id")
    .eq("client_id", client.clientId)
    .eq("form_version_id", canonical.formVersionId)
    .is("submitted_at", null);

  if (residue.error) throw residue.error;
  expect(residue.data).toHaveLength(0);
});
