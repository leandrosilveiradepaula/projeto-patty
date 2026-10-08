import { createClient } from "@supabase/supabase-js";

const url = process.env.E2E_SUPABASE_URL;
const secret = process.env.E2E_SUPABASE_SECRET_KEY;
const email = process.env.E2E_CANONICAL_EMAIL;
const profileId = process.env.E2E_CANONICAL_PROFILE_ID;
const clientId = process.env.E2E_CANONICAL_CLIENT_ID;

if (!url || !secret) {
  throw new Error("Missing canonical E2E cleanup environment.");
}

if (!profileId || !clientId) {
  console.log("Ephemeral canonical E2E client was not created; nothing to clean.");
  process.exit(0);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Never remove a record using unchecked identifiers, even with an admin test key.
if (!/^e2e-canonical-[0-9a-f]+@example\.invalid$/.test(email ?? "")) {
  throw new Error("Canonical E2E cleanup refused non-synthetic identity.");
}

const authUser = await admin.auth.admin.getUserById(profileId);
if (authUser.error || authUser.data.user?.email !== email) {
  throw new Error("Canonical E2E cleanup identity verification failed.");
}

const linkedClient = await admin
  .from("clients")
  .select("id, profile_id")
  .eq("id", clientId)
  .single();
if (linkedClient.error || linkedClient.data?.profile_id !== profileId) {
  throw new Error("Canonical E2E cleanup client ownership verification failed.");
}

// Refuse deletion unless every protocol record belongs to this disposable client
// and no professional review, approval or publication exists.
const protocols = await admin.from("protocols").select("id").eq("client_id", clientId);
if (protocols.error) throw protocols.error;
for (const protocol of protocols.data) {
  const versions = await admin.from("protocol_versions")
    .select("id, submitted_for_review_at").eq("protocol_id", protocol.id);
  if (versions.error) throw versions.error;
  for (const version of versions.data) {
    if (version.submitted_for_review_at) {
      throw new Error("Refusing cleanup of reviewed protocol history.");
    }
    const approvals = await admin.from("protocol_version_approvals")
      .select("id").eq("protocol_version_id", version.id).limit(1);
    const releases = await admin.from("protocol_publications")
      .select("id").eq("protocol_version_id", version.id).limit(1);
    if (approvals.error || releases.error || approvals.data.length || releases.data.length) {
      throw new Error("Refusing cleanup of approved or published protocol history.");
    }
    const deletedVersion = await admin.from("protocol_versions").delete()
      .eq("id", version.id).is("submitted_for_review_at", null).select("id").single();
    if (deletedVersion.error || !deletedVersion.data) {
      throw new Error("Synthetic draft deletion was not confirmed.");
    }
  }
  const deletedProtocol = await admin.from("protocols").delete()
    .eq("id", protocol.id).eq("client_id", clientId).select("id").single();
  if (deletedProtocol.error || !deletedProtocol.data) {
    throw new Error("Synthetic protocol deletion was not confirmed.");
  }
}

const submissions = await admin
  .from("anamnesis_submissions")
  .select("id, submitted_at")
  .eq("client_id", clientId);

if (submissions.error) throw submissions.error;

for (const submission of submissions.data) {
  if (submission.submitted_at !== null) {
    throw new Error(
      "Ephemeral canonical E2E client has a submitted Anamnesis; refusing destructive cleanup.",
    );
  }

  const answers = await admin
    .from("anamnesis_answers")
    .delete()
    .eq("submission_id", submission.id);
  if (answers.error) throw answers.error;

  const draft = await admin
    .from("anamnesis_submissions")
    .delete()
    .eq("id", submission.id)
    .is("submitted_at", null);
  if (draft.error) throw draft.error;
}

// The registration table references clients with ON DELETE RESTRICT.
// Remove only this verified synthetic client's own test registration.
const registration = await admin
  .from("client_registration")
  .delete()
  .eq("client_id", clientId);
if (registration.error) throw registration.error;

const client = await admin.from("clients").delete().eq("id", clientId);
if (client.error) throw client.error;

const role = await admin.from("user_roles").delete().eq("profile_id", profileId);
if (role.error) throw role.error;

const profile = await admin.from("profiles").delete().eq("id", profileId);
if (profile.error) throw profile.error;

const deletedAuthUser = await admin.auth.admin.deleteUser(profileId);
if (deletedAuthUser.error) throw deletedAuthUser.error;

console.log("Ephemeral canonical E2E client cleanup complete.");
