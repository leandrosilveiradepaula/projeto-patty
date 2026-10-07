import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("global UI protects long text and respects reduced motion", () => {
  const css = read("app/globals.css");
  assert.match(css, /overflow-wrap: break-word/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("admin mobile navigation keeps accessible naming and compact visible label", () => {
  const sidebar = read("components/layout/AdminSidebar.tsx");
  assert.match(sidebar, /aria-label="Abrir navegação administrativa"/);
  assert.match(sidebar, /<span>Menu<\/span>/);
  assert.match(sidebar, /aria-modal="true"/);
});

test("client shell accounts for top safe area and long identity text", () => {
  const css = read("components/layout/ClientShell.module.css");
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /overflow-wrap: anywhere/);
});
