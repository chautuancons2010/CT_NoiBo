import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { managementAccessToken, managementClient } from "../testing/management.mjs";

const PROJECT = "uioywupuuestcaliawlc";
const ADMIN = "9266af45-4b87-4aaf-99a3-03fbb7288d2b";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const archiveRoot = path.join(root, ".tmp/production-cleanup");
const keyRoot = path.join(root, ".tmp/production-cleanup-keys");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const quote = value => { assert(/^[a-z_][a-z0-9_]*$/.test(value)); return `"${value}"`; };
const digestSql = relation => `(select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb)::text) from ${relation} t)`;

export function sealArchive(bytes, key) {
  const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, nonce);
  return Buffer.concat([Buffer.from("CTBK1"), nonce, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
}
export function openArchive(bytes, key) {
  assert.equal(bytes.subarray(0, 5).toString(), "CTBK1");
  const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(5, 17));
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(17, -16)), decipher.final()]);
}
async function rawSql(query, readOnly = true) {
  const token = await managementAccessToken();
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(120_000),
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly })
  });
  if (!response.ok) throw new Error(`Production SQL failed (HTTP ${response.status}); response withheld`);
  return Buffer.from(await response.arrayBuffer());
}
async function productionStorage() {
  const api = await managementClient(), keys = await api("GET", `/v1/projects/${PROJECT}/api-keys`);
  const key = keys.find(item => item.name === "service_role" && typeof item.api_key === "string")?.api_key;
  assert(key, "Production storage backup needs the project's service-role key");
  return createClient(`https://${PROJECT}.supabase.co`, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function loadCleanupArchive(id) {
  assert(/^snapshot-\d{4}-\d{2}-\d{2}T[\d-]+Z$/.test(id), "Explicit archive ID is required");
  const directory = path.join(archiveRoot, id);
  const key = Buffer.from((await readFile(path.join(keyRoot, `${id}.private.key`), "utf8")).trim(), "hex");
  const manifest = JSON.parse(await readFile(path.join(directory, "manifest.private.json"), "utf8"));
  assert.equal(manifest.project, PROJECT);
  const encrypted = await readFile(path.join(directory, "database.private.enc"));
  assert.equal(hash(encrypted), manifest.encryptedSha256);
  const bytes = openArchive(encrypted, key);
  assert.equal(hash(bytes), manifest.databaseSha256);
  const snapshot = JSON.parse(bytes.toString())[0].snapshot;
  assert.equal(snapshot.project, PROJECT);
  const owner = snapshot.tables["public.app_accounts"].rows.find(row => row.id === ADMIN && row.username === "admin");
  assert(owner?.auth_user_id && owner.employee_id && owner.status === "active");
  return { id, directory, key, manifest, snapshot, owner };
}
async function snapshot() {
  const inspection = JSON.parse(await readFile(path.join(archiveRoot, "inspection.private.json"), "utf8"));
  assert.equal(inspection.project, PROJECT);
  const relations = [...inspection.schema.tables.map(table => `${quote(table.schema_name)}.${quote(table.table_name)}`), '"storage"."buckets"', '"storage"."objects"'];
  assert(relations.every(relation => /^"(?:public|auth|storage)"\."[a-z_]+"$/.test(relation)));
  // All public/auth/storage metadata comes from one PostgreSQL statement snapshot.
  // Preserve the exact HTTP bytes: reserializing JSON would round bigint values.
  const query = `select jsonb_build_object('project','${PROJECT}','capturedAt',now(),'tables',(select jsonb_object_agg(name,jsonb_build_object('rows',rows,'count',count,'digest',digest)) from (${relations.map(relation => `select '${relation.replaceAll('"', '')}' name,count(*) count,coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb)::text) digest from ${relation} t`).join(" union all ")}) a)) as snapshot`;
  const bytes = await rawSql(query), data = JSON.parse(bytes.toString())[0].snapshot;
  assert.equal(data.project, PROJECT);
  assert(!data.tables["public.app_configurations"].rows.some(row => row.key === "testing.environment.guard"));
  assert.equal(Object.keys(data.tables).length, relations.length);
  for (const table of Object.values(data.tables)) assert.equal(table.count, table.rows.length);
  const owner = data.tables["public.app_accounts"].rows.find(row => row.id === ADMIN && row.username === "admin");
  assert(owner?.auth_user_id && data.tables["auth.users"].rows.some(row => row.id === owner.auth_user_id));
  const id = `snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const directory = path.join(archiveRoot, id), key = randomBytes(32);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await mkdir(keyRoot, { recursive: true, mode: 0o700 });
  await writeFile(path.join(keyRoot, `${id}.private.key`), key.toString("hex"), { flag: "wx", mode: 0o600 });
  const encrypted = sealArchive(bytes, key);
  await writeFile(path.join(directory, "database.private.enc"), encrypted, { flag: "wx", mode: 0o600 });
  assert.equal(hash(openArchive(await readFile(path.join(directory, "database.private.enc")), key)), hash(bytes));
  const manifest = { id, project: PROJECT, capturedAt: data.capturedAt, schemaSha256: inspection.schemaSha256, databaseSha256: hash(bytes), encryptedSha256: hash(encrypted), tableCounts: Object.fromEntries(Object.entries(data.tables).map(([name, value]) => [name, value.count])), objects: [], objectBinariesBackedUp: false, restoreDrillVerified: false, businessWrites: false };
  await writeFile(path.join(directory, "manifest.private.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  const storage = await productionStorage();
  for (const object of data.tables["storage.objects"].rows) {
    const response = await storage.storage.from(object.bucket_id).download(object.name);
    assert(!response.error && response.data, "A production storage object could not be backed up; no deletion is allowed");
    const content = Buffer.from(await response.data.arrayBuffer()), name = `${hash(`${object.bucket_id}/${object.name}`)}.private.enc`;
    const encoded = sealArchive(content, key);
    await writeFile(path.join(directory, name), encoded, { flag: "wx", mode: 0o600 });
    assert.equal(hash(openArchive(await readFile(path.join(directory, name)), key)), hash(content));
    manifest.objects.push({ bucket: object.bucket_id, path: object.name, name, sha256: hash(content), encryptedSha256: hash(encoded), bytes: content.length, updatedAt: object.updated_at });
    await writeFile(path.join(directory, "manifest.private.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  }
  manifest.objectBinariesBackedUp = manifest.objects.length === data.tables["storage.objects"].count;
  await writeFile(path.join(directory, "manifest.private.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return { id, project: PROJECT, tables: relations.length, objects: manifest.objects.length, bytes: bytes.length, encryptedAndDecrypted: true, destructiveOperations: false };
}
async function verify(id) {
  const archive = await loadCleanupArchive(id), { manifest, snapshot, directory, key } = archive;
  assert(manifest.objectBinariesBackedUp);
  for (const object of manifest.objects) {
    const bytes = await readFile(path.join(directory, object.name));
    assert.equal(hash(bytes), object.encryptedSha256); assert.equal(hash(openArchive(bytes, key)), object.sha256);
  }
  const inspection = JSON.parse(await readFile(path.join(archiveRoot, "inspection.private.json"), "utf8"));
  const statements = [];
  // Restore data into temporary copies with the live column constraints, and
  // compare complete row digests. No public/auth/storage row is changed.
  for (const [name, table] of Object.entries(snapshot.tables)) {
    if (!table.count || name.startsWith("storage.")) continue;
    const [schema, relation] = name.split("."), qualified = `${quote(schema)}.${quote(relation)}`, temporary = quote(`ct_restore_${statements.length}`);
    statements.push(`do $$ begin if ${digestSql(qualified)}<>'${table.digest}' then raise exception 'Source changed since backup: ${name}'; end if; end $$;`);
    statements.push(`create temporary table ${temporary} (like ${qualified} including defaults including constraints including generated including identity) on commit drop;`);
    // Generated columns must be computed by PostgreSQL on the restored rows.
    statements.push(`do $$ declare cols text; begin select string_agg(quote_ident(attname),',' order by attnum) into cols from pg_attribute where attrelid='${qualified}'::regclass and attnum>0 and not attisdropped and attgenerated=''; execute 'insert into ${temporary} ('||cols||') overriding system value select '||cols||' from ${qualified}'; end $$;`);
    statements.push(`do $$ begin if ${digestSql(temporary)}<>'${table.digest}' then raise exception 'Restored row mismatch: ${name}'; end if; end $$;`);
  }
  assert.equal(inspection.schemaSha256, manifest.schemaSha256);
  await rawSql(`begin; set local statement_timeout='100s'; ${statements.join("\n")} rollback;`, false);
  manifest.restoreDrillVerified = true;
  manifest.restoreScope = "All nonempty public/auth tables restored to temporary tables with column checks; complete row digests match; rollback; all encrypted storage objects decrypted and checksummed";
  manifest.restoreVerifiedAt = new Date().toISOString();
  await writeFile(path.join(directory, "manifest.private.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return { id, project: PROJECT, restoreDrillVerified: true, liveBusinessRowsChanged: 0, objectsVerified: manifest.objects.length };
}
async function main() {
  const [action, flag, project, id, ...extra] = process.argv.slice(2);
  assert(["snapshot", "verify"].includes(action) && flag === "--project" && project === PROJECT && !extra.length);
  console.log(JSON.stringify(action === "snapshot" ? await snapshot() : await verify(id)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message.replace(/(?:sbp_|sb_secret_)[A-Za-z0-9._-]+/g, "[redacted]")); process.exitCode = 1; });
