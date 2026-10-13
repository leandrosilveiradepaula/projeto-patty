import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIVATE_FILE_HISTORY_PAGE_SIZE,
  countPrivateFileCategories,
  paginatePrivateFileHistory,
  privateFileHistoryCounts,
  privateFileHistoryHref,
  readPrivateFileHistoryPage,
  readPrivateFileHistorySort,
  sortPrivateFileHistory,
  readPrivateFilePreviewFilter,
  matchesPrivateFilePreviewFilter,
  visiblePrivateFilePageNumbers,
} from "./private-file-history-workspace.ts";

const own = { id:"own", created_at:"2026-10-10T09:00:00Z", file_kind:"photo", byte_size:1024, uploaded_by_profile_id:"person", client_visible_at:null };
const pending = { ...own, id:"pending", file_kind:"exam", created_at:"2026-10-11T06:00:00Z", byte_size:2048, uploaded_by_profile_id:"patty" };
const released = { ...pending, id:"released", created_at:"2026-10-11T03:00:00-03:00", file_kind:"document", byte_size:null, client_visible_at:"2026-10-11T09:00:00Z" };
const older = { ...pending, id:"older", created_at:"2026-10-01T06:00:00Z", byte_size:0, file_kind:"exam" };

test("strict sort parser rejects arrays, prototype pollution, empty and unknown values", () => {
  for (const value of ["newest", "oldest", "largest", "smallest", "kind", "released", "name-asc", "name-desc", "mime"] as const) {
    assert.deepEqual(readPrivateFileHistorySort(value), { value, invalid: false });
  }
  for (const value of [null, "", ["kind"], "__proto__", "name", "random", "size"]) {
    assert.deepEqual(readPrivateFileHistorySort(value), { value:"newest", invalid:true });
  }
});

test("strict page parser handles missing, leading-zero, huge, repeated and negative inputs", () => {
  assert.deepEqual(readPrivateFileHistoryPage(undefined), { page:1, invalid:false });
  assert.deepEqual(readPrivateFileHistoryPage("1"), { page:1, invalid:false });
  assert.deepEqual(readPrivateFileHistoryPage("1000000"), { page:1000000, invalid:false });
  for (const value of [null, "", ["2"], "02", "0", "-1", "1.5", "1e2", "1000001", "9999999999999"]) {
    assert.deepEqual(readPrivateFileHistoryPage(value), { page:1, invalid:true });
  }
});

test("newest and oldest use actual instants and never mutate original file history", () => {
  const input = [own, pending, released, older];
  assert.deepEqual(sortPrivateFileHistory(input,"newest").map(x=>x.id), ["pending","released","own","older"]);
  assert.deepEqual(sortPrivateFileHistory(input,"oldest").map(x=>x.id), ["older","own","pending","released"]);
  assert.deepEqual(input.map(x=>x.id), ["own","pending","released","older"]);
});

test("sort by size handles missing bytes last even ascending, with stable date ties", () => {
  const input = [released, own, older, pending];
  assert.deepEqual(sortPrivateFileHistory(input,"largest").map(x=>x.id), ["pending","own","older","released"]);
  assert.deepEqual(sortPrivateFileHistory(input,"smallest").map(x=>x.id), ["older","own","pending","released"]);
  assert.deepEqual(sortPrivateFileHistory(input,"kind").map(x=>x.file_kind), ["document","exam","exam","photo"]);
  const dup = { ...pending, id:"z" };
  assert.deepEqual(sortPrivateFileHistory([dup,pending],"newest").map(x=>x.id), ["pending","z"]);
});

test("invalid historical dates and malformed size values stay last", () => {
  const corrupt = { ...own, id:"bad", created_at:"not-a-date", byte_size:-1 };
  assert.deepEqual(sortPrivateFileHistory([corrupt,own],"oldest").map(x=>x.id), ["own","bad"]);
  assert.deepEqual(sortPrivateFileHistory([corrupt,own],"smallest").map(x=>x.id), ["own","bad"]);
});

