import { createClient } from "@supabase/supabase-js";
import { readFixtureLedger, removeFixtureLedger, validateFixtureLedger } from "./j1-fixture-ledger.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^e2e-onboarding-[0-9a-f]{16}@example\.invalid$/;

function demand(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function exactAuth(admin, ledger) {
  if (ledger.profileId) {
    const response = await admin.auth.admin.getUserById(ledger.profileId);
    if (response.error && response.error.status !== 404) throw response.error;
    const user = response.data?.user ?? null;
    if (user && user.email !== ledger.email) {
      throw new Error("Refusing cleanup: Auth ID and fixture email disagree");
    }
    return user;
  }
  // A hard timeout may kill the browser between generating the invitation
  // identity and persisting its Auth ID in the ledger. Recover *only* by the
  // unique random fixture email and a creation time tied to this run.
  let found = null;
  let reachedLastPage = false;
  for (let page = 1; page <= 20; page++) {
    const response = await admin.auth.admin.listUsers({page,perPage:1000});
    const users = demand(response)?.users ?? [];
    for (const user of users) {
      if (user.email !== ledger.email) continue;
      if (found) throw new Error("Ambiguous synthetic Auth identity");
      found = user;
    }
    if (users.length < 1000) { reachedLastPage = true; break; }
  }
  if (!reachedLastPage) throw new Error("Auth pagination incomplete; refuse to assume fixture absent");
  return found;
}

export async function cleanupExactJ1Fixture(admin, ledger, env=process.env) {
  validateFixtureLedger(ledger, env);
  if (!EMAIL.test(ledger.email)) throw new Error("Invalid synthetic email");
  const auth = await exactAuth(admin, ledger);
  if (!auth) {
    // Already removed by the in-test finally. Before accepting an empty
    // Auth lookup, verify there is no linked profile/client left behind.
    if (ledger.profileId) {
      const profile = demand(await admin.from("profiles").select("id").eq("id",ledger.profileId));
      const client = demand(await admin.from("clients").select("id").eq("profile_id",ledger.profileId));
      const roles = demand(await admin.from("user_roles").select("profile_id").eq("profile_id",ledger.profileId));
      if (profile.length || client.length || roles.length) throw new Error("Orphaned synthetic profile/client after Auth deletion");
    }
    return "already-clean";
  }
  if (!UUID.test(auth.id) || auth.email !== ledger.email ||
      (ledger.profileId && ledger.profileId !== auth.id) ||
      !Number.isFinite(Date.parse(auth.created_at ?? "")) ||
      Date.parse(auth.created_at ?? "") < ledger.startedAt - 60000 ||
      Date.parse(auth.created_at ?? "") > Date.now() + 60000) {
    throw new Error("Synthetic Auth identity was not created by this run");
  }

  const clients = demand(await admin.from("clients").select("id,profile_id").eq("profile_id",auth.id));
  if (clients.length > 1 || (clients.length === 1 && !UUID.test(clients[0].id)) ||
      (clients.length === 1 && clients[0].profile_id !== auth.id) ||
      (ledger.clientId && clients.length === 1 && clients[0].id !== ledger.clientId)) {
    throw new Error("Refusing cleanup: synthetic Client ownership mismatch");
  }
  if (ledger.clientId && clients.length === 0) {
    const stray = demand(await admin.from("clients").select("id").eq("id",ledger.clientId));
    if (stray.length) throw new Error("Refusing cleanup: ledger Client belongs to another identity");
  }

  const client = clients[0] ?? null;
  let drafts = [];
  if (client) {
    drafts = demand(await admin.from("anamnesis_submissions")
      .select("id,submitted_at").eq("client_id",client.id));
    if (drafts.some(row => row.submitted_at !== null)) {
      throw new Error("Refusing cleanup of submitted clinical Anamnese");
    }
    const protocols = demand(await admin.from("protocols").select("id").eq("client_id",client.id).limit(1));
    if (protocols.length) throw new Error("Refusing cleanup of professional protocol");
  }

  // All ownership checks above must pass before the first delete. Every
  // delete is scoped to this one exact verified Auth/Client identity.
  for (const draft of drafts) {
    demand(await admin.from("anamnesis_answers").delete().eq("submission_id",draft.id));
    demand(await admin.from("anamnesis_submissions").delete()
      .eq("id",draft.id).eq("client_id",client.id).is("submitted_at",null));
  }
  if (client) {
    demand(await admin.from("client_registration").delete().eq("client_id",client.id));
    demand(await admin.from("client_assignments").delete().eq("client_id",client.id));
    demand(await admin.from("clients").delete()
      .eq("id",client.id).eq("profile_id",auth.id));
  }
  demand(await admin.from("user_roles").delete().eq("profile_id",auth.id).eq("role","client"));
  demand(await admin.from("profiles").delete().eq("id",auth.id));
  const removed = await admin.auth.admin.deleteUser(auth.id);
  if (removed.error) throw removed.error;

  const verify = await admin.auth.admin.getUserById(auth.id);
  if (!verify.error || verify.error.status !== 404) {
    throw new Error("Synthetic Auth deletion could not be verified");
  }
  const remaining = demand(await admin.from("clients").select("id").eq("profile_id",auth.id));
  if (remaining.length) throw new Error("Synthetic client remains after cleanup");
  return "cleaned";
}

async function main() {
  if (process.env.GITHUB_ACTIONS !== "true" ||
      process.env.GITHUB_REPOSITORY !== "leandrosilveiradepaula/projeto-patty" ||
      process.env.GITHUB_REF !== "refs/heads/master" ||
      process.env.J1_FIXTURE_CLEANUP_EXECUTE !== "true") {
    throw new Error("J1 cleanup is restricted to the explicitly enabled master workflow");
  }
  const ledger = await readFixtureLedger();
  const url = process.env.E2E_SUPABASE_URL;
  const key = process.env.E2E_SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("J1 synthetic cleanup credentials unavailable");
  const admin = createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const status = await cleanupExactJ1Fixture(admin,ledger);
  await removeFixtureLedger();
  console.log("J1 exact-fixture cleanup: " + status);
}

if (process.argv[1]?.endsWith("j1-independent-cleanup.mjs")) {
  main().catch(error => {console.error("J1 fixture cleanup BLOCKED: "+error.message);process.exitCode=1;});
}
