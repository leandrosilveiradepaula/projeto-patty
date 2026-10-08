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
  if (!/^e2e-onboarding-[0-9]+@example\.invalid$/.test(email ?? "")) {
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
  const unique = Date.now();
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

    activationContext = await browser.newContext({ baseURL: baseUrl });
    const activationPage = await activationContext.newPage();

    await activationPage.goto(
      `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=invite`,
    );

    await expect(activationPage).toHaveURL(/\/ativar-conta\/?$/);
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

    loginContext = await browser.newContext({ baseURL: baseUrl });
    const loginPage = await loginContext.newPage();

    await loginPage.goto("/login");
    await loginPage.getByLabel("Email").fill(email);
    await loginPage.getByLabel("Senha").fill(password);
    await loginPage.getByRole("button", { name: "Entrar" }).click();

    await expect(loginPage).toHaveURL(/\/cliente\/?$/);
  } finally {
    await loginContext?.close();
    await activationContext?.close();

    if (profileId) {
      await cleanupSyntheticClient({ clientId, profileId, email });
    }
  }
});
