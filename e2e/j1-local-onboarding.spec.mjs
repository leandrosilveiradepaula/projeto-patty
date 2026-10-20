import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

// The J1 smoke must never run against the hosted Supabase or public Vercel.
// All synthetic identities, submissions and answers die with this local DB.
const baseURL = process.env.J1_E2E_BASE_URL;
const apiURL = process.env.J1_E2E_SUPABASE_URL;
const anonKey = process.env.J1_E2E_ANON_KEY;
const serviceKey = process.env.J1_E2E_SERVICE_ROLE_KEY;
if (
  process.env.J1_E2E_LOCAL_ONLY !== "true" ||
  baseURL !== "http://127.0.0.1:3000" ||
  apiURL !== "http://127.0.0.1:54321" ||
  !anonKey || !serviceKey ||
  process.env.OPENAI_HEALTH_DATA_PROCESSING_ENABLED !== "false" ||
  Boolean(process.env.OPENAI_API_KEY)
) {
  throw new Error("J1 smoke requires disposable localhost services and disabled external AI");
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fixtureTables = new Set([
  "profiles", "user_roles", "clients", "client_assignments",
  "anamnesis_forms", "anamnesis_form_versions", "anamnesis_sections",
  "anamnesis_questions",
]);
const service = createClient(apiURL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function literal(value) {
  if (value === null) return "NULL";
  if (typeof value !== "number" && typeof value !== "string")
    throw new TypeError("Unsupported synthetic SQL value");
  return "'" + String(value).replaceAll("'", "''") + "'";
}
function sql(statement) {
  if (process.env.J1_E2E_LOCAL_ONLY !== "true" ||
      apiURL !== "http://127.0.0.1:54321")
    throw new Error("J1 local SQL boundary rejected");
  return execFileSync("docker", [
    "exec", "-i", "supabase_db_projeto-patty", "psql",
    "-X", "-q", "-U", "postgres", "-d", "postgres",
    "-A", "-t", "-v", "ON_ERROR_STOP=1",
  ], { input: statement.trimEnd() + "\n", encoding: "utf8", timeout: 15000 }).trim();
}
function rows(query) {
  return JSON.parse(sql(
    "select coalesce(json_agg(row_to_json(t)),'[]'::json)::text from (" + query + ") t;",
  ));
}
function insert(table, fields) {
  if (!fixtureTables.has(table) ||
      !Object.keys(fields).every(key => /^[a-z][a-z0-9_]*$/.test(key)))
    throw new Error("Synthetic fixture table or column denied");
  const key = table === "user_roles" ? "profile_id" : "id";
  const id = sql("insert into public." + table + " (" +
    Object.keys(fields).join(",") + ") values (" +
    Object.values(fields).map(literal).join(",") + ") returning " + key + ";");
  if (!UUID.test(id)) throw new Error("Synthetic fixture insertion did not return UUID");
  return id;
}
async function makeStaff(nonce) {
  const email = "e2e-j1-staff-" + nonce + "@example.invalid";
  const result = await service.auth.admin.createUser({
    email,
    password: "J1-" + randomBytes(16).toString("base64url") + "-Aa1!",
    email_confirm: true,
  });
  if (result.error || !result.data?.user?.id)
    throw result.error ?? new Error("Local synthetic staff creation failed");
  const id = result.data.user.id;
  insert("profiles", { id, display_name: "J1 Synthetic staff" });
  insert("user_roles", { profile_id: id, role: "admin" });
  return id;
}
function getPublishedAnamnesisFromMigrations() {
  // The committed migrations already publish the canonical v1 form. Never
  // recreate or modify that form just to make an E2E pass.
  const published = rows(
    "select v.id as version_id, q.id as city_question_id" +
    " from public.anamnesis_forms f" +
    " join public.anamnesis_form_versions v on v.form_id=f.id" +
    " join public.anamnesis_questions q on q.form_version_id=v.id" +
    " where f.form_key='client-anamnesis' and v.published_at is not null" +
    " and q.question_key='city' and q.answer_type='text'" +
    " order by v.version_number desc limit 1",
  );
  if (published.length !== 1 ||
      !UUID.test(published[0].version_id) ||
      !UUID.test(published[0].city_question_id)) {
    throw new Error("Committed canonical Anamnese version or city question missing");
  }
  return {
    versionId: published[0].version_id,
    cityQuestionId: published[0].city_question_id,
  };
}
async function makeInvitedClient(staffId, nonce) {
  const email = "e2e-j1-owner-" + nonce + "@example.invalid";
  const result = await service.auth.admin.generateLink({ type: "invite", email });
  if (result.error || !result.data?.user?.id || !result.data?.properties?.hashed_token)
    throw result.error ?? new Error("Local invite could not be generated");
  const profileId = result.data.user.id;
  insert("profiles", { id: profileId, display_name: "J1 Synthetic client" });
  insert("user_roles", { profile_id: profileId, role: "client" });
  const clientId = insert("clients", {
    profile_id: profileId, full_name: "J1 Synthetic client", status: "active",
  });
  insert("client_assignments", { client_id: clientId, staff_profile_id: staffId });
  return { email, profileId, clientId, token: result.data.properties.hashed_token };
}
test.use({ baseURL });
test("J1 local: invite activation, cadastro, versioned Anamnese draft and isolation", async ({ browser }) => {
  test.setTimeout(240000);
  const nonce = randomBytes(8).toString("hex");
  const staffId = await makeStaff(nonce);
  const { versionId, cityQuestionId } = getPublishedAnamnesisFromMigrations();
  const invite = await makeInvitedClient(staffId, nonce);
  const password = "J1-" + randomBytes(17).toString("base64url") + "-Aa1!";
  const context = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const page = await context.newPage();
  let callbackCookieHeaderPresent = false;
  page.on("response", (response) => {
    if (new URL(response.url()).pathname !== "/auth/confirm") return;
    void response.allHeaders()
      .then((headers) => {
        // Boolean only; never capture OTPs, actual Set-Cookie or credentials.
        callbackCookieHeaderPresent = Boolean(headers["set-cookie"]);
      })
      .catch(() => {});
  });
  const sessionResponses = [];
  // Capture only HTTP status and whether the server authorized an app role.
  // Never retain or print tokens, cookies, response bodies or profile IDs.
  page.on("response", (response) => {
    if (new URL(response.url()).pathname !== "/ativar-conta/session") return;
    void Promise.all([response.json(), response.request().allHeaders()])
      .then(([payload, headers]) => {
        const roleKind =
          payload?.role === "client" || payload?.role === "admin"
            ? "authorized" : "not-authorized";
        const sentCookieHeader = headers["cookie"] ?? "";
        const sentAuthCookie = sentCookieHeader.includes("sb-") &&
          sentCookieHeader.includes("auth-token");
        sessionResponses.push(
          response.status() + ":" + roleKind + ":cookie-sent=" + sentAuthCookie,
        );
      })
      .catch(() => sessionResponses.push(response.status() + ":unreadable"));
  });

  await test.step("activate invitation without exposing its one-time token", async () => {
    await page.goto("/login");
    const anonymousSession = await page.request.get("/ativar-conta/session");
    expect(anonymousSession.ok()).toBe(true);
    expect(await anonymousSession.json()).toEqual({ role: null });
    expect(anonymousSession.headers()["cache-control"]).toContain("no-store");
    await page.evaluate((token) => {
      const destination = new URL("/auth/confirm", window.location.origin);
      destination.searchParams.set("token_hash", token);
      destination.searchParams.set("type", "invite");
      window.location.replace(destination.pathname + destination.search);
    }, invite.token);
    if (new URL(page.url()).searchParams.has("token_hash"))
      throw new Error("One-time token remained in the browser URL");
    await expect(page.getByRole("heading", { name: "Ativar sua conta" })).toBeVisible();
    // The OTP callback may not move from 127.0.0.1 to an internal localhost
    // alias: host-only session cookies would no longer reach the browser.
    expect(new URL(page.url()).origin).toBe(new URL(baseURL).origin);
    await expect.poll(() => callbackCookieHeaderPresent, {
      timeout: 5000,
      message: "J1 OTP redirect must set an Auth session cookie on its returned response",
    }).toBe(true);
    // Do not leak the one-time token into Playwright diagnostics. Classify
    // the *visible* activation boundary if the form does not become ready:
    // this distinguishes an invalid invite from missing session/hydration.
    let lastPhase = "not-rendered";
    try {
      await expect.poll(async () => {
        if (await page.locator('form[data-interactive="true"]').count()) return lastPhase = "ready";
        if (await page.getByText("Link inválido ou expirado").count()) return lastPhase = "invalid-invite";
        if (await page.getByText("Não foi possível validar o convite").count()) return lastPhase = "auth-error";
        if (await page.getByText("Validando convite").count()) return lastPhase = "checking-session";
        if (await page.locator('form[data-interactive="false"]').count()) return lastPhase = "form-hydrating";
        return lastPhase = "not-rendered";
      }, { timeout: 15000, message: "J1 local activation boundary classification (no tokens)" })
        .toBe("ready");
    } catch {
      // Diagnostics contain only booleans about the disposable identity,
      // never user data, OTP/token values, cookie values or raw SQL errors.
      const account = rows(
        "select (email_confirmed_at is not null) as confirmed," +
        " (last_sign_in_at is not null) as signed" +
        " from auth.users where id=" + literal(invite.profileId),
      )[0];
      const callbackRejected = new URL(page.url()).searchParams.get("error") === "invalid";
      const sessionCookies = (await context.cookies())
        .filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
      const authCookiePresent = sessionCookies.length > 0;
      const cookieFlags = [...new Set(sessionCookies.map((cookie) =>
        "secure=" + cookie.secure + ",httpOnly=" + cookie.httpOnly +
        ",sameSite=" + cookie.sameSite + ",path=" + cookie.path +
        ",domainIsLoopback=" + (cookie.domain === "127.0.0.1"),
      ))].join(";");
      const pageIsLoopback = new URL(page.url()).hostname === "127.0.0.1";
      const roleVisible = sql([
        "begin;",
        "set local role authenticated;",
        "set local request.jwt.claim.sub=" + literal(invite.profileId) + ";",
        "select count(*) from public.user_roles where profile_id=" +
          literal(invite.profileId) + " and role='client';",
        "rollback;",
      ].join("\n")) === "1";
      // Probe the server independently while preserving the original browser
      // failure. This does not retry activation or suppress the failed test.
      const browserFetch = await page.evaluate(async () => {
        const response = await fetch("/ativar-conta/session", {
          cache: "no-store", credentials: "same-origin",
        });
        const payload = response.ok ? await response.json().catch(() => null) : null;
        return {
          status: response.status,
          authorized: payload?.role === "client" || payload?.role === "admin",
        };
      });
      const probe = await page.request.get("/ativar-conta/session", {
        failOnStatusCode: false,
      });
      const probeResult = probe.ok() ? await probe.json().catch(() => null) : null;
      const probeAuthorized =
        probeResult?.role === "client" || probeResult?.role === "admin";
      // Check whether a fresh GET with the established cookie repairs a
      // stale server component render. Diagnostic only: original failure is
      // still a failure and cannot be hidden by an automatic retry.
      await page.goto("/ativar-conta");
      const freshFormVisible = await page.locator('form[data-interactive="true"]')
        .isVisible().catch(() => false);
      throw new Error(
        "J1 synthetic invite activation blocked: phase=" + lastPhase +
        ", callbackRejected=" + callbackRejected +
        ", confirmed=" + Boolean(account?.confirmed) +
        ", signed=" + Boolean(account?.signed) +
        ", authCookiePresent=" + authCookiePresent +
        ", roleVisibleUnderRls=" + roleVisible +
        ", freshGetFormVisible=" + freshFormVisible +
        ", sessionEndpointResponses=" + sessionResponses.join(";") +
        ", probeHttp=" + probe.status() +
        ", probeRoleAuthorized=" + probeAuthorized +
        ", browserProbeHttp=" + browserFetch.status +
        ", browserProbeRoleAuthorized=" + browserFetch.authorized +
        ", cookieFlags=" + cookieFlags +
        ", pageIsLoopback=" + pageIsLoopback,
      );
    }
    // The fresh session route derives the authorized role from cookies and
    // RLS, without trusting URL parameters or the stale Server Component.
    const verifiedSession = await page.request.get("/ativar-conta/session");
    expect(verifiedSession.ok()).toBe(true);
    expect(await verifiedSession.json()).toEqual({ role: "client" });
    expect(verifiedSession.headers()["cache-control"]).toContain("no-store");
    await page.getByLabel("Crie sua senha").fill(password);
    await page.getByLabel("Confirme sua senha").fill(password);
    await page.getByRole("button", { name: "Criar senha e continuar" }).click();
    await expect(page).toHaveURL(/\/cliente\/anamnese\/?$/, { timeout: 20000 });
  });

  await test.step("Cadastro Atual persists after mobile reload", async () => {
    await page.goto("/cliente/perfil");
    await page.getByLabel("Cidade").fill("Cidade Sintética Local J1");
    await page.getByRole("button", { name: "Salvar Cadastro Atual" }).click();
    await expect.poll(() => {
      const result = rows("select city from public.client_registration where client_id=" +
        literal(invite.clientId));
      return result[0]?.city ?? null;
    }, { timeout: 20000 }).toBe("Cidade Sintética Local J1");
    await page.reload();
    await expect(page.getByLabel("Cidade")).toHaveValue("Cidade Sintética Local J1");
  });

  let draftId;
  await test.step("one hydrated click starts exactly one versioned Anamnese draft", async () => {
    await page.goto("/cliente/anamnese");
    await expect(page.getByRole("heading", { name: "Anamnese", exact: true })).toBeVisible();
    const form = page.locator('form[data-interactive="true"]')
      .filter({ has: page.getByRole("button", { name: "Começar Anamnese" }) });
    await expect(form).toBeVisible({ timeout: 15000 });
    await form.getByRole("button", { name: "Começar Anamnese" }).click();
    await expect(page).toHaveURL(/\/cliente\/anamnese\/[0-9a-f-]{36}\/?$/, {
      timeout: 20000,
    });
    draftId = page.url().split("/").at(-1);
    if (!UUID.test(draftId)) throw new Error("Draft route did not contain a UUID");
    const drafts = rows("select id,form_version_id,submitted_at from public.anamnesis_submissions" +
      " where client_id=" + literal(invite.clientId));
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toEqual({
      id: draftId, form_version_id: versionId, submitted_at: null,
    });
    await page.goto("/cliente/anamnese");
    await expect(page.getByRole("link", { name: "Continuar rascunho" }))
      .toHaveAttribute("href", "/cliente/anamnese/" + draftId);
  });

  await test.step("save and reopen a synthetic informational answer", async () => {
    await page.goto("/cliente/anamnese/" + draftId);
    const field = page.locator("#anamnesis-draft-answer-" + cityQuestionId);
    await expect(field).toBeVisible();
    await field.fill("Cidade Sintética Editada");
    await field.blur();
    await expect.poll(() => rows(
      "select answer_value from public.anamnesis_answers where submission_id=" +
      literal(draftId) + " and question_id=" + literal(cityQuestionId),
    ).map(item => item.answer_value), { timeout: 20000 }).toEqual(["Cidade Sintética Editada"]);
    await page.reload();
    await expect(page.locator("#anamnesis-draft-answer-" + cityQuestionId))
      .toHaveValue("Cidade Sintética Editada");
  });

  await test.step("no anonymous or unrelated-client access to the draft", async () => {
    const other = await browser.newContext({ baseURL });
    const visitor = await other.newPage();
    await visitor.goto("/cliente/anamnese/" + draftId);
    await expect(visitor).toHaveURL(/\/login\/?(?:[?].*)?$/);
    await other.close();
    const claims = JSON.stringify({
      sub: staffId, role: "authenticated", aal: "aal1",
    });
    const denied = sql([
      "begin;",
      "set local role authenticated;",
      "set local request.jwt.claims=" + literal(claims) + ";",
      "set local request.jwt.claim.sub=" + literal(staffId) + ";",
      "select count(*) from public.anamnesis_submissions where id=" + literal(draftId) + ";",
      "rollback;",
    ].join("\n"));
    expect(Number(denied)).toBe(0);
  });

  const mobile = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(mobile.scroll).toBeLessThanOrEqual(mobile.viewport + 1);
  await context.close();
});
