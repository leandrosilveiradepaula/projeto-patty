import { expect } from "@playwright/test";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZcokAAAAASUVORK5CYII=",
  "base64",
);

/**
 * Only the disposable J1 client's private photo. No preview/download: those
 * generate access events which the verified cleanup intentionally preserves.
 */
export async function checkJ1SyntheticPrivatePhoto({ page, admin, clientId, profileId, unique }) {
  const name = "e2e-j1-" + unique + ".png";
  // Inspect only metadata: never mint signed links or create audit events.
  const bucket = await admin.storage.getBucket("client-private");
  if (bucket.error) throw bucket.error;
  expect(bucket.data?.public, "Client photos must remain in a private bucket").toBe(false);
  await page.goto("/cliente/arquivos");
  await expect(page.getByRole("heading", { name: "Meus arquivos", exact: true })).toBeVisible();
  await page.locator('input[name="file"]').setInputFiles({name, mimeType:"image/png", buffer:png});
  await page.getByRole("checkbox",{name:"Conferi o arquivo e a categoria antes de enviar."}).check();
  await page.getByRole("button",{name:"Enviar arquivo"}).click();
  await expect(page.getByText("Arquivo enviado e validado com sucesso.")).toBeVisible({timeout:30000});
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  const files = await admin.from("client_files")
    .select("id,client_id,uploaded_by_profile_id,client_visibility_set_by_profile_id,bucket_id,file_kind,original_filename,object_path,mime_type")
    .eq("client_id",clientId);
  if(files.error) throw files.error;
  expect(files.data).toHaveLength(1);
  const file=files.data[0];
  expect(file.client_id).toBe(clientId);
  expect(file.uploaded_by_profile_id).toBe(profileId);
  expect(file.client_visibility_set_by_profile_id).toBe(profileId);
  expect(file.bucket_id).toBe("client-private");
  expect(file.file_kind).toBe("photo");
  expect(file.original_filename).toBe(name);
  expect(file.mime_type).toBe("image/png");
  expect(file.object_path).toBe("clients/"+clientId+"/photo/"+file.id+".png");
  const sessions=await admin.from("client_file_upload_sessions")
    .select("client_id,requester_profile_id,file_kind,original_filename,status").eq("client_id",clientId);
  if(sessions.error) throw sessions.error;
  expect(sessions.data).toHaveLength(1);
  expect(sessions.data[0].status).toBe("accepted");
  const accessEvents = await admin.from("client_file_access_events")
    .select("id").eq("requested_file_id",file.id);
  if (accessEvents.error) throw accessEvents.error;
  expect(accessEvents.data, "No file-view audit trail should be erased by a synthetic fixture").toHaveLength(0);
  await page.reload();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  const layout = await page.evaluate(() => ({
    viewport:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,
  }));
  expect(layout.scroll, "Private file history must fit the mobile viewport")
    .toBeLessThanOrEqual(layout.viewport + 1);
  return file.id;
}
