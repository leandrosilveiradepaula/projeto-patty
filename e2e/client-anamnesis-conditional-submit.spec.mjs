import { randomBytes } from "node:crypto";

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

async function lockSyntheticClient(userId) {
  const updated = await admin.auth.admin.updateUserById(userId, {
    password: randomBytes(48).toString("base64url"),
  });

  if (updated.error) throw updated.error;
}

async function loadSyntheticClient() {
  const profiles = await admin
    .from("profiles")
    .select("id")
    .eq("display_name", "E2E Correction Client")
    .limit(2);

  if (profiles.error) throw profiles.error;
  if (profiles.data.length !== 1) {
    throw new Error(
      "Expected exactly one persistent E2E Correction Client fixture.",
    );
  }

  const profileId = profiles.data[0].id;

  const client = await admin
    .from("clients")
    .select("id")
    .eq("profile_id", profileId)
    .single();

  if (client.error) throw client.error;

  const role = await admin
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .single();

  if (role.error) throw role.error;
  if (role.data.role !== "client") {
    throw new Error("Persistent E2E Correction Client must have client role.");
  }

  const authUser = await admin.auth.admin.getUserById(profileId);
  if (authUser.error) throw authUser.error;

  const email = authUser.data.user.email;
  if (!email) {
    throw new Error("Persistent E2E Correction Client has no Auth email.");
  }

  const password = randomBytes(48).toString("base64url");
  const updated = await admin.auth.admin.updateUserById(profileId, {
    password,
  });

  if (updated.error) throw updated.error;

  return {
    clientId: client.data.id,
    email,
    password,
    profileId,
  };
}

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
  const client = await loadSyntheticClient();
  const fixture = await createTemporaryAnamnesisFixture(client.clientId);

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(client.email);
    await page.getByLabel("Senha").fill(client.password);
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
    await lockSyntheticClient(client.profileId);
  }
});
