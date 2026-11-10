import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { cleanupOrder, buildCleanupSql } from "./production-clear-data.mjs";

test("deletion orders referencing rows before their parent tables", () => {
  assert.deepEqual(cleanupOrder(["parent", "child", "grandchild"], [{child:"child",parent:"parent"},{child:"grandchild",parent:"child"}]), ["grandchild","child","parent"]);
});
test("an unreviewed foreign-key cycle prevents cleanup", () => {
  assert.throws(() => cleanupOrder(["one","two"],[{child:"one",parent:"two"},{child:"two",parent:"one"}]), /cycle/);
});
test("schema from any other project is rejected", () => {
  assert.throws(() => buildCleanupSql({inspection:{project:"lgmlkagcytfjazulgfbz"},preflight:{project:"lgmlkagcytfjazulgfbz"},schemaDigest:"unused"}));
});
test("the CLI rejects TEST before connecting or reading credentials", () => {
  assert.throws(() => execFileSync(process.execPath,["scripts/operations/production-clear-data.mjs","execute","--project","lgmlkagcytfjazulgfbz"],{stdio:"pipe"}), error => error.status===1 && error.stderr.toString().includes("Explicit production project required"));
});
