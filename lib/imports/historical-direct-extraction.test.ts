import assert from "node:assert/strict";
import test from "node:test";
import { extractHistoricalDirectXlsxCells, previewHistoricalDirectFiles } from "./historical-archive-preview.ts";
import { syntheticZip, text } from "../../tests/fixtures/imports/synthetic-archives.ts";

function workbook(sheet: string): Uint8Array {
  return syntheticZip([
    { name: "[Content_Types].xml", bytes: text("<Types/>") },
    { name: "xl/workbook.xml", bytes: text('<workbook><sheets><sheet name="Synthetic" sheetId="1"/></sheets></workbook>') },
    { name: "xl/sharedStrings.xml", bytes: text("<sst><si><t>Cabecalho</t></si><si><t>RESPOSTA_PRIVADA</t></si></sst>") },
    { name: "xl/worksheets/sheet1.xml", bytes: text(sheet) },
  ]);
}

function fixture() {
  const bytes = workbook('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="n"><v>12</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2" t="n"><v>42.5</v></c></row></sheetData></worksheet>');
  const preview = previewHistoricalDirectFiles(bytes, []);
  assert.equal(preview.excel.state, "recognized_unmapped");
  return { bytes, source: { sha256: preview.excel.sha256!, column_signature_sha256: preview.excel.column_signature_sha256! } };
}

test("direct workbook extraction keeps selected raw text and original row coordinates", () => {
  const { bytes, source } = fixture();
  const result = extractHistoricalDirectXlsxCells(bytes, source, [{ sheet_index: 0, column_index: 1 }]);
  assert.equal(result.state, "raw_unapproved");
  assert.equal(result.persistence, "none");
  assert.equal(result.source_sha256, source.sha256);
  assert.deepEqual(result.cells, [
    { sheet_index: 0, column_index: 1, row_index: 1, raw_type: "s", raw_value: "Cabecalho" },
    { sheet_index: 0, column_index: 1, row_index: 2, raw_type: "s", raw_value: "RESPOSTA_PRIVADA" },
  ]);
  assert.doesNotMatch(JSON.stringify(result), /42\.5/);
  assert.deepEqual(result, extractHistoricalDirectXlsxCells(bytes, source, [{ sheet_index: 0, column_index: 1 }]));
});

test("raw decimal cells retain unconverted values, without clinical interpretation", () => {
  const { bytes, source } = fixture();
  const result = extractHistoricalDirectXlsxCells(bytes, source, [{ sheet_index: 0, column_index: 2 }]);
  assert.deepEqual(result.cells.map((cell) => cell.raw_value), ["12", "42.5"]);
  assert.equal(result.cells[1]!.row_index, 2);
  assert.doesNotMatch(JSON.stringify(result), /RESPOSTA_PRIVADA/);
});

test("source mutation, forged signature, unknown sheet and duplicate selectors block without PII", () => {
  const { bytes, source } = fixture();
  const alterations: Array<() => unknown> = [
    () => extractHistoricalDirectXlsxCells(bytes, { ...source, sha256: "0".repeat(64) }, [{ sheet_index: 0, column_index: 1 }]),
    () => extractHistoricalDirectXlsxCells(bytes, { ...source, column_signature_sha256: "0".repeat(64) }, [{ sheet_index: 0, column_index: 1 }]),
    () => extractHistoricalDirectXlsxCells(bytes, source, [{ sheet_index: 1, column_index: 1 }]),
    () => extractHistoricalDirectXlsxCells(bytes, source, [{ sheet_index: 0, column_index: 1 }, { sheet_index: 0, column_index: 1 }]),
    () => extractHistoricalDirectXlsxCells(bytes, source, [{ sheet_index: 0, column_index: 0 }]),
    () => extractHistoricalDirectXlsxCells(text("NOME_PRIVADO"), source, [{ sheet_index: 0, column_index: 1 }]),
  ];
  for (const fn of alterations) {
    assert.throws(fn, (error: unknown) =>
      error instanceof Error && error.message === "historical_direct_xlsx_blocked"
      && !/NOME_PRIVADO|RESPOSTA_PRIVADA/.test(error.message));
  }
});

test("duplicate cell coordinates, formulas, missing coordinates and erroneous shared-string indexes block", () => {
  const sheets = [
    '<worksheet><sheetData><row><c r="A1" t="n"><v>1</v></c><c r="A1" t="n"><v>2</v></c></row></sheetData></worksheet>',
    '<worksheet><sheetData><row><c r="A1"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>',
    '<worksheet><sheetData><row><c t="s"><v>0</v></c></row></sheetData></worksheet>',
    '<worksheet><sheetData><row><c r="A1" t="s"><v>999</v></c></row></sheetData></worksheet>',
    '<worksheet><sheetData><row><c r="A1" t="e"><v>#REF!</v></c></row></sheetData></worksheet>',
  ];
  for (const sheet of sheets) {
    const bytes = workbook(sheet);
    const preview = previewHistoricalDirectFiles(bytes, []);
    assert.equal(preview.excel.state, "recognized_unmapped");
    assert.throws(
      () => extractHistoricalDirectXlsxCells(bytes, { sha256: preview.excel.sha256!, column_signature_sha256: preview.excel.column_signature_sha256! }, [{ sheet_index: 0, column_index: 1 }]),
      /historical_direct_xlsx_blocked/,
    );
  }
});
