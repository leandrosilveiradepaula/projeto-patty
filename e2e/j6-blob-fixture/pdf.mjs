// A blank, valid, deterministic PDF generated from synthetic bytes.
// Never load a third-party file, client material or the real Patty video here.
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Contents 4 0 R >>",
  "<< /Length 0 >>\nstream\n\nendstream",
];
let document = "%PDF-1.4\n";
const offsets = [0];
for (let index = 0; index < objects.length; index += 1) {
  offsets.push(Buffer.byteLength(document, "ascii"));
  document += String(index + 1) + " 0 obj\n" + objects[index] + "\nendobj\n";
}
const xrefOffset = Buffer.byteLength(document, "ascii");
document += "xref\n0 " + String(objects.length + 1) + "\n0000000000 65535 f \n";
for (const offset of offsets.slice(1)) {
  document += String(offset).padStart(10, "0") + " 00000 n \n";
}
document += "trailer\n<< /Root 1 0 R /Size " + String(objects.length + 1) +
  " >>\nstartxref\n" + String(xrefOffset) + "\n%%EOF\n";
export const syntheticPdfBytes = Buffer.from(document, "ascii");
export const syntheticPdfContentType = "application/pdf";
