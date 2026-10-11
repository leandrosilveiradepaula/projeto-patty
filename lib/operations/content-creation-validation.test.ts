import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const create = read("app/admin/conteudos/actions.ts");
const update = read("app/admin/conteudos/[contentId]/actions.ts");
const form = read("components/admin/AdminEducationalContentCreateForm.tsx");
const detailForm = read("components/admin/AdminEducationalContentVersionForms.tsx");
const page = read("app/admin/conteudos/page.tsx");

test("content creation and draft updates use the same positive int4 order constraint", () => {
  for (const action of [create, update]) {
    assert.match(action, /parseContentDisplayOrder\(formData\.get\("displayOrder"\)\)/);
  }
  assert.match(form, /defaultValue="1"/);
  assert.match(form, /min="1"/);
  assert.match(form, /max=\{MAX_CONTENT_DISPLAY_ORDER\}/);
  assert.match(detailForm, /min="1"/);
  assert.match(detailForm, /max=\{MAX_CONTENT_DISPLAY_ORDER\}/);
});

test("invalid title or order never creates a parent content row", () => {
  assert.ok(create.indexOf("title = readTitle(formData)") < create.indexOf("content = await createAccessibleEducationalContent()"));
  assert.ok(create.indexOf("displayOrder = readDisplayOrder(formData)") < create.indexOf("content = await createAccessibleEducationalContent()"));
  assert.match(create, /contentId: null/);
  assert.match(create, /deleteAccessibleEducationalContentWithoutVersions\(content\.id\)/);
});

test("form locks duplicate requests, preserves edits on error, and navigates only after success", () => {
  assert.match(page, /<AdminEducationalContentCreateForm \/>/);
  assert.doesNotMatch(page, /<form action=\{createEducationalContentDraftAction\}/);
  assert.match(form, /inFlightRef\.current \|\| created/);
  assert.match(form, /new FormData\(event\.currentTarget\)/);
  assert.match(form, /setResult\(response\)/);
  assert.match(form, /router\.push\("\/admin\/conteudos\/" \+ response\.contentId\)/);
  assert.match(form, /router\.refresh\(\)/);
  assert.match(form, /aria-busy=\{busy\}/);
  assert.match(form, /disabled=\{busy \|\| created\}/);
  assert.match(form, /Conferir biblioteca/);
  assert.doesNotMatch(form, /formRef\.current\?\.reset\(\)/);
});

test("creation never publishes or releases content and validation stays server-side", () => {
  assert.match(create, /requireRole\("admin"\)/);
  assert.match(create, /revalidatePath\("\/admin\/conteudos"\)/);
  assert.doesNotMatch(create, /publishAccessibleEducationalContentVersion|createAccessibleClientContentRelease/);
  assert.match(page, /formatPublishedDate/);
  assert.match(page, /!Number\.isFinite\(Date\.parse\(value\)\)/);
  assert.match(page, /readLibraryExplorerFilters\(rawFilters\)/);
  const parser=read("lib/content/admin-library-explorer.ts");
  assert.match(parser, /typeof raw\.q==="string"/);
});
