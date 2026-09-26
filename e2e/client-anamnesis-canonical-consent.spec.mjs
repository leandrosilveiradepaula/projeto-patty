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
  throw new Error("Missing canonical consent E2E environment.");
}

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CONSENT_KEY = "consent_acceptance";
const GUARD_KEY = "city";

async function loadCanonicalVersion() {
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
    .select(
      "id, question_key, label, answer_type, options, required, applicability_source_question_id, applicability_expected_answer",
    )
    .eq("form_version_id", version.data.id);

  if (questions.error) throw questions.error;

  return {
    formVersionId: version.data.id,
    questions: questions.data,
  };
}

function answerValueForQuestion(question, dependentQuestions) {
  if (question.answer_type === "text") {
    return `E2E ${question.question_key}`;
  }

  if (question.answer_type !== "single_choice" || !Array.isArray(question.options)) {
    throw new Error(`Unsupported canonical question: ${question.question_key}`);
  }

  const dependents = dependentQuestions.filter(
    (candidate) => candidate.applicability_source_question_id === question.id,
  );
  const forbiddenValues = new Set(
    dependents.map((candidate) => candidate.applicability_expected_answer),
  );
  const choice = question.options.find(
    (option) => !forbiddenValues.has(option),
  );

  if (typeof choice !== "string") {
    throw new Error(
      `Could not choose a non-applicable controller value for ${question.question_key}`,
    );
  }

  return choice;
}

async function createCanonicalDraftFixture(clientId) {
  const canonical = await loadCanonicalVersion();

  const staleDrafts = await admin
    .from("anamnesis_submissions")
    .select("id")
    .eq("client_id", clientId)
    .eq("form_version_id", canonical.formVersionId)
    .is("submitted_at", null);

  if (staleDrafts.error) throw staleDrafts.error;

  for (const draft of staleDrafts.data) {
    const deleteAnswers = await admin
      .from("anamnesis_answers")
      .delete()
      .eq("submission_id", draft.id);
    if (deleteAnswers.error) throw deleteAnswers.error;

    const deleteDraft = await admin
      .from("anamnesis_submissions")
      .delete()
      .eq("id", draft.id)
      .is("submitted_at", null);
    if (deleteDraft.error) throw deleteDraft.error;
  }

  const submission = await admin
    .from("anamnesis_submissions")
    .insert({
      client_id: clientId,
      form_version_id: canonical.formVersionId,
    })
    .select("id")
    .single();

  if (submission.error) throw submission.error;

  const dependentQuestions = canonical.questions.filter(
    (question) => question.applicability_source_question_id !== null,
  );
  const rows = canonical.questions.flatMap((question) => {
    if (
      question.question_key === GUARD_KEY ||
      question.question_key === CONSENT_KEY ||
      question.applicability_source_question_id !== null
    ) {
      return [];
    }

    return [
      {
        answer_value: answerValueForQuestion(question, dependentQuestions),
        form_version_id: canonical.formVersionId,
        question_id: question.id,
        submission_id: submission.data.id,
      },
    ];
  });

  const inserted = await admin.from("anamnesis_answers").insert(rows);
  if (inserted.error) throw inserted.error;

  const consentQuestion = canonical.questions.find(
    (question) => question.question_key === CONSENT_KEY,
  );
  const guardQuestion = canonical.questions.find(
    (question) => question.question_key === GUARD_KEY,
  );

  if (!consentQuestion || !guardQuestion) {
    throw new Error("Canonical consent/guard questions are missing.");
  }

  return {
    consentLabel: consentQuestion.label,
    consentQuestionId: consentQuestion.id,
    guardQuestionId: guardQuestion.id,
    submissionId: submission.data.id,
  };
}

async function cleanupDraft(fixture) {
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

  const remaining = await admin
    .from("anamnesis_submissions")
    .select("id, submitted_at")
    .eq("id", fixture.submissionId)
    .maybeSingle();

  if (remaining.error) throw remaining.error;
  if (remaining.data) {
    throw new Error(
      "Canonical E2E submission became immutable; refusing to hide residue.",
    );
  }
}

test.use({ baseURL: baseUrl });

test("cliente sintetica ve checkbox canonico e consentimento fica auditavel sem concluir envio incompleto", async ({
  page,
}) => {
  const fixture = await createCanonicalDraftFixture(canonicalClientId);

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(canonicalEmail);
    await page.getByLabel("Senha").fill(canonicalPassword);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/cliente\/?$/);

    await page.goto(`/cliente/anamnese/${fixture.submissionId}`);
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();

    const consent = page.getByLabel(fixture.consentLabel, { exact: true });
    await expect(consent).toHaveAttribute("type", "checkbox");
    await expect(consent).toHaveAttribute("required", "");

    await page.getByRole("button", { name: "Enviar Anamnese" }).click();

    const beforeConsent = await admin
      .from("anamnesis_answers")
      .select("id")
      .eq("submission_id", fixture.submissionId)
      .eq("question_id", fixture.consentQuestionId);

    if (beforeConsent.error) throw beforeConsent.error;
    expect(beforeConsent.data).toHaveLength(0);

    await consent.check();
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

    const consentAnswer = await admin
      .from("anamnesis_answers")
      .select("answer_value")
      .eq("submission_id", fixture.submissionId)
      .eq("question_id", fixture.consentQuestionId)
      .single();

    if (consentAnswer.error) throw consentAnswer.error;
    expect(consentAnswer.data.answer_value).toBe("Concordo");

    const guardAnswer = await admin
      .from("anamnesis_answers")
      .select("id")
      .eq("submission_id", fixture.submissionId)
      .eq("question_id", fixture.guardQuestionId);

    if (guardAnswer.error) throw guardAnswer.error;
    expect(guardAnswer.data).toHaveLength(0);
  } finally {
    await cleanupDraft(fixture);
  }
});
