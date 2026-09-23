import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { loginAdminWithMfa } from "./helpers/admin-auth.mjs";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const adminTotpSecret = process.env.E2E_ADMIN_TOTP_SECRET;
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseSecretKey = process.env.E2E_SUPABASE_SECRET_KEY;

if (
  !baseUrl ||
  !adminEmail ||
  !adminPassword ||
  !adminTotpSecret ||
  !supabaseUrl ||
  !supabaseSecretKey
) {
  throw new Error(
    "Missing E2E_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ADMIN_TOTP_SECRET, E2E_SUPABASE_URL or E2E_SUPABASE_SECRET_KEY",
  );
}

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findAdminProfileId(email) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) throw error;

  const user = data.users.find(
    (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!user) {
    throw new Error("E2E admin user was not found in Supabase Auth.");
  }

  const role = await admin
    .from("user_roles")
    .select("profile_id")
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (role.error) throw role.error;
  if (!role.data) {
    throw new Error("E2E admin user does not have the admin role.");
  }

  return user.id;
}

async function removeRows(table, column, value) {
  if (!value) return;

  const { error } = await admin.from(table).delete().eq(column, value);

  if (error) throw error;
}

async function cleanupFixture(fixture) {
  await removeRows("anamnesis_answers", "submission_id", fixture.submissionId);
  await removeRows("anamnesis_submissions", "id", fixture.submissionId);
  await removeRows("anamnesis_questions", "id", fixture.questionId);
  await removeRows("anamnesis_sections", "id", fixture.sectionId);
  await removeRows("anamnesis_form_versions", "id", fixture.formVersionId);
  await removeRows("anamnesis_forms", "id", fixture.formId);
  await removeRows("client_assignments", "client_id", fixture.clientId);
  await removeRows("clients", "id", fixture.clientId);
  await removeRows("user_roles", "profile_id", fixture.profileId);
  await removeRows("profiles", "id", fixture.profileId);

  if (fixture.profileId) {
    const { error } = await admin.auth.admin.deleteUser(fixture.profileId);
    if (error) throw error;
  }
}

async function createFixture() {
  const unique = Date.now();
  const email = `e2e-anamnesis-correction-${unique}@example.invalid`;
  const staffProfileId = await findAdminProfileId(adminEmail);

  const authUser = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (authUser.error) throw authUser.error;

  const profileId = authUser.data.user.id;
  const clientId = randomUUID();
  const formId = randomUUID();
  const formVersionId = randomUUID();
  const sectionId = randomUUID();
  const questionId = randomUUID();
  const submissionId = randomUUID();
  const answerId = randomUUID();

  const fixture = {
    answerId,
    clientId,
    formId,
    formVersionId,
    profileId,
    questionId,
    sectionId,
    submissionId,
  };

  try {
    const profile = await admin.from("profiles").insert({
      display_name: "E2E Anamnesis Correction Client",
      id: profileId,
    });
    if (profile.error) throw profile.error;

    const role = await admin.from("user_roles").insert({
      profile_id: profileId,
      role: "client",
    });
    if (role.error) throw role.error;

    const client = await admin.from("clients").insert({
      id: clientId,
      profile_id: profileId,
    });
    if (client.error) throw client.error;

    const assignment = await admin.from("client_assignments").insert({
      client_id: clientId,
      staff_profile_id: staffProfileId,
    });
    if (assignment.error) throw assignment.error;

    const form = await admin.from("anamnesis_forms").insert({
      form_key: `e2e-correction-${unique}`,
      id: formId,
    });
    if (form.error) throw form.error;

    const formVersion = await admin.from("anamnesis_form_versions").insert({
      form_id: formId,
      id: formVersionId,
      published_at: new Date().toISOString(),
      version_number: 1,
    });
    if (formVersion.error) throw formVersion.error;

    const section = await admin.from("anamnesis_sections").insert({
      display_order: 1,
      form_version_id: formVersionId,
      id: sectionId,
      section_key: "e2e_section",
      title: "E2E Section",
    });
    if (section.error) throw section.error;

    const question = await admin.from("anamnesis_questions").insert({
      answer_type: "text",
      display_order: 1,
      form_version_id: formVersionId,
      id: questionId,
      label: "E2E correction question",
      question_key: "e2e_correction_question",
      required: true,
      section_id: sectionId,
    });
    if (question.error) throw question.error;

    const submission = await admin.from("anamnesis_submissions").insert({
      client_id: clientId,
      form_version_id: formVersionId,
      id: submissionId,
      submitted_at: new Date().toISOString(),
    });
    if (submission.error) throw submission.error;

    const answer = await admin.from("anamnesis_answers").insert({
      answer_value: "Original E2E answer",
      form_version_id: formVersionId,
      id: answerId,
      question_id: questionId,
      submission_id: submissionId,
    });
    if (answer.error) throw answer.error;

    return fixture;
  } catch (error) {
    await cleanupFixture(fixture);
    throw error;
  }
}

test.use({
  baseURL: baseUrl,
});

test("admin acessa correcoes da Anamnese e JSON invalido nao cria historico", async ({
  page,
}) => {
  const fixture = await createFixture();

  try {
    await loginAdminWithMfa(page, {
      email: adminEmail,
      password: adminPassword,
      totpSecret: adminTotpSecret,
    });

    await page.goto(
      `/admin/anamneses/${fixture.submissionId}/correcoes`,
    );

    await expect(
      page.getByRole("heading", { name: "Correções da Anamnese" }),
    ).toBeVisible();
    await expect(page.getByText("E2E correction question")).toBeVisible();
    await expect(page.getByText('"Original E2E answer"')).toBeVisible();

    const correctionInput = page.getByLabel("Novo valor corrigido");
    await correctionInput.fill("{");
    await page.getByRole("button", { name: "Registrar correção" }).click();

    await expect(
      page.getByText(
        'Use JSON válido. Exemplo para texto: "resposta corrigida".',
      ),
    ).toBeVisible();

    const correctionRows = await admin
      .from("anamnesis_answer_corrections")
      .select("id", { count: "exact", head: true })
      .eq("answer_id", fixture.answerId);

    if (correctionRows.error) throw correctionRows.error;
    expect(correctionRows.count).toBe(0);
  } finally {
    await cleanupFixture(fixture);
  }
});
