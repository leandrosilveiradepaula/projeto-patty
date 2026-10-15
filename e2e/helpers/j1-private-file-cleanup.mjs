/**
 * Remove only private files produced by the ONE verified disposable J1 fixture.
 * All ownership and namespace checks happen BEFORE any storage/database write.
 * Never cleanup another client's files, uploads or professional releases.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SYNTHETIC = /^e2e-onboarding-([0-9a-f]{16})@example\.invalid$/;
const BUCKET = "client-private";

function demand(result) {
  if (result.error) throw result.error;
  return result.data;
}

export function verifyDisposablePrivateFileSet({clientId, profileId, email, files, sessions, accessEvents}) {
  const match = SYNTHETIC.exec(email ?? "");
  if (!match || !UUID.test(clientId ?? "") || !UUID.test(profileId ?? "") ||
      !Array.isArray(files) || !Array.isArray(sessions) ||
      !Array.isArray(accessEvents)) {
    throw new Error("Refusing unverified J1 private-file cleanup");
  }
  if (files.length > 1 || sessions.length > 1 || accessEvents.length) {
    throw new Error("Refusing private-file cleanup of multiple or audited records");
  }
  const name = "e2e-j1-" + match[1] + ".png";
  for (const file of files) {
    if (!UUID.test(file.id) || file.client_id !== clientId ||
        file.uploaded_by_profile_id !== profileId ||
        file.client_visibility_set_by_profile_id !== profileId ||
        file.bucket_id !== BUCKET || file.file_kind !== "photo" ||
        file.original_filename !== name ||
        file.object_path !== `clients/${clientId}/photo/${file.id}.png`) {
      throw new Error("Refusing cleanup: file is not exactly owned by J1 fixture");
    }
  }
  for (const session of sessions) {
    if (!UUID.test(session.id) || session.client_id !== clientId ||
        session.requester_profile_id !== profileId ||
        session.file_kind !== "photo" || session.original_filename !== name ||
        session.temp_object_path !== `pending/${clientId}/${session.id}.png`) {
      throw new Error("Refusing cleanup: session is not exactly owned by J1 fixture");
    }
  }
  return {
    files: files.map(file => ({id:file.id,path:file.object_path})),
    sessions: sessions.map(session => ({id:session.id,path:session.temp_object_path})),
  };
}

/** Must be called after verifying no submitted Anamnese/professional protocols. */
export async function cleanupExactJ1PrivateFiles(admin, {clientId,profileId,email}) {
  if (!SYNTHETIC.test(email ?? "") || !UUID.test(clientId ?? "") || !UUID.test(profileId ?? "")) {
    throw new Error("Refusing unverified J1 private-file cleanup");
  }
  const [filesResult,sessionsResult,accessResult] = await Promise.all([
    admin.from("client_files")
      .select("id,client_id,uploaded_by_profile_id,client_visibility_set_by_profile_id,bucket_id,file_kind,original_filename,object_path")
      .eq("client_id",clientId),
    admin.from("client_file_upload_sessions")
      .select("id,client_id,requester_profile_id,file_kind,original_filename,temp_object_path")
      .eq("client_id",clientId),
    admin.from("client_file_access_events")
      .select("id").eq("actor_profile_id",profileId).limit(1),
  ]);
  const files=demand(filesResult),sessions=demand(sessionsResult),accessEvents=demand(accessResult);
  const plan=verifyDisposablePrivateFileSet({clientId,profileId,email,files,sessions,accessEvents});
  // Preserve professional audit history even when the actor is Patty,
  // rather than the disposable client. No fixture may erase audited files.
  if (plan.files.length) {
    const audit=demand(await admin.from("client_file_access_events")
      .select("id").eq("requested_file_id",plan.files[0].id).limit(1));
    if (audit.length) throw new Error("Refusing cleanup of a professionally audited private file");
  }
  // This is deliberately exact-path deletion (never storage.list/remove prefix).
  const paths=[...plan.files.map(x=>x.path),...plan.sessions.map(x=>x.path)];
  if (paths.length) {
    const removed=await admin.storage.from(BUCKET).remove(paths);
    if (removed.error) throw removed.error;
  }
  for (const file of plan.files) {
    const result=await admin.from("client_files").delete()
      .eq("id",file.id).eq("client_id",clientId)
      .eq("uploaded_by_profile_id",profileId).select("id");
    if (result.error || result.data?.length !== 1) {
      throw result.error ?? new Error("J1 private file deletion could not be verified");
    }
  }
  for (const session of plan.sessions) {
    const result=await admin.from("client_file_upload_sessions").delete()
      .eq("id",session.id).eq("client_id",clientId)
      .eq("requester_profile_id",profileId).select("id");
    if (result.error || result.data?.length !== 1) {
      throw result.error ?? new Error("J1 upload session deletion could not be verified");
    }
  }
  const [remainingFiles,remainingSessions]=await Promise.all([
    admin.from("client_files").select("id").eq("client_id",clientId),
    admin.from("client_file_upload_sessions").select("id").eq("client_id",clientId),
  ]);
  if (demand(remainingFiles).length || demand(remainingSessions).length) {
    throw new Error("J1 private file or upload session remains after cleanup");
  }
  return plan.files.length;
}
