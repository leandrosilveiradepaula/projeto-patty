import { deflateRawSync } from "node:zlib";

export type SyntheticZipMember = Readonly<{
  name: string;
  bytes: Uint8Array;
  compression?: "store" | "deflate";
  encrypted?: boolean;
  symlink?: boolean;
}>;

// All bytes here are deliberately synthetic. Do not add client material to this fixture.
export function syntheticZip(members: readonly SyntheticZipMember[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const member of members) {
    const name = encoder.encode(member.name);
    const data = member.compression === "deflate" ? new Uint8Array(deflateRawSync(member.bytes)) : member.bytes;
    const flags = member.encrypted ? 1 : 0;
    const method = member.compression === "deflate" ? 8 : 0;
    const local = concat([le32(0x04034b50), le16(20), le16(flags), le16(method), le16(0), le16(0), le32(0), le32(data.length), le32(member.bytes.length), le16(name.length), le16(0), name, data]);
    parts.push(local);
    const external = member.symlink ? 0o120777 << 16 : 0;
    central.push(concat([le32(0x02014b50), le16(0x0314), le16(20), le16(flags), le16(method), le16(0), le16(0), le32(0), le32(data.length), le32(member.bytes.length), le16(name.length), le16(0), le16(0), le16(0), le16(0), le32(external), le32(offset), name]));
    offset += local.length;
  }
  const centralBytes = concat(central);
  return concat([...parts, centralBytes, le32(0x06054b50), le16(0), le16(0), le16(members.length), le16(members.length), le32(centralBytes.length), le32(offset), le16(0)]);
}

export function syntheticXlsx(): Uint8Array {
  return syntheticZip([
    { name: "[Content_Types].xml", bytes: text("<Types/>") },
    { name: "xl/workbook.xml", bytes: text("<workbook><sheets><sheet name=\"Synthetic\" sheetId=\"1\"/></sheets></workbook>") },
    { name: "xl/sharedStrings.xml", bytes: text("<sst><si><t>Data</t></si><si><t>Medida</t></si></sst>") },
    { name: "xl/worksheets/sheet1.xml", bytes: text("<worksheet><sheetData><row><c t=\"s\"><v>0</v></c><c t=\"s\"><v>1</v></c></row><row><c><v>01/02/2026</v></c><c><v>1.234,50</v></c></row></sheetData></worksheet>") },
  ]);
}

export const syntheticPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 3]);
export const syntheticJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 3, 0, 2, 1, 1, 0, 0, 0, 0xff, 0xd9]);
export function text(value: string) { return new TextEncoder().encode(value); }

function le16(value: number) { return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]); }
function le32(value: number) { return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]); }
function concat(parts: readonly Uint8Array[]) { const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0)); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output; }
