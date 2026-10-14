import { createClient } from "@supabase/supabase-js";

const emailPattern = /^e2e-onboarding-[0-9a-f]{16}@example\\.invalid$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Immutable, read-only audited residue of the failed browser run 38637655316.
// Keep exact identifiers only; never sweep a prefix or all test accounts.
const auditedResidue = Object.freeze({
  authId: "87d65afe-d2fe-4536-906e-7d7b98f6c402",
  clientId: "480e1d16-7ff9-45b1-8e66-dbf2f3de644f",
  email: "e2e-onboarding-d2a17333d0a09d06@example.invalid",
});

export function validateJ1Fixture(fixture) {
  if (!fixture || typeof fixture !== "object" ||
      !uuidPattern.test(fixture.authId ?? "") ||
      !emailPattern.test(fixture.email ?? "") ||
      (fixture.clientId != null && !uuidPattern.test(fixture.clientId))) {
    throw new Error("J1 cleanup denied: invalid or incomplete synthetic identity.");
  }
  return fixture;
}

export async function cleanupExactJ1Fixture(admin, rawFixture) {
  const fixture = validateJ1Fixture(rawFixture);
  const found = await admin.auth.admin.getUserById(fixture.authId);
  if (found.error) {
    // The identity could already have been safely removed inside Playwright.
    if (found.error.status === 404) return "already-absent";
    throw new Error("J1 cleanup cannot verify the Auth identity.");
  }
  if (!found.data.user || found.data.user.email !== fixture.email) {
    throw new Error("J1 cleanup refused an Auth/email ownership mismatch.");
  }
  const role = await admin.from("user_roles").select("role")
    .eq("profile_id", fixture.authId);
  if (role.error || role.data.some(row => row.role !== "client")) {
    throw new Error("J1 cleanup rejected identity with non-client role.");
  }
  const clients = await admin.from("clients").select("id,profile_id")
    .eq("profile_id", fixture.authId);
  if (clients.error || clients.data.length > 1) {
    throw new Error("J1 cleanup cannot verify unique synthetic client ownership.");
  }
  const client = clients.data[0] ?? null;
  if (client && (client.profile_id !== fixture.authId ||
      !fixture.clientId || client.id !== fixture.clientId)) {
    throw new Error("J1 cleanup rejected a client-id mismatch.");
  }
  if (!client && fixture.clientId) {
    // Partial cleanup may already have removed the client.
    const unexpected = await admin.from("clients").select("id")
      .eq("id", fixture.clientId).limit(1);
    if (unexpected.error || unexpected.data.length) {
      throw new Error("J1 cleanup rejected a reused client-id.");
    }
  }
  if (client) {
    const subs = await admin.from("anamnesis_submissions")
      .select("id,submitted_at").eq("client_id",client.id);
    if (subs.error || subs.data.some(s => s.submitted_at !== null)) {
      throw new Error("J1 cleanup refused submitted Anamnesis or unverified history.");
    }
    const protocols = await admin.from("protocols").select("id")
      .eq("client_id", client.id).limit(1);
    if (protocols.error || protocols.data.length > 0) {
      throw new Error("J1 cleanup refused professional protocol history.");
    }
    for(const submission of subs.data) {
      const answers = await admin.from("anamnesis_answers").delete()
        .eq("submission_id",submission.id);
      if(answers.error) throw answers.error;
      const deleted = await admin.from("anamnesis_submissions").delete()
        .eq("client_id",client.id).eq("id",submission.id)
        .is("submitted_at",null).select("id").single();
      if(deleted.error || deleted.data?.id !== submission.id) {
        throw new Error("J1 cleanup could not confirm deletion of a synthetic draft.");
      }
    }
    const registration = await admin.from("client_registration").delete()
      .eq("client_id",client.id);
    if(registration.error) throw registration.error;
    const assignments = await admin.from("client_assignments").delete()
      .eq("client_id",client.id);
    if(assignments.error) throw assignments.error;
    const deleted = await admin.from("clients").delete()
      .eq("profile_id",fixture.authId).eq("id",client.id)
      .select("id").single();
    if(deleted.error || deleted.data?.id !== client.id) {
      throw new Error("J1 cleanup could not verify removal of the synthetic client.");
    }
  }
  const deletedRoles = await admin.from("user_roles").delete()
    .eq("profile_id",fixture.authId).eq("role","client");
  if(deletedRoles.error) throw deletedRoles.error;
  const profile = await admin.from("profiles").delete().eq("id",fixture.authId);
  if(profile.error) throw profile.error;
  const deleted = await admin.auth.admin.deleteUser(fixture.authId);
  if(deleted.error) throw deleted.error;
  const check = await admin.auth.admin.getUserById(fixture.authId);
  if(check.data?.user || (check.error && check.error.status !== 404)) {
    throw new Error("J1 cleanup failed post-delete verification.");
  }
  return "removed";
}

async function main() {
  const url=process.env.E2E_SUPABASE_URL;
  const secret=process.env.E2E_SUPABASE_SECRET_KEY;
  if(!url || !secret || new URL(url).origin !==
    "https://hqanoskwjvpbgavppcud.supabase.co") {
    throw new Error("J1 cleanup requires exactly the approved Supabase production project.");
  }
  const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  const candidates=[auditedResidue];
  // GitHub Actions exposes this run's generated fixture through GITHUB_ENV
  // only on later steps. Never infer or delete an identity by prefix.
  if(process.env.E2E_J1_AUTH_ID){
    candidates.push({
      authId:process.env.E2E_J1_AUTH_ID,
      clientId:process.env.E2E_J1_CLIENT_ID || null,
      email:process.env.E2E_J1_EMAIL,
    });
  }
  for (const fixture of candidates) {
    const result=await cleanupExactJ1Fixture(admin,fixture);
    console.log("Verified J1 fixture cleanup:",result);
  }
}
if(process.argv[1] && import.meta.url === new URL("file://"+process.argv[1]).href){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
