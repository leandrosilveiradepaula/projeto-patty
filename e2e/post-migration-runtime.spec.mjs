import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Post-migration read-only smoke. Run only after the two reviewed migrations
// were applied via the versioned Supabase CLI workflow and Vercel deployed.
const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const url = process.env.E2E_SUPABASE_URL;
const secret = process.env.E2E_SUPABASE_SECRET_KEY;
const email = process.env.E2E_CANONICAL_EMAIL;
const password = process.env.E2E_CANONICAL_PASSWORD;
const profileId = process.env.E2E_CANONICAL_PROFILE_ID;
const expectedAssessmentId = process.env.E2E_SYNTHETIC_FINALIZED_ASSESSMENT_ID;

if (!baseUrl || !url || !secret || !email || !password || !profileId) {
  throw new Error("Post-migration smoke requires the canonical synthetic E2E environment.");
}
if (!/^e2e-canonical-[0-9a-f]+@example\.invalid$/.test(email)) {
  throw new Error("Refusing to run post-migration smoke with a non-synthetic client.");
}
if (expectedAssessmentId && !/^[0-9a-f-]{36}$/i.test(expectedAssessmentId)) {
  throw new Error("Invalid synthetic assessment fixture ID.");
}
if (!/^[0-9a-f-]{36}$/i.test(profileId)) {
  throw new Error("Invalid synthetic E2E profile ID.");
}

test.use({ baseURL: baseUrl });

test("cliente sintética consulta histórico completo sem alerta de schema pendente", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cliente\/?$/);

  const response = await page.goto("/cliente/avaliacoes");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Avaliações e medidas" })).toBeVisible();
  await expect(
    page.getByText("Histórico de avaliações parcialmente disponível"),
  ).toHaveCount(0);
  // A synthetic fixture can additionally prove that unmeasured finalized records are displayed.
  if (expectedAssessmentId) {
    await expect(page.locator(`#avaliacao-${expectedAssessmentId}`)).toHaveCount(1);
    await expect(page.getByText("Avaliação finalizada, sem medidas disponíveis para consulta.")).toBeVisible();
  } else {
    await expect(page.getByText("Nenhuma avaliação disponível", { exact: true })).toBeVisible();
  }
});

test("cliente sintética lê somente seu histórico e não pode editar ciclo inexistente", async () => {
  // The secret remains inside the private Actions runner. On sign-in the
  // subsequent requests use this user's access JWT, not a browser service key.
  const client = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  expect(signedIn.data.user?.id).toBe(profileId);
  expect(signedIn.data.session?.access_token).toBeTruthy();

  try {
    const headers = await client.rpc("list_current_client_finalized_assessment_headers");
    expect(headers.error).toBeNull();
    if (expectedAssessmentId) {
      expect(headers.data.some(row => row.id === expectedAssessmentId)).toBe(true);
      expect(headers.data.every(row => row.id === expectedAssessmentId)).toBe(true);
    } else {
      expect(headers.data).toEqual([]);
    }

    // Nonexistent UUIDs guarantee no client, draft or meal plan is modified.
    // P0002 is raised only after the authenticated RPC has been reached.
    const nonexistent = "00000000-0000-4000-8000-000000000000";
    const edit = await client.rpc("replace_draft_meal_plan_cycle_steps", {
      p_cycle_id: nonexistent,
      p_meal_plan_version_id: nonexistent,
      p_expected_steps: [],
      p_variant_ids: [],
    });
    expect(edit.data).toBeNull();
    expect(edit.error?.code).toBe("P0002");
  } finally {
    await client.auth.signOut();
  }
});
