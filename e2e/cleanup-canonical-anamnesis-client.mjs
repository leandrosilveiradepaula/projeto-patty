import { createClient } from "@supabase/supabase-js";

const url = process.env.E2E_SUPABASE_URL;
const secret = process.env.E2E_SUPABASE_SECRET_KEY;
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

const client = await admin.from("clients").delete().eq("id", clientId);
if (client.error) throw client.error;

const role = await admin.from("user_roles").delete().eq("profile_id", profileId);
if (role.error) throw role.error;

const profile = await admin.from("profiles").delete().eq("id", profileId);
if (profile.error) throw profile.error;

const authUser = await admin.auth.admin.deleteUser(profileId);
if (authUser.error) throw authUser.error;

console.log("Ephemeral canonical E2E client cleanup complete.");
