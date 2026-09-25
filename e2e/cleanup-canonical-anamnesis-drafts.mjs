import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseSecretKey = process.env.E2E_SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Missing E2E_SUPABASE_URL or E2E_SUPABASE_SECRET_KEY for cleanup",
  );
}

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const profiles = await admin
  .from("profiles")
  .select("id")
  .eq("display_name", "E2E Correction Client")
  .limit(2);

if (profiles.error) throw profiles.error;
if (profiles.data.length !== 1) {
  throw new Error(
    "Expected exactly one persistent E2E Correction Client fixture.",
  );
}

const client = await admin
  .from("clients")
  .select("id")
  .eq("profile_id", profiles.data[0].id)
  .single();

if (client.error) throw client.error;

const form = await admin
  .from("anamnesis_forms")
  .select("id")
  .eq("form_key", "client-anamnesis")
  .single();

if (form.error) throw form.error;

const version = await admin
  .from("anamnesis_form_versions")
  .select("id")
  .eq("form_id", form.data.id)
  .eq("version_number", 1)
  .single();

if (version.error) throw version.error;

const drafts = await admin
  .from("anamnesis_submissions")
  .select("id")
  .eq("client_id", client.data.id)
  .eq("form_version_id", version.data.id)
  .is("submitted_at", null);

if (drafts.error) throw drafts.error;

for (const draft of drafts.data) {
  const answers = await admin
    .from("anamnesis_answers")
    .delete()
    .eq("submission_id", draft.id);

  if (answers.error) throw answers.error;

  const submission = await admin
    .from("anamnesis_submissions")
    .delete()
    .eq("id", draft.id)
    .is("submitted_at", null);

  if (submission.error) throw submission.error;
}

const remaining = await admin
  .from("anamnesis_submissions")
  .select("id")
  .eq("client_id", client.data.id)
  .eq("form_version_id", version.data.id)
  .is("submitted_at", null);

if (remaining.error) throw remaining.error;
if (remaining.data.length !== 0) {
  throw new Error("Synthetic canonical drafts remain after cleanup.");
}

console.log("Canonical synthetic draft cleanup complete.");
