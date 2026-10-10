import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");

test("assessment detail uses canonical client name and configured finalization rules",()=>{
 const page=read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
 assert.match(page,/assessment\.clients\?\.full_name\?\.trim\(\)/);
 assert.match(page,/canFinalize=\{finalizationReadiness\?\.canFinalizeDeterministically \?\? false\}/);
 assert.match(page,/configuração profissional ativa/);
 assert.doesNotMatch(page,/A Básica exige peso, cintura/);
});
test("assessment finalization button follows the deterministic server readiness",()=>{
 const form=read("components/admin/AssessmentDraftForms.tsx");
 assert.ok(form.includes("disabled={!canFinalize || isPending || state.success}"));
 assert.match(form,/todos os itens obrigatórios acima/);
});
test("assessment photo workflow links to the existing private file workspace",()=>{
 const page=read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
 assert.match(page,/availablePhotos\.length === 0/);
 assert.match(page,/\/arquivos\`\}/);
});

test("assessment draft removal and photo linking require a confirmed affected row", () => {
  const access = read("lib/supabase/data-access.ts");
  const chunk = access.slice(access.indexOf("export async function deleteAccessibleAssessmentMeasurement"), access.indexOf("export async function listCurrentClientFinalizedAssessmentMeasurements"));
  for (const name of ["deleteAccessibleAssessmentMeasurement", "linkAccessibleAssessmentPhoto", "unlinkAccessibleAssessmentPhoto"]) {
    const section = chunk.slice(chunk.indexOf("export async function " + name), chunk.indexOf("export async function ", chunk.indexOf("export async function " + name) + 1) < 0 ? undefined : chunk.indexOf("export async function ", chunk.indexOf("export async function " + name) + 1));
    assert.match(section, /\.select\(/);
    assert.match(section, /\.single\(\)/);
    assert.match(section, /if \(error \|\| !data\)/);
  }
});
test("finalized assessments invalidate both the administrative and client journeys", () => {
  const actions = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  const section = actions.slice(actions.indexOf("export async function finalizeAssessmentAction"), actions.indexOf("export type AssessmentCorrectionFormState"));
  assert.match(section, /revalidatePath\("\/cliente\/avaliacoes"\)/);
  assert.match(section, /revalidatePath\("\/cliente\/evolucao"\)/);
});
