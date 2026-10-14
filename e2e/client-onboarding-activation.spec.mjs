import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseSecretKey = process.env.E2E_SUPABASE_SECRET_KEY;

if (!baseUrl || !adminEmail || !supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Missing E2E_BASE_URL, E2E_ADMIN_EMAIL, E2E_SUPABASE_URL or E2E_SUPABASE_SECRET_KEY",
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
    throw new Error("Synthetic admin user was not found in Supabase Auth.");
  }

  const role = await admin
    .from("user_roles")
    .select("profile_id")
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (role.error) throw role.error;
  if (!role.data) {
    throw new Error("Synthetic admin user does not have the admin role.");
  }

  return user.id;
}

async function cleanupSyntheticClient({ clientId, profileId, email }) {
  // Destructive service-role cleanup is reserved for this exact synthetic
  // identity. Never delete a user selected only by a supplied profile ID.
  if (!/^e2e-onboarding-[0-9a-f]{16}@example\.invalid$/.test(email ?? "")) {
    throw new Error("Refusing cleanup of a non-synthetic onboarding identity.");
  }
  const authUser = await admin.auth.admin.getUserById(profileId);
  if (authUser.error || authUser.data.user?.email !== email) {
    throw new Error("Synthetic Auth ownership verification failed.");
  }

  if (clientId) {
    const linkedClient = await admin
      .from("clients")
      .select("id, profile_id")
      .eq("id", clientId)
      .single();
    if (linkedClient.error || linkedClient.data?.profile_id !== profileId) {
      throw new Error("Synthetic client ownership verification failed.");
    }
    // This test now visits Cadastro Atual and creates an unsubmitted
    // Anamnese draft. Refuse cleanup when the synthetic client has any
    // submitted professional history, rather than deleting real history.
    const submissions = await admin.from("anamnesis_submissions")
      .select("id, submitted_at").eq("client_id", clientId);
    if (submissions.error) throw submissions.error;
    if (submissions.data.some(item => item.submitted_at !== null)) {
      throw new Error("Refusing cleanup of a submitted Anamnese.");
    }
    const protocols = await admin.from("protocols")
      .select("id").eq("client_id", clientId).limit(1);
    if (protocols.error) throw protocols.error;
    if (protocols.data.length > 0) {
      throw new Error("Refusing cleanup of professional protocol history.");
    }
    for (const submission of submissions.data) {
      const answers = await admin.from("anamnesis_answers")
        .delete().eq("submission_id", submission.id);
      if (answers.error) throw answers.error;
      const draft = await admin.from("anamnesis_submissions").delete()
        .eq("id", submission.id).eq("client_id", clientId)
        .is("submitted_at", null).select("id").single();
      if (draft.error || !draft.data) {
        throw draft.error ?? new Error("Synthetic draft deletion was not verified.");
      }
    }
    const registration = await admin.from("client_registration")
      .delete().eq("client_id", clientId);
    if (registration.error) throw registration.error;
    const assignment = await admin
      .from("client_assignments")
      .delete()
      .eq("client_id", clientId);

    if (assignment.error) throw assignment.error;

    const client = await admin.from("clients").delete()
      .eq("id", clientId)
      .eq("profile_id", profileId)
      .select("id")
      .single();

    if (client.error || !client.data) {
      throw client.error ?? new Error("Synthetic client deletion not confirmed.");
    }
  }

  if (profileId) {
    const role = await admin
      .from("user_roles")
      .delete()
      .eq("profile_id", profileId);

    if (role.error) throw role.error;

    const profile = await admin.from("profiles").delete().eq("id", profileId);

    if (profile.error) throw profile.error;

    const deletedAuthUser = await admin.auth.admin.deleteUser(profileId);

    if (deletedAuthUser.error) throw deletedAuthUser.error;
  }
}