test("pagination counts every authorized row, bounds last pages and never drops final tail", () => {
  const source=Array.from({length:PRIVATE_FILE_HISTORY_PAGE_SIZE*2+1}, (_,i)=>i);
  const first=paginatePrivateFileHistory(source,1);
  const second=paginatePrivateFileHistory(source,2);
  const last=paginatePrivateFileHistory(source,3);
  assert.deepEqual([first.first,first.last,first.total,first.pageCount],[1,PRIVATE_FILE_HISTORY_PAGE_SIZE,source.length,3]);
  assert.deepEqual([second.first,second.last],[PRIVATE_FILE_HISTORY_PAGE_SIZE+1,PRIVATE_FILE_HISTORY_PAGE_SIZE*2]);
  assert.deepEqual(last.items,[source.at(-1)]);
  assert.deepEqual([last.previous,last.next],[2,null]);
  assert.equal(paginatePrivateFileHistory(source,10000).page,3);
  assert.equal(paginatePrivateFileHistory(source,10000).outOfRange,true);
  assert.equal(paginatePrivateFileHistory(source,0).page,1);
  assert.deepEqual(paginatePrivateFileHistory([],1),{
    items:[],page:1,pageCount:1,total:0,first:0,last:0,previous:null,next:null,outOfRange:false,
  });
  assert.deepEqual(source,Array.from({length:PRIVATE_FILE_HISTORY_PAGE_SIZE*2+1},(_,i)=>i));
});

test("page link window remains short for large histories and keeps ends", () => {
  assert.deepEqual(visiblePrivateFilePageNumbers(2,5), [1,2,3,4,5]);
  assert.deepEqual(visiblePrivateFilePageNumbers(50,100), [1,48,49,50,51,52,100]);
  assert.deepEqual(visiblePrivateFilePageNumbers(1,1), [1]);
});

test("parameter links never include filenames; retain scoped admin filters and independent pages", () => {
  assert.equal(privateFileHistoryHref("/cliente/arquivos",{}), "/cliente/arquivos");
  const link=privateFileHistoryHref("/admin/clientes/id/arquivos",{
    categoria:"exam",origem:"team",visualizacao:"pending",ordem:"largest",
    paginaPendentes:4,paginaHistorico:2,anchor:"aguardando-liberacao",
  });
  assert.equal(link,
    "/admin/clientes/id/arquivos?categoria=exam&origem=team&visualizacao=pending&ordem=largest&paginaPendentes=4&paginaHistorico=2#aguardando-liberacao");
  assert.doesNotMatch(link,/original_filename|health|patient/);
});

test("counts distinguish client versus team, pending versus visible and unrecognized categories",()=>{
  const rows=[own,pending,released,older,{...own,file_kind:"legacy"}];
  assert.deepEqual(privateFileHistoryCounts(rows,"person"),{all:5,client:2,team:3,pending:2,history:3});
  assert.deepEqual(countPrivateFileCategories(rows),{all:5,photo:1,exam:2,document:1,other:1});
  assert.deepEqual(countPrivateFileCategories([]),{all:0,photo:0,exam:0,document:0,other:0});
});

test("preview filter accepts only recognized values and uses MIME allowlist", () => {
  assert.deepEqual(readPrivateFilePreviewFilter(undefined), {value:"all",invalid:false});
  assert.deepEqual(readPrivateFilePreviewFilter("previewable"), {value:"previewable",invalid:false});
  assert.deepEqual(readPrivateFilePreviewFilter("download_only"), {value:"download_only",invalid:false});
  for (const invalid of [["previewable"],"",null,"__proto__"]) {
    assert.deepEqual(readPrivateFilePreviewFilter(invalid), {value:"all",invalid:true});
  }
  assert.equal(matchesPrivateFilePreviewFilter("application/pdf","previewable"),true);
  assert.equal(matchesPrivateFilePreviewFilter("image/jpeg","previewable"),true);
  assert.equal(matchesPrivateFilePreviewFilter("video/mp4","previewable"),false);
  assert.equal(matchesPrivateFilePreviewFilter(null,"download_only"),true);
  assert.equal(matchesPrivateFilePreviewFilter("application/pdf","download_only"),false);
});

test("release ordering respects real timestamps and places unreleased last", () => {
  const recent = {...pending,id:"recent",client_visible_at:"2026-10-11T09:00:00Z"};
  const old = {...pending,id:"old",client_visible_at:"2026-10-10T10:00:00Z"};
  const invalid = {...pending,id:"invalid",client_visible_at:"bad"};
  assert.deepEqual(sortPrivateFileHistory([pending,old,invalid,recent],"released").map(x=>x.id),["recent","old","invalid","pending"]);
  const link=privateFileHistoryHref("/cliente/arquivos",{origem:"team",formato:"download_only",ordem:"released",pagina:2});
  assert.equal(link,"/cliente/arquivos?origem=team&formato=download_only&ordem=released&pagina=2");
});
