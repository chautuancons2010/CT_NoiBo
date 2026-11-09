import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { validateProductionConnection } from "./production-cleanup-runner.mjs";

test("accepts only the intended direct production database", () => {
  assert.equal(validateProductionConnection("postgresql://postgres:example-only-password@db.uioywupuuestcaliawlc.supabase.co:5432/postgres").host,"db.uioywupuuestcaliawlc.supabase.co");
});
test("accepts production pooler only with its project-specific username", () => {
  assert.equal(validateProductionConnection("postgresql://postgres.uioywupuuestcaliawlc:example-only-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres").username,"postgres.uioywupuuestcaliawlc");
});
for(const [label,url] of [
  ["TEST direct","postgresql://postgres:example-only-password@db.lgmlkagcytfjazulgfbz.supabase.co:5432/postgres"],
  ["TEST pooler","postgresql://postgres.lgmlkagcytfjazulgfbz:example-only-password@aws-0-ap-southeast-1.pooler.supabase.com/postgres"],
  ["lookalike host","postgresql://postgres:example-only-password@db.uioywupuuestcaliawlc.supabase.co.example.invalid/postgres"],
  ["implicit project pooler","postgresql://postgres:example-only-password@aws-0-ap-southeast-1.pooler.supabase.com/postgres"],
]) test(`rejects ${label}`,()=>assert.throws(()=>validateProductionConnection(url)));

test("execute is blocked before reading credentials or connecting", () => {
  let result;
  try { execFileSync(process.execPath,["scripts/operations/production-cleanup-runner.mjs","execute","--project","uioywupuuestcaliawlc"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}); }
  catch(error){result=error;}
  assert(result);assert.equal(result.status,1);assert.match(result.stderr,/EXECUTION_DISABLED/);
});
