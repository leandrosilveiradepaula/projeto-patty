import assert from "node:assert/strict";import test from "node:test";import {readProfessionalReleaseOptions,filterProfessionalReleases,professionalReleaseHref,professionalContentReleaseYears} from "./professional-release-explorer.ts";
const rows=[{id:"1",released_at:"2026-10-10T10:00:00Z",educational_content_versions:{id:"a",title:"Água",category_key:"material",content_type_key:"pdf"}},{id:"2",released_at:"2026-10-11T10:00:00Z",educational_content_versions:{id:"b",title:"Balança",category_key:"tutorial",content_type_key:"mp4"}},{id:"3",released_at:"2026-10-12T10:00:00Z",educational_content_versions:null}];
const assets=new Map([["a",1],["b",0]]);
test("filters only authorized joined versions without inferring inaccessible ones",()=>{const res=filterProfessionalReleases(rows,assets,readProfessionalReleaseOptions({}));assert.equal(res.total,2);assert.deepEqual(res.items.map(x=>x.id),["2","1"]);});
test("search by normalized title and stored asset state",()=>{assert.deepEqual(filterProfessionalReleases(rows,assets,readProfessionalReleaseOptions({q:"balanca",arquivo:"missing"})).items.map(x=>x.id),["2"]);assert.deepEqual(filterProfessionalReleases(rows,assets,readProfessionalReleaseOptions({arquivo:"available"})).items.map(x=>x.id),["1"]);});
test("sort, bound requested page and preserve URL filters",()=>{const f=readProfessionalReleaseOptions({q:" Á ",ordem:"oldest",pagina:"9999"});const res=filterProfessionalReleases(rows,assets,f);assert.deepEqual(res.items.map(x=>x.id),["1","2"]);assert.equal(res.page,1);assert.match(professionalReleaseHref("/admin/x",f,2),/pagina=2/);});

test("professional history year filters agree with Sao Paulo display date", () => {
  const boundary = [
    { ...rows[0], id: "before-midnight", released_at: "2027-01-01T02:59:59Z" },
    { ...rows[0], id: "after-midnight", released_at: "2027-01-01T03:00:00Z" },
    { ...rows[0], id: "legacy", released_at: "invalid" },
  ];
  assert.deepEqual(professionalContentReleaseYears(boundary), ["2027", "2026"]);
  const byYear = (ano: string) =>
    filterProfessionalReleases(boundary, assets, readProfessionalReleaseOptions({ano})).items.map(x => x.id);
  assert.deepEqual(byYear("2026"), ["before-midnight"]);
  assert.deepEqual(byYear("2027"), ["after-midnight"]);
  assert.deepEqual(byYear("2025"), []);
});
test("professional oldest keeps invalid legacy timestamps last, not first", () => {
  const history = [
    { ...rows[0], id: "invalid", released_at: "legacy" },
    { ...rows[0], id: "newer", released_at: "2026-10-12T10:00:00Z" },
    { ...rows[0], id: "older", released_at: "2026-10-10T10:00:00Z" },
  ];
  const old = filterProfessionalReleases(history, assets, readProfessionalReleaseOptions({ordem:"oldest"}));
  assert.deepEqual(old.items.map(x => x.id), ["older", "newer", "invalid"]);
  assert.equal(history[0].id, "invalid"); // No mutation of read history.
});
