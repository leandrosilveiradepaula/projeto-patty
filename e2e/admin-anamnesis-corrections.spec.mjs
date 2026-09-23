import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  generateTotp,
  loginAdminWithMfa,
} from "./helpers/admin-auth.mjs";

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

function createUserClient() {
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
  await removeRows("user_roles", "profile_id", fixture.clientProfileId);
  await removeRows("profiles", "id", fixture.clientProfileId);
  await removeRows("user_roles", "profile_id", fixture.adminProfileId);
  await removeRows("profiles", "id", fixture.adminProfileId);

  for (const userId of [fixture.clientProfileId, fixture.adminProfileId]) {
    if (!userId) continue;
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
}

async function enrollSyntheticAdminMfa(email, password) {
  const userClient = createUserClient();
  const signedIn = await userClient.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  const enrolled = await userClient.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "E2E synthetic admin",
  });
  if (enrolled.error) throw enrolled.error;

  const factorId = enrolled.data.id;
  const secret = enrolled.data.totp.secret;
  const challenge = await userClient.auth.mfa.challenge({ factorId });
  if (challenge.error) throw challenge.error;

  const verified = await userClient.auth.mfa.verify({
    challengeId: challenge.data.id,
    code: generateTotp(secret),
    factorId,
  });
  if (verified.error) throw verified.error;

  await userClient.auth.signOut();
  return secret;
}

async function createFixture() {
  const unique = Date.now();
  const adminEmail = `e2e-correction-admin-${unique}@example.invalid`;
  const adminPassword = `E2E-Correction-${unique}-Aa1!`;
  const clientEmail = `e2e-correction-client-${unique}@example.invalid`;

  const adminUser = await admin.auth.admin.createUser({
    email: adminEmail,
    email_confirm: true,
    password: adminPassword,
  });
  if (adminUser.error) throw adminUser.error;

  const clientUser = await admin.auth.admin.createUser({
    email: clientEmail,
    email_confirm: true,
  });
  if (clientUser.error) {
    await admin.auth.admin.deleteUser(adminUser.data.user.id);
    throw clientUser.error;
  }

  const fixture = {
    adminEmail,
    adminPassword,
    adminProfileId: adminUser.data.user.id,
    answerId: randomUUID(),
    clientId: randomUUID(),
    clientProfileId: clientUser.data.user.id,
    formId: randomUUID(),
    formVersionId: randomUUID(),
    questionId: randomUUID(),
    sectionId: randomUUID(),
    submissionId: randomUUID(),
    totpSecret: null,
  };

  try {
    let result = await admin.from("profiles").insert([
      { display_name: "E2E Correction Admin", id: fixture.adminProfileId },
      { display_name: "E2E Correction Client", id: fixture.clientProfileId },
    ]);
    if (result.error) throw result.error;

    result = await admin.from("user_roles").insert([
      { profile_id: fixture.adminProfileId, role: "admin" },
      { profile_id: fixture.clientProfileId, role: "client" },
    ]);
    if (result.error) throw result.error;

    result = await admin.from("clients").insert({
      id: fixture.clientId,
      profile_id: fixture.clientProfileId,
    });
    if (result.error) throw result.error;

    result = await admin.from("client_assignments").insert({
      client_id: fixture.clientId,
      staff_profile_id: fixture.adminProfileId,
    });
    if (result.error) throw result.error;

    result = await admin.from("anamnesis_forms").insert({
      form_key: `e2e-correction-${unique}`,
      id: fixture.formId,
    });
    if (result.error) throw result.error;

    result = await admin.from("anamnesis_form_versions").insert({
      form_id: fixture.formId,
      id: fixture.formVersionId,
      published_at: new Date().toISOString(),
      version_number: 1,
    });
    if (result.error) throw result.error;

    result = await admin.from("anamnesis_sections").insert({
      display_order: 1,
      form_version_id: fixture.formVersionId,
      id: fixture.sectionId,
      section_key: "e2e_section",
      title: "E2E Section",
    });
    if (result.error) throw result.error;

    result = await admin.from("anamnesis_questions").insert({
      answer_type: "text",
      display_order: 1,
      form_version_id: fixture.formVersionId,
      id: fixture.questionId,
      label: "E2E correction question",
      question_key: "e2e_correction_question",
      required: true,
      section_id: fixture.sectionId,
    });
    if (result.error) throw result.error;

    result = await admin.from("anamnesis_submissions").insert({
      client_id: fixture.clientId,
      form_version_id: fixture.formVersionId,
      id: fixture.submissionId,
      submitted_at: new Date().toISOString(),
    });
    if (result.error) throw result.error;

    result = await admin.from("anamnesis_answers").insert({
      answer_value: "Original E2E answer",
      form_version_id: fixture.formVersionId,
      id: fixture.answerId,
      question_id: fixture.questionId,
      submission_id: fixture.submissionId,
    });
    if (result.error) throw result.error;

    fixture.totpSecret = await enrollSyntheticAdminMfa(
      fixture.adminEmail,
      fixture.adminPassword,
    );

    return fixture;
  } catch (error) {
    await cleanupFixture(fixture);
    throw error;
  }
}

test.use({ baseURL: baseUrl });

test("admin sintetico acessa correcoes e JSON invalido nao cria historico", async ({
  page,
}) => {
  const fixture = await createFixture();

  try {
    await loginAdminWithMfa(page, {
      email: fixture.adminEmail,
      password: fixture.adminPassword,
      totpSecret: fixture.totpSecret,
    });

    await page.goto(`/admin/anamneses/${fixture.submissionId}/correcoes`);

    await expect(
      page.getByRole("heading", { name: "Correções da Anamnese" }),
    ).toBeVisible();
    await expect(page.getByText("E2E correction question")).toBeVisible();
    await expect(page.getByText('"Original E2E answer"')).toBeVisible();

    await page.getByLabel("Novo valor corrigido").fill("{");
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
