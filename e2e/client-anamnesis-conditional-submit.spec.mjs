import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseSecretKey = process.env.E2E_SUPABASE_SECRET_KEY;
const canonicalEmail = process.env.E2E_CANONICAL_EMAIL;
const canonicalPassword = process.env.E2E_CANONICAL_PASSWORD;
const canonicalClientId = process.env.E2E_CANONICAL_CLIENT_ID;

if (
  !baseUrl ||
  !supabaseUrl ||
  !supabaseSecretKey ||
  !canonicalEmail ||
  !canonicalPassword ||
  !canonicalClientId
) {
  throw new Error(
    "Missing conditional-submit E2E environment.",
  );
}

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createTemporaryAnamnesisFixture(clientId) {
  const suffix = randomBytes(8).toString("hex");

  const form = await admin
    .from("anamnesis_forms")
    .insert({ form_key: `e2e-conditional-submit-${suffix}` })
    .select("id")
    .single();

  if (form.error) throw form.error;

  const version = await admin
    .from("anamnesis_form_versions")
    .insert({
      form_id: form.data.id,
      published_at: new Date().toISOString(),
      version_number: 1,
    })
    .select("id")
    .single();

  if (version.error) throw version.error;

  const section = await admin
    .from("anamnesis_sections")
    .insert({
      display_order: 1,
      form_version_id: version.data.id,
      section_key: "e2e-main",
      title: "E2E Condicional",
    })
    .select("id")
    .single();

  if (section.error) throw section.error;

  const source = await admin
    .from("anamnesis_questions")
    .insert({
      answer_type: "single_choice",
      display_order: 1,
      form_version_id: version.data.id,
      label: "E2E possui detalhe condicional?",
      options: ["Sim", "Nao"],
      question_key: "e2e-source",
      required: true,
      section_id: section.data.id,
    })
    .select("id")
    .single();

  if (source.error) throw source.error;

  const detail = await admin
    .from("anamnesis_questions")
    .insert({
      answer_type: "text",
      applicability_expected_answer: "Sim",
      applicability_source_question_id: source.data.id,
      display_order: 2,
      form_version_id: version.data.id,
      label: "E2E detalhe condicional",
      question_key: "e2e-detail",
      required: true,
      section_id: section.data.id,
    })
    .select("id")
    .single();

  if (detail.error) throw detail.error;

  const guard = await admin
    .from("anamnesis_questions")
    .insert({
      answer_type: "text",
      display_order: 3,
      form_version_id: version.data.id,
      label: "E2E campo obrigatório de segurança",
      question_key: "e2e-guard",
      required: true,
      section_id: section.data.id,
    })
    .select("id")
    .single();

  if (guard.error) throw guard.error;

  const submission = await admin
    .from("anamnesis_submissions")
    .insert({
      client_id: clientId,
      form_version_id: version.data.id,
    })
    .select("id")
    .single();

  if (submission.error) throw submission.error;

  return {
    detailQuestionId: detail.data.id,
    formId: form.data.id,
    formVersionId: version.data.id,
    guardQuestionId: guard.data.id,
    sectionId: section.data.id,
    sourceQuestionId: source.data.id,
    submissionId: submission.data.id,
  };
}

async function cleanupTemporaryAnamnesisFixture(fixture) {
  const answers = await admin
    .from("anamnesis_answers")
    .delete()
    .eq("submission_id", fixture.submissionId);
  if (answers.error) throw answers.error;

  const submission = await admin
    .from("anamnesis_submissions")
    .delete()
    .eq("id", fixture.submissionId)
    .is("submitted_at", null);
  if (submission.error) throw submission.error;

  const remainingSubmission = await admin
    .from("anamnesis_submissions")
    .select("id, submitted_at")
    .eq("id", fixture.submissionId)
    .maybeSingle();
  if (remainingSubmission.error) throw remainingSubmission.error;

  if (remainingSubmission.data) {
    throw new Error(
      "Synthetic submission became immutable; refusing to hide E2E residue.",
    );
  }

  const questions = await admin
    .from("anamnesis_questions")
    .delete()
    .eq("form_version_id", fixture.formVersionId);
  if (questions.error) throw questions.error;

  const section = await admin
    .from("anamnesis_sections")
    .delete()
    .eq("id", fixture.sectionId);
  if (section.error) throw section.error;

  const version = await admin
    .from("anamnesis_form_versions")
    .delete()
    .eq("id", fixture.formVersionId);
  if (version.error) throw version.error;

  const form = await admin
    .from("anamnesis_forms")
    .delete()
    .eq("id", fixture.formId);
  if (form.error) throw form.error;
}

test.use({ baseURL: baseUrl });

test("cliente sintetica usa single_choice, condicional e envio incompleto permanece rascunho", async ({
  page,
}) => {
  const fixture = await createTemporaryAnamnesisFixture(canonicalClientId);

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(canonicalEmail);
    await page.getByLabel("Senha").fill(canonicalPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/cliente\/?$/);

    await page.goto(`/cliente/anamnese/${fixture.submissionId}`);

    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Quando terminar todos os campos aplicáveis, use a seção de finalização para enviar a Anamnese.",
        { exact: false },
      ),
    ).toBeVisible();

    await expect(page.getByLabel("E2E detalhe condicional")).toHaveCount(0);

    await page.getByLabel("Nao", { exact: true }).check();
    await page.getByRole("button", { name: "Salvar no rascunho" }).first().click();
    await expect(page.getByText("Resposta salva no rascunho.")).toBeVisible();
    await expect(page.getByLabel("E2E detalhe condicional")).toHaveCount(0);

    await page.getByLabel("Sim", { exact: true }).check();
    await page.getByRole("button", { name: "Salvar no rascunho" }).first().click();
    await expect(page.getByText("Resposta salva no rascunho.")).toBeVisible();
    await expect(page.getByLabel("E2E detalhe condicional")).toBeVisible();

    await page.getByRole("button", { name: "Enviar Anamnese" }).click();

    await expect(
      page.getByText(
        "Preencha todas as perguntas obrigatórias que se aplicam a você antes de enviar.",
      ),
    ).toBeVisible();

    const submission = await admin
      .from("anamnesis_submissions")
      .select("submitted_at")
      .eq("id", fixture.submissionId)
      .single();

    if (submission.error) throw submission.error;
    expect(submission.data.submitted_at).toBeNull();

    const sourceAnswer = await admin
      .from("anamnesis_answers")
      .select("answer_value")
      .eq("submission_id", fixture.submissionId)
      .eq("question_id", fixture.sourceQuestionId)
      .single();

    if (sourceAnswer.error) throw sourceAnswer.error;
    expect(sourceAnswer.data.answer_value).toBe("Sim");
  } finally {
    await cleanupTemporaryAnamnesisFixture(fixture);
  }
});
