import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { generateTotp, loginAdminWithMfa } from "./helpers/admin-auth.mjs";
import { syntheticPdfBytes } from "./j6-blob-fixture/pdf.mjs";

// All identity and release writes use a disposable local database.
// The private PDF bytes are generated locally and served by an isolated
// signed-URL transport mock, NOT Vercel Blob or real educational material.
const baseURL = process.env.J6_E2E_BASE_URL;
const apiURL = process.env.J6_E2E_SUPABASE_URL;
const anonKey = process.env.J6_E2E_ANON_KEY;
const serviceKey = process.env.J6_E2E_SERVICE_ROLE_KEY;
if (process.env.J6_E2E_LOCAL_ONLY !== "true" ||
    baseURL !== "http://127.0.0.1:3000" ||
    apiURL !== "http://127.0.0.1:54321" || !anonKey || !serviceKey ||
    !/^[a-f0-9]{64}$/.test(process.env.J6_E2E_BLOB_FIXTURE_SECRET ?? "") ||
    Boolean(process.env.BLOB_READ_WRITE_TOKEN) || Boolean(process.env.VERCEL_OIDC_TOKEN)) {
  throw new Error("J6 browser test requires disposable localhost services");
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fixtureTables = new Set([
  "profiles", "user_roles", "clients", "client_assignments",
  // Includes a deliberately nonexistent path and a separately served synthetic PDF.
  "educational_content_assets",
]);
const service = createClient(apiURL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function anonClient() {
  return createClient(apiURL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
function literal(value) {
  if (value === null) return "NULL";
  if (!["string", "number"].includes(typeof value))
    throw new TypeError("Unsupported synthetic SQL value");
  return "'" + String(value).replaceAll("'", "''") + "'";
}
function sql(statement) {
  if (process.env.J6_E2E_LOCAL_ONLY !== "true" ||
      apiURL !== "http://127.0.0.1:54321")
    throw new Error("Local-only SQL boundary rejected");
  return execFileSync("docker", [
    "exec", "-i", "supabase_db_projeto-patty", "psql",
    "-X", "-q", "-U", "postgres", "-d", "postgres",
    "-A", "-t", "-v", "ON_ERROR_STOP=1",
  ], { input: statement.trimEnd() + "\n", encoding: "utf8", timeout: 12000 }).trim();
}
function rows(query) {
  return JSON.parse(sql(
    "select coalesce(json_agg(row_to_json(t)),'[]'::json)::text from (" +
    query + ") t;",
  ));
}
function insert(table, fields) {
  if (!fixtureTables.has(table) ||
      !Object.keys(fields).every(k => /^[a-z][a-z0-9_]*$/.test(k)))
    throw new Error("Fixture table/column is not permitted");
  const pk = table === "user_roles" ? "profile_id" : "id";
  const id = sql("insert into public." + table + " (" +
    Object.keys(fields).join(",") + ") values (" +
    Object.values(fields).map(literal).join(",") +
    ") returning " + pk + ";");
  if (!UUID.test(id)) throw new Error("Fixture INSERT returned no UUID");
  return id;
}
async function identity(role, label, nonce) {
  const email = "e2e-j6-" + label + "-" + nonce + "@example.invalid";
  if (!/^e2e-j6-(staff|unassigned|owner|foreign)-[0-9a-f]{16}@example\.invalid$/.test(email))
    throw new Error("Only local synthetic identities are permitted");
  const password = "J6-" + randomBytes(18).toString("base64url") + "-Aa1!";
  const created = await service.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (created.error || !created.data?.user?.id)
    throw created.error ?? new Error("Synthetic Auth setup failed");
  const id = created.data.user.id;
  insert("profiles", { id, display_name: "J6 synthetic " + label });
  insert("user_roles", { profile_id: id, role });
  return { id, email, password };
}
async function enrollTotp(user) {
  const api = anonClient();
  const signed = await api.auth.signInWithPassword({
    email: user.email, password: user.password,
  });
  if (signed.error) throw signed.error;
  try {
    const enrolled = await api.auth.mfa.enroll({
      factorType: "totp", friendlyName: "J6 disposable TOTP",
    });
    if (enrolled.error) throw enrolled.error;
    const challenged = await api.auth.mfa.challenge({ factorId: enrolled.data.id });
    if (challenged.error) throw challenged.error;
    const verified = await api.auth.mfa.verify({
      factorId: enrolled.data.id,
      challengeId: challenged.data.id,
      code: generateTotp(enrolled.data.totp.secret),
    });
    if (verified.error) throw verified.error;
    return enrolled.data.totp.secret;
  } finally {
    await api.auth.signOut();
  }
}
async function loginClient(page, user) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cliente\/?$/, { timeout: 20000 });
  await page.goto("/cliente/conteudos");
  await expect(page.getByRole("heading", { name: "Conteúdos", exact: true })).toBeVisible();
}
async function pollRows(query, expected) {
  await expect.poll(() => rows(query).length, { timeout: 25000 }).toBe(expected);
  return rows(query);
}
function versions(contentId) {
  return rows("select id,educational_content_id,version_number,title,published_at" +
    " from public.educational_content_versions where educational_content_id=" +
    literal(contentId) + " order by version_number");
}
function releases(clientId) {
  return rows("select id,educational_content_version_id" +
    " from public.client_content_releases where client_id=" +
    literal(clientId) + " order by released_at,id");
}
// Only count isolated rows under real authenticated RLS, never service role.
function visibleCount(profileId, aal, table, rowId) {
  if (!UUID.test(profileId) || !UUID.test(rowId) ||
      !["aal1", "aal2"].includes(aal) ||
      !["educational_content_versions", "educational_content_assets", "client_content_releases"].includes(table))
    throw new Error("Invalid synthetic RLS visibility probe");
  const claims = JSON.stringify({ sub: profileId, role: "authenticated", aal });
  return Number(sql([
    "begin;",
    "set local statement_timeout='5s';",
    "set local role authenticated;",
    "set local request.jwt.claims=" + literal(claims) + ";",
    "set local request.jwt.claim.sub=" + literal(profileId) + ";",
    "select count(*) from public." + table + " where id=" + literal(rowId) + ";",
    "rollback;",
  ].join("\n")));
}
// Roll back the insert, but exercise the exact INSERT policy and FK/trigger
// under authenticated/AAL2 with synthetic IDs. Never commit a test release.
function assertLocalReleaseInsertAllowed(staffId, clientId, versionId) {
  if (![staffId, clientId, versionId].every(x => UUID.test(x))) {
    throw new Error("Invalid synthetic release probe");
  }
  const jwt = JSON.stringify({ sub: staffId, role: "authenticated", aal: "aal2" });
  const result = sql([
    "begin;",
    "set local statement_timeout='5s';",
    "set local role authenticated;",
    "set local request.jwt.claims=" + literal(jwt) + ";",
    "set local request.jwt.claim.sub=" + literal(staffId) + ";",
    "insert into public.client_content_releases (client_id, educational_content_version_id, released_by_profile_id)",
    " values (" + [clientId, versionId, staffId].map(literal).join(",") + ") returning id;",
    "rollback;",
  ].join("\n"));
  expect(result).toMatch(UUID);
}

function assertLocalReleaseInsertRejectedWithoutAsset(staffId, clientId, versionId) {
  if (![staffId, clientId, versionId].every(x => UUID.test(x)))
    throw new Error("Invalid synthetic release rejection probe");
  const claims = JSON.stringify({ sub: staffId, role: "authenticated", aal: "aal2" });
  const result = sql([
    "begin;",
    "set local statement_timeout='5s';",
    "set local role authenticated;",
    "set local request.jwt.claims=" + literal(claims) + ";",
    "set local request.jwt.claim.sub=" + literal(staffId) + ";",
    "do $guard$ begin",
    "  begin",
    "    insert into public.client_content_releases",
    "      (client_id, educational_content_version_id, released_by_profile_id)",
    "      values (" + [clientId, versionId, staffId].map(literal).join(",") + ");",
    "    raise exception 'unprotected release insert' using errcode='XX000';",
    "  exception when check_violation then",
    "    null;",
    "  end;",
    "end $guard$;",
    "select 'blocked-without-asset';",
    "rollback;",
  ].join("\n"));
  expect(result).toBe("blocked-without-asset");
}

async function assertMobile(page) {
  const x = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(x.width).toBeLessThanOrEqual(x.viewport + 2);
}

test.use({ baseURL });

test("J6: versioned content releases require exact published version and synthetic asset metadata", async ({ browser }) => {
  test.setTimeout(420000);
  const nonce = randomBytes(8).toString("hex");
  const staff = await identity("admin", "staff", nonce);
  const unassigned = await identity("admin", "unassigned", nonce);
  const owner = await identity("client", "owner", nonce);
  const foreign = await identity("client", "foreign", nonce);
  const clientId = insert("clients", {
    profile_id: owner.id, full_name: "J6 Cliente sintetica", status: "active",
  });
  insert("clients", {
    profile_id: foreign.id, full_name: "J6 Outra cliente sintetica", status: "active",
  });
  insert("client_assignments", { client_id: clientId, staff_profile_id: staff.id });
  const totp = await enrollTotp(staff);
  await enrollTotp(unassigned);
  const adminCtx = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const ownerCtx = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const foreignCtx = await browser.newContext({ baseURL });
  try {
    const admin = await adminCtx.newPage();
    const client = await ownerCtx.newPage();
    const outsider = await foreignCtx.newPage();
    await loginAdminWithMfa(admin, {
      email: staff.email, password: staff.password, totpSecret: totp,
    });
    await loginClient(client, owner);
    await loginClient(outsider, foreign);
    await expect(client.getByText("Nenhum conteúdo foi liberado para você ainda", {
      exact: true,
    })).toBeVisible();

    let contentId;
    let v1;
    await test.step("Admin creates first draft but neither client sees it", async () => {
      await admin.goto("/admin/conteudos");
      await admin.getByLabel("Título", { exact: true }).fill("J6 material sem arquivo sintetico");
      await admin.getByLabel("Tipo de conteúdo", { exact: true }).selectOption("video");
      await admin.getByRole("button", { name: "Criar rascunho" }).click();
      const saved = await pollRows(
        "select c.id from public.educational_contents c" +
        " join public.educational_content_versions v on v.educational_content_id=c.id" +
        " where v.title=" + literal("J6 material sem arquivo sintetico"), 1,
      );
      contentId = saved[0].id;
      expect(contentId).toMatch(UUID);
      await expect(admin).toHaveURL(new RegExp("/admin/conteudos/" + contentId));
      v1 = versions(contentId)[0];
      expect(v1.version_number).toBe(1);
      expect(v1.published_at).toBeNull();
      expect(visibleCount(owner.id, "aal1", "educational_content_versions", v1.id)).toBe(0);
      expect(visibleCount(foreign.id, "aal1", "educational_content_versions", v1.id)).toBe(0);
      expect(visibleCount(staff.id, "aal1", "educational_content_versions", v1.id)).toBe(0);
      expect(visibleCount(staff.id, "aal2", "educational_content_versions", v1.id)).toBe(1);
      await assertMobile(admin);
    });

    await test.step("Draft metadata without file cannot be published or released", async () => {
      await expect(admin.getByRole("button", { name: "Publicar versão" })).toBeDisabled();
      await expect(admin.getByText(/Registre o asset privado video\/mp4/, { exact: true })).toBeVisible();
      await admin.goto("/admin/clientes/" + clientId + "/conteudos");
      await expect(admin.getByText("Nenhum conteúdo disponível para liberar", {
        exact: true,
      })).toBeVisible();
      expect(releases(clientId)).toHaveLength(0);
      // The server action is not the only protection: REST/SQL INSERT as an
      // authorized AAL2 professional must also fail on missing asset metadata.
      assertLocalReleaseInsertRejectedWithoutAsset(staff.id, clientId, v1.id);
      expect(visibleCount(owner.id, "aal1", "educational_content_versions", v1.id)).toBe(0);
      await client.reload();
      await expect(client.getByText("Nenhum conteúdo foi liberado para você ainda", {
        exact: true,
      })).toBeVisible();

      // A synthetic registered video is needed solely to create a subsequent
      // version; it is never released to a client in this test.
      insert("educational_content_assets", {
        educational_content_version_id: v1.id,
        asset_key: "primary",
        storage_provider: "vercel_blob",
        storage_path: "j6-local-verified/" + nonce + "/first-object.mp4",
        content_type: "video/mp4",
        byte_size: 32,
        sha256_hex: "b".repeat(64),
      });
      await admin.goto("/admin/conteudos/" + contentId);
      await admin.getByLabel(/Confirmo que a versão 1 foi revisada/).check();
      await admin.getByRole("button", { name: "Publicar versão" }).click();
      await expect.poll(() => Boolean(versions(contentId)[0]?.published_at), {
        timeout: 25000,
      }).toBe(true);
    });

    let v2;
    let syntheticAssetId;
    await test.step("New draft is versioned and a local-only asset metadata fixture is added", async () => {
      await admin.goto("/admin/conteudos/" + contentId);
      await admin.getByRole("button", { name: "Criar nova versão" }).click();
      await expect.poll(() => versions(contentId).length, { timeout: 25000 }).toBe(2);
      v2 = versions(contentId)[1];
      expect(v2.version_number).toBe(2);
      expect(v2.published_at).toBeNull();
      await admin.reload();
      await admin.getByLabel("Título", { exact: true }).fill("J6 material com asset sintetico");
      await admin.getByRole("button", { name: "Salvar rascunho" }).click();
      await expect.poll(() => versions(contentId)[1].title, { timeout: 25000 })
        .toBe("J6 material com asset sintetico");
      // Browser reload after an uncertain asset registration: the metadata is
      // purely synthetic and local to this test. No PUT to the real Blob is made.
      // The read-only server check must decide what may happen next.
      const pendingAsset = {
        pathname: "j6-local-nonexistent/" + nonce + "/no-object.mp4",
        contentType: "video/mp4",
        byteSize: 32,
        sha256Hex: "a".repeat(64),
      };
      const recoveryKey = "patty.educational-asset-registration." + contentId + "." + v2.id;
      await admin.evaluate(({ key, asset }) => {
        sessionStorage.setItem(key, JSON.stringify(asset));
      }, { key: recoveryKey, asset: pendingAsset });
      let unexpectedPuts = 0;
      const observePut = (request) => { if (request.method() === "PUT") unexpectedPuts++; };
      admin.on("request", observePut);
      await admin.reload();
      await expect(admin.getByText(
        "Há um registro de asset pendente nesta sessão do navegador. Consulte o estado antes de registrar novamente.",
        { exact: true },
      )).toBeVisible();
      await expect(admin.getByLabel("Arquivo aprovado para upload privado")).toBeDisabled();
      await expect(admin.getByRole("button", { name: "Enviar para o Blob privado" })).toBeDisabled();
      await expect(admin.getByRole("checkbox", { name: /Revisei os dados do upload/ })).toBeDisabled();
      await expect(admin.getByRole("button", { name: "Registrar asset verificado" })).toBeDisabled();
      await admin.getByRole("button", { name: "Consultar estado do registro" }).click();
      await expect(admin.getByText(
        "O servidor não encontrou um registro para este arquivo. Você pode repetir somente o registro dos metadados, sem transferir o arquivo novamente.",
        { exact: true },
      )).toBeVisible();
      expect(rows("select id from public.educational_content_assets where educational_content_version_id=" +
        literal(v2.id))).toHaveLength(0);
      expect(releases(clientId)).toHaveLength(0);

      // Simulate the matching commit arriving after the first read-only check.
      // An idempotent registration must observe this exact record, not duplicate
      // the asset or silently publish/release content to either client.
      syntheticAssetId = insert("educational_content_assets", {
        educational_content_version_id: v2.id,
        asset_key: "primary",
        storage_provider: "vercel_blob",
        storage_path: pendingAsset.pathname,
        content_type: pendingAsset.contentType,
        byte_size: pendingAsset.byteSize,
        sha256_hex: pendingAsset.sha256Hex,
      });
      await admin.getByRole("checkbox", { name: /Revisei os dados do upload/ }).check();
      await admin.getByRole("button", { name: "Registrar asset verificado" }).click();
      await expect.poll(() => admin.evaluate((key) =>
        sessionStorage.getItem(key), recoveryKey), { timeout: 20000 }).toBeNull();
      expect(rows("select id from public.educational_content_assets where educational_content_version_id=" +
        literal(v2.id))).toEqual([{ id: syntheticAssetId }]);
      expect(versions(contentId)[1].published_at).toBeNull();
      expect(releases(clientId)).toHaveLength(0);
      expect(unexpectedPuts, "Registration recovery must not transfer a second Blob").toBe(0);
      admin.off("request", observePut);
      expect(visibleCount(owner.id, "aal1", "educational_content_assets", syntheticAssetId)).toBe(0);
      expect(visibleCount(staff.id, "aal1", "educational_content_assets", syntheticAssetId)).toBe(0);
      expect(visibleCount(staff.id, "aal2", "educational_content_assets", syntheticAssetId)).toBe(1);
      await admin.reload();
      await expect(admin.getByText("Nenhum asset registrado")).toHaveCount(0);
      const adminVideo = admin.getByLabel("Reproduzir vídeo: J6 material com asset sintetico");
      await expect(adminVideo).toBeVisible();
      await expect(adminVideo).toHaveAttribute("preload", "none");
      await expect(adminVideo).toHaveAttribute("src", `/admin/conteudos/assets/${syntheticAssetId}`);
      // No attempt to play: the local metadata does not have real Blob bytes.
      await assertMobile(admin);
    });

    const secondTitle = "J6 segundo material sintetico";
    let secondVersion;
    let secondAssetId;
    let releaseId;
    await test.step("Manual publication then individual release grants only the exact version", async () => {
      await admin.getByLabel(/Confirmo que a versão 2 foi revisada/).check();
      await admin.getByRole("button", { name: "Publicar versão" }).click();
      await expect.poll(() => Boolean(versions(contentId)[1]?.published_at), {
        timeout: 25000,
      }).toBe(true);
      expect(visibleCount(owner.id, "aal1", "educational_content_versions", v2.id)).toBe(0);

      // Prepare a second distinct published material BEFORE the first manual
      // release. Both options must be available within the same admin form.
      // This fixture uses only synthetic metadata in the disposable database.
      await admin.goto("/admin/conteudos");
      await admin.getByLabel("Título", { exact: true }).fill(secondTitle);
      await admin.getByLabel("Tipo de conteúdo", { exact: true }).selectOption("pdf");
      await admin.getByRole("button", { name: "Criar rascunho" }).click();
      const secondContent = await pollRows(
        "select c.id from public.educational_contents c" +
        " join public.educational_content_versions v on v.educational_content_id=c.id" +
        " where v.title=" + literal(secondTitle), 1,
      );
      const secondContentId = secondContent[0].id;
      expect(secondContentId).toMatch(UUID);
      await expect(admin).toHaveURL(new RegExp("/admin/conteudos/" + secondContentId));
      secondVersion = versions(secondContentId)[0];
      expect(secondVersion.published_at).toBeNull();
      // Only this second PDF exists physically in the local signed-media fixture.
      // It is NOT a real Vercel object; client release is still required.
      secondAssetId = insert("educational_content_assets", {
        educational_content_version_id: secondVersion.id,
        asset_key: "primary",
        storage_provider: "vercel_blob",
        storage_path: "j6-local-verified/" + nonce + "/second-object.pdf",
        content_type: "application/pdf",
        byte_size: syntheticPdfBytes.length,
        sha256_hex: createHash("sha256").update(syntheticPdfBytes).digest("hex"),
      });
      const beforeRelease = await ownerCtx.request.get(
        "/cliente/conteudos/assets/" + secondAssetId, { maxRedirects: 0 },
      );
      expect(beforeRelease.status()).toBe(404);
      expect(visibleCount(owner.id, "aal1", "educational_content_assets", secondAssetId))
        .toBe(0);
      await admin.reload();
      await admin.getByLabel(/Confirmo que a versão 1 foi revisada/).check();
      await admin.getByRole("button", { name: "Publicar versão" }).click();
      await expect.poll(() => Boolean(versions(secondContentId)[0]?.published_at), {
        timeout: 25000,
      }).toBe(true);
      expect(visibleCount(owner.id, "aal1", "educational_content_versions", secondVersion.id)).toBe(0);

      await admin.goto("/admin/clientes/" + clientId + "/conteudos");
      await expect(admin.getByRole("heading", { name: "Liberar conteúdo" })).toBeVisible();
      // Guard the RLS fix structurally; a privileged helper could make the
      // test green while silently bypassing release authorization.
      expect(sql("select prosecdef from pg_proc where oid=" +
        "'app_private.educational_content_version_is_published_for_release(uuid)'::regprocedure;")).toBe("f");
      expect(sql("select has_function_privilege('anon'," +
        "'app_private.educational_content_version_is_published_for_release(uuid)','EXECUTE');")).toBe("f");
      expect(sql("select has_function_privilege('authenticated'," +
        "'app_private.educational_content_version_is_published_for_release(uuid)','EXECUTE');")).toBe("t");
      expect(sql("select qual is null and with_check like " +
        "'%educational_content_version_is_published_for_release%'" +
        " from pg_policies where schemaname='public' and " +
        "tablename='client_content_releases' and " +
        "policyname='client_content_releases_admin_assigned_insert';")).toBe("t");
      // Separate RLS/trigger authorization from the server action/UI layer.
      assertLocalReleaseInsertAllowed(staff.id, clientId, v2.id);
      await admin.getByLabel("Versão de conteúdo").selectOption(v2.id);
      await admin.getByRole("button", { name: "Revisar liberação" }).click();
      await admin.getByRole("button", { name: "Confirmar liberação" }).click();
      // Distinguish an action rejection from an action that never submitted.
      await expect.poll(async () => {
        if (releases(clientId).some(r => r.educational_content_version_id === v2.id))
          return "recorded";
        if (await admin.getByText("Não foi possível liberar", { exact: true }).count())
          return "action-rejected";
        return "pending";
      }, { timeout: 20000 }).toBe("recorded");
      const recorded = await pollRows(
        "select id from public.client_content_releases where client_id=" +
        literal(clientId) + " and educational_content_version_id=" + literal(v2.id), 1,
      );
      releaseId = recorded[0].id;
      expect(visibleCount(owner.id, "aal1", "client_content_releases", releaseId)).toBe(1);
      expect(visibleCount(owner.id, "aal1", "educational_content_versions", v2.id)).toBe(1);
      expect(visibleCount(owner.id, "aal1", "educational_content_assets", syntheticAssetId)).toBe(1);
      expect(visibleCount(owner.id, "aal1", "educational_content_versions", v1.id)).toBe(0);
      expect(visibleCount(foreign.id, "aal1", "client_content_releases", releaseId)).toBe(0);
      expect(visibleCount(foreign.id, "aal1", "educational_content_assets", syntheticAssetId)).toBe(0);
      expect(visibleCount(unassigned.id, "aal2", "client_content_releases", releaseId)).toBe(0);
      expect(visibleCount(staff.id, "aal1", "client_content_releases", releaseId)).toBe(0);
      await client.reload();
      await expect(client.getByText("J6 material com asset sintetico", { exact: true })).toBeVisible();
      const clientVideo = client.getByLabel("Reproduzir vídeo: J6 material com asset sintetico");
      await expect(clientVideo).toBeVisible();
      await expect(clientVideo).toHaveAttribute("preload", "none");
      await expect(clientVideo).toHaveAttribute("src", `/cliente/conteudos/assets/${syntheticAssetId}`);
      await expect(client.getByText("J6 material sem arquivo sintetico", { exact: true })).toHaveCount(0);
      await outsider.reload();
      await expect(outsider.getByText("Nenhum conteúdo foi liberado para você ainda", {
        exact: true,
      })).toBeVisible();
      await assertMobile(client);
    });

    await test.step("Two manual releases work consecutively without reloading the admin page", async () => {
      // The previous action returned success. The refreshed server history
      // must reset the form's action state. The review button intentionally
      // stays disabled until the professional selects another exact version.
      await expect(admin.getByLabel("Versão de conteúdo"))
        .toBeEnabled({ timeout: 20000 });
      await admin.getByLabel("Versão de conteúdo").selectOption(secondVersion.id);
      await expect(admin.getByRole("button", { name: "Revisar liberação" }))
        .toBeEnabled({ timeout: 20000 });
      await admin.getByRole("button", { name: "Revisar liberação" }).click();
      await admin.getByRole("button", { name: "Confirmar liberação" }).click();
      await expect.poll(async () => {
        if (releases(clientId).some(r => r.educational_content_version_id === secondVersion.id))
          return "recorded";
        if (await admin.getByText("Não foi possível liberar", { exact: true }).count())
          return "action-rejected";
        return "pending";
      }, { timeout: 20000 }).toBe("recorded");
      const recorded = await pollRows(
        "select id from public.client_content_releases where client_id=" +
        literal(clientId) + " and educational_content_version_id=" +
        literal(secondVersion.id), 1,
      );
      expect(releases(clientId)).toHaveLength(2);
      expect(visibleCount(owner.id, "aal1", "client_content_releases", recorded[0].id)).toBe(1);
      expect(visibleCount(owner.id, "aal1", "educational_content_versions", secondVersion.id)).toBe(1);
      expect(visibleCount(foreign.id, "aal1", "client_content_releases", recorded[0].id)).toBe(0);
      expect(visibleCount(unassigned.id, "aal2", "client_content_releases", recorded[0].id)).toBe(0);
      await client.reload();
      await expect(client.getByText(secondTitle, { exact: true })).toBeVisible();
      await expect(client.getByText("J6 material com asset sintetico", { exact: true })).toBeVisible();
      await assertMobile(admin);
      await assertMobile(client);
    });

    await test.step("Client mobile searches the released library and opens only her exact PDF", async () => {
      // This exercises the actual CLIENT touch UI. The provider behind the
      // authorized redirect is local and synthetic, never the real Vercel Blob.
      await client.goto("/cliente/conteudos");
      const search = client.getByRole("searchbox", {
        name: "Buscar na sua biblioteca",
      });
      await expect(search).toBeVisible();
      await search.fill(secondTitle);
      await expect(client.getByText(secondTitle, { exact: true })).toBeVisible();
      await expect(client.getByText("J6 material com asset sintetico", {
        exact: true,
      })).toHaveCount(0);
      await assertMobile(client);

      const pdfLink = client.getByRole("link", {
        name: "Abrir conteúdo de " + secondTitle + " em nova aba",
      });
      await expect(pdfLink).toBeVisible();
      await expect(pdfLink).toHaveAttribute("href",
        "/cliente/conteudos/assets/" + secondAssetId);
      await expect(pdfLink).toHaveAttribute("target", "_blank");
      await expect(pdfLink).toHaveAttribute("rel", /noopener.*noreferrer/);
      // No signed private Blob ticket appears in server HTML or React props.
      expect(await client.locator("a[href]").evaluateAll((nodes) =>
        nodes.some((node) => node.href.startsWith("http://127.0.0.1:54329/"))
      )).toBe(false);

      const assetRoute = "/cliente/conteudos/assets/" + secondAssetId;
      const requestedAsset = ownerCtx.waitForEvent("request", (request) =>
        request.method() === "GET" &&
        new URL(request.url()).pathname === assetRoute,
      );
      const nextPage = ownerCtx.waitForEvent("page");
      await pdfLink.tap();
      const pdfTab = await nextPage;
      try {
        // Headless Chromium may leave its built-in PDF viewer tab at about:blank
        // rather than expose the final private PDF URL. Prove the browser
        // clicked the authenticated link and received the 307 instead.
        const mediaRequest = await requestedAsset;
        const mediaRedirect = await mediaRequest.response();
        expect(mediaRedirect?.status()).toBe(307);
        expect(mediaRedirect?.headers()["cache-control"]).toContain("no-store");
        expect(new URL(mediaRedirect.headers()["location"]).origin)
          .toBe("http://127.0.0.1:54329");
      } finally {
        await pdfTab.close();
      }
      // A browser issuing a redirect is not evidence of visible PDF render,
      // full consumption, or completion. Exact byte delivery, SHA and Range
      // are tested independently via the same authorized application route.
      expect(rows("select client_content_release_id from public.client_content_progress" +
        " where client_id=" + literal(clientId))).toHaveLength(0);
      expect(releases(clientId)).toHaveLength(2);

      await search.fill("");
      await expect(client.getByText("J6 material com asset sintetico", {
        exact: true,
      })).toBeVisible();
      await expect(client.getByText(secondTitle, { exact: true })).toBeVisible();
      await assertMobile(client);
    });

    await test.step("Physically missing media never counts as a successful download", async () => {
      // Metadata alone may be releasable, but a valid signed redirect cannot
      // create the underlying binary object. The provider simulator returns 404.
      const url = "/cliente/conteudos/assets/" + syntheticAssetId;
      const ownerResponse = await ownerCtx.request.get(url, { maxRedirects: 0 });
      expect(ownerResponse.status()).toBe(307);
      const missingLocation = ownerResponse.headers().location;
      expect(new URL(missingLocation).origin).toBe("http://127.0.0.1:54329");
      const missingBytes = await ownerCtx.request.get(missingLocation, { maxRedirects: 0 });
      expect(missingBytes.status()).toBe(404);
      const foreignResponse = await foreignCtx.request.get(url, { maxRedirects: 0 });
      expect(foreignResponse.status()).toBe(404);
      expect(rows("select client_content_release_id from public.client_content_progress" +
        " where client_id=" + literal(clientId))).toHaveLength(0);
    });

    await test.step("Only released J6 PDF bytes are delivered, including private Range reads", async () => {
      const route = "/cliente/conteudos/assets/" + secondAssetId;
      expect(visibleCount(owner.id, "aal1", "educational_content_assets", secondAssetId))
        .toBe(1);
      expect(visibleCount(foreign.id, "aal1", "educational_content_assets", secondAssetId))
        .toBe(0);

      const foreignResponse = await foreignCtx.request.get(route, { maxRedirects: 0 });
      expect(foreignResponse.status()).toBe(404);
      const unauthenticated = await browser.newContext({ baseURL });
      try {
        const anonymous = await unauthenticated.request.get(route, { maxRedirects: 0 });
        expect(anonymous.headers().location ?? "").not.toContain("127.0.0.1:54329");
        expect(anonymous.status()).not.toBe(200);
      } finally {
        await unauthenticated.close();
      }

      const allowed = await ownerCtx.request.get(route, { maxRedirects: 0 });
      expect(allowed.status()).toBe(307);
      expect(allowed.headers()["cache-control"]).toContain("no-store");
      expect(allowed.headers()["referrer-policy"]).toBe("no-referrer");
      const url = allowed.headers().location;
      expect(new URL(url).origin).toBe("http://127.0.0.1:54329");

      const full = await ownerCtx.request.get(url, { maxRedirects: 0 });
      expect(full.status()).toBe(200);
      expect(full.headers()["content-type"]).toBe("application/pdf");
      expect(full.headers()["content-length"]).toBe(String(syntheticPdfBytes.length));
      expect(full.headers()["accept-ranges"]).toBe("bytes");
      const deliveredBytes = await full.body();
      expect(deliveredBytes.equals(syntheticPdfBytes)).toBe(true);
      expect(createHash("sha256").update(deliveredBytes).digest("hex"))
        .toBe(createHash("sha256").update(syntheticPdfBytes).digest("hex"));

      const partial = await ownerCtx.request.get(url, {
        maxRedirects: 0, headers: { Range: "bytes=0-15" },
      });
      expect(partial.status()).toBe(206);
      expect(partial.headers()["content-range"])
        .toBe("bytes 0-15/" + syntheticPdfBytes.length);
      expect((await partial.body()).equals(syntheticPdfBytes.subarray(0, 16))).toBe(true);

      const invalidRange = await ownerCtx.request.get(url, {
        maxRedirects: 0, headers: { Range: "bytes=999999-" },
      });
      expect(invalidRange.status()).toBe(416);
      expect(invalidRange.headers()["content-range"])
        .toBe("bytes */" + syntheticPdfBytes.length);

      const unsigned = await ownerCtx.request.get("http://127.0.0.1:54329/private", {
        maxRedirects: 0,
      });
      expect(unsigned.status()).toBe(403);
      const altered = new URL(url);
      const ticket = altered.searchParams.get("ticket");
      expect(ticket).toBeTruthy();
      altered.searchParams.set("ticket", ticket.slice(0, -1) + (ticket.endsWith("0") ? "1" : "0"));
      const forged = await ownerCtx.request.get(altered.toString(), { maxRedirects: 0 });
      expect(forged.status()).toBe(403);

      const adminRead = await adminCtx.request.get(
        "/admin/conteudos/assets/" + secondAssetId, { maxRedirects: 0 },
      );
      expect(adminRead.status()).toBe(307);
      expect(new URL(adminRead.headers().location).origin)
        .toBe("http://127.0.0.1:54329");
      expect(rows("select client_content_release_id from public.client_content_progress" +
        " where client_id=" + literal(clientId))).toHaveLength(0);
      await assertMobile(client);
    });

    await test.step("New empty draft does not silently replace release of v2", async () => {
      await admin.goto("/admin/conteudos/" + contentId);
      await admin.getByRole("button", { name: "Criar nova versão" }).click();
      await expect.poll(() => versions(contentId).length, { timeout: 25000 }).toBe(3);
      const v3 = versions(contentId)[2];
      expect(v3.version_number).toBe(3);
      await admin.reload();
      await expect(admin.getByRole("button", { name: "Publicar versão" })).toBeDisabled();
      expect(versions(contentId)[2]?.published_at).toBeNull();
      expect(releases(clientId)).toHaveLength(2);
      expect(visibleCount(owner.id, "aal1", "educational_content_versions", v3.id)).toBe(0);
      await client.reload();
      await expect(client.getByText("J6 material com asset sintetico", { exact: true })).toBeVisible();
      await expect(client.getByText("J6 material sem arquivo sintetico", { exact: true })).toHaveCount(0);
    });
  } finally {
    await Promise.all([adminCtx.close(), ownerCtx.close(), foreignCtx.close()]);
  }
});