test("convite sintetico ativa conta, cria senha e permite novo login", async ({
  browser,
}) => {
  const unique = randomBytes(8).toString("hex");
  const email = `e2e-onboarding-${unique}@example.invalid`;
  const password = `E2E-Onboarding-${unique}-Aa1!`;

  let profileId = null;
  let clientId = null;
  let activationContext = null;
  let loginContext = null;

  try {
    const staffProfileId = await findAdminProfileId(adminEmail);

    const generated = await admin.auth.admin.generateLink({
      type: "invite",
      email,
    });

    if (generated.error) throw generated.error;

    profileId = generated.data.user.id;
    const tokenHash = generated.data.properties.hashed_token;

    if (!profileId || !tokenHash) {
      throw new Error("Supabase did not return the invite user and token hash.");
    }

    const profile = await admin
      .from("profiles")
      .insert({
        display_name: "E2E Onboarding Client",
        id: profileId,
      })
      .select("id")
      .single();

    if (profile.error) throw profile.error;

    const role = await admin.from("user_roles").insert({
      profile_id: profileId,
      role: "client",
    });

    if (role.error) throw role.error;

    const client = await admin
      .from("clients")
      .insert({ profile_id: profileId, full_name: "E2E Onboarding Client", status: "active" })
      .select("id")
      .single();

    if (client.error) throw client.error;
    clientId = client.data.id;

    const assignment = await admin.from("client_assignments").insert({
      client_id: clientId,
      staff_profile_id: staffProfileId,
    });

    if (assignment.error) throw assignment.error;

    activationContext = await browser.newContext({ baseURL: baseUrl, viewport: {width:390,height:844}, isMobile:true, hasTouch:true });
    const activationPage = await activationContext.newPage();

    await activationPage.goto(
      `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=invite`,
    );
    // An unexpected redirect must not print a one-time activation token
    // into a Playwright failed-URL assertion.
    if (new URL(activationPage.url()).searchParams.has("token_hash")) {
      throw new Error("One-time activation token remained in the browser URL.");
    }
    await expect(
      activationPage.getByRole("heading", { name: "Ativar sua conta" }),
    ).toBeVisible();

    await activationPage.getByLabel("Crie sua senha").fill(password);
    await activationPage.getByLabel("Confirme sua senha").fill(password);
    await activationPage
      .getByRole("button", { name: "Criar senha e continuar" })
      .click();

    await expect(activationPage).toHaveURL(/\/cliente\/anamnese\/?$/);
    await expect(
      activationPage.getByRole("heading", { name: "Anamnese" }),
    ).toBeVisible();

    const authUser = await admin.auth.admin.getUserById(profileId);

    if (authUser.error) throw authUser.error;
    expect(authUser.data.user.email_confirmed_at).toBeTruthy();

    // The client flow continues through the real UI, without a second
    // admin identity, MFA bypass or user data outside this fixture.
    await test.step("salva e recupera Cadastro Atual no celular", async () => {
      await activationPage.goto("/cliente/perfil");
      await activationPage.getByLabel("Cidade").fill("Cidade Sintética J1");
      await activationPage.getByRole("button", {name:"Salvar Cadastro Atual"}).click();
      await expect.poll(async () => {
        const registration = await admin.from("client_registration")
          .select("city").eq("client_id", clientId).maybeSingle();
        if (registration.error) throw registration.error;
        return registration.data?.city ?? null;
      }, {timeout:20_000}).toBe("Cidade Sintética J1");
      await activationPage.reload();
      await expect(activationPage.getByLabel("Cidade")).toHaveValue("Cidade Sintética J1");
    });

    let draftId = null;
    await test.step("inicia e retoma a mesma Anamnese versionada", async () => {
      await activationPage.goto("/cliente/anamnese");
      await activationPage.getByRole("button", {name:"Começar Anamnese"}).click();
      await expect(activationPage).toHaveURL(/\/cliente\/anamnese\/[0-9a-f-]{36}\/?$/);
      draftId = activationPage.url().split("/").at(-1);
      const rows = await admin.from("anamnesis_submissions")
        .select("id,client_id,form_version_id,submitted_at")
        .eq("client_id",clientId);
      if (rows.error) throw rows.error;
      expect(rows.data).toHaveLength(1);
      expect(rows.data[0].id).toBe(draftId);
      expect(rows.data[0].submitted_at).toBeNull();
      expect(rows.data[0].form_version_id).toBeTruthy();
      await activationPage.goto("/cliente/anamnese");
      const resume = activationPage.getByRole("link",{name:"Continuar rascunho"});
      await expect(resume).toHaveAttribute("href",`/cliente/anamnese/${draftId}`);
    });

    loginContext = await browser.newContext({ baseURL: baseUrl, viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
    const loginPage = await loginContext.newPage();

    await loginPage.goto("/login");
    await loginPage.getByLabel("Email").fill(email);
    await loginPage.getByLabel("Senha").fill(password);
    await loginPage.getByRole("button", { name: "Entrar" }).click();

    await expect(loginPage).toHaveURL(/\/cliente\/?$/);
    await loginPage.goto("/cliente/anamnese");
    await expect(loginPage.getByRole("link",{name:"Continuar rascunho"}))
      .toHaveAttribute("href",`/cliente/anamnese/${draftId}`);
  } finally {
    await loginContext?.close();
    await activationContext?.close();

    if (profileId) {
      await cleanupSyntheticClient({ clientId, profileId, email });
    }
  }
});
