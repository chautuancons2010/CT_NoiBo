#!/usr/bin/env node
// Read-only preparation runner. Destructive execution is deliberately unavailable
// until a live FK/trigger plan and object-binary restore proof have been reviewed.
import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseEnv } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { managementClient } from "../testing/management.mjs";

const PROD = "uioywupuuestcaliawlc", TEST = "lgmlkagcytfjazulgfbz";
const ADMIN = "9266af45-4b87-4aaf-99a3-03fbb7288d2b";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const run = promisify(execFile);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const quoteIdentifier = value => {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error("Unexpected catalog identifier; stop for review");
  return `"${value}"`;
};

export function validateProductionConnection(raw) {
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Production connection must use PostgreSQL");
  const username = decodeURIComponent(url.username);
  const direct = url.hostname === `db.${PROD}.supabase.co` && username === "postgres";
  const pooler = /^(?:aws-[0-9]+-[a-z0-9-]+\.)?pooler\.supabase\.com$/.test(url.hostname) && username === `postgres.${PROD}`;
  if (raw.includes(TEST) || !(direct || pooler) || !url.password || !["", "/postgres"].includes(url.pathname)) throw new Error("Connection does not prove the approved production project; TEST is forbidden");
  return { host: url.hostname, port: url.port || "5432", username, password: decodeURIComponent(url.password), database: "postgres" };
}

async function reader(config) {
  if (config.PRODUCTION_DATABASE_URL) {
    const connection = validateProductionConnection(config.PRODUCTION_DATABASE_URL);
    return {
      kind: "verified-production-psql",
      async query(sql) {
        const wrapped = `begin transaction read only; set local statement_timeout='60s'; select coalesce(jsonb_agg(q),'[]'::jsonb) from (${sql.replace(/;\s*$/, "")}) q; rollback;`;
        const result = await run(config.PSQL_BIN || "psql", ["-XAtq", "-v", "ON_ERROR_STOP=1", "-c", wrapped], {
          cwd: root, windowsHide: true, timeout: 70_000, maxBuffer: 128 * 1024 * 1024,
          env: { ...process.env, PGHOST: connection.host, PGPORT: connection.port, PGUSER: connection.username, PGPASSWORD: connection.password, PGDATABASE: connection.database, PGSSLMODE: config.PGSSLMODE || "require", ...(config.PGSSLROOTCERT ? { PGSSLROOTCERT: config.PGSSLROOTCERT } : {}) },
        });
        return JSON.parse(result.stdout.trim());
      },
    };
  }
  const api = await managementClient();
  return { kind: "production-management-read-only-sql", query: sql => api("POST", `/v1/projects/${PROD}/database/query`, { query: sql, read_only: true }) };
}

async function inspect(db) {
  const [guards, owner, tables, foreignKeys, triggers, migrations] = await Promise.all([
    db.query("select key from public.app_configurations where key='testing.environment.guard'"),
    db.query(`select a.id,a.username,a.status,a.auth_user_id,a.employee_id,e.department_id,e.position_id,e.employment_type_id,
      (u.id is not null) as auth_exists,
      exists(select 1 from public.account_roles ar join public.roles r on r.id=ar.role_id join public.role_permissions rp on rp.role_id=r.id where ar.account_id=a.id and r.code='admin' and rp.permission_key='system_admin.access') as has_admin_access
      from public.app_accounts a left join public.employees e on e.id=a.employee_id left join auth.users u on u.id=a.auth_user_id where a.id='${ADMIN}'::uuid and a.username='admin'`),
    db.query("select n.nspname as schema_name,c.relname as table_name,c.relkind,pg_get_userbyid(c.relowner) as owner from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and c.relkind in ('r','p') order by n.nspname,c.relname"),
    db.query("select con.conname,con.conrelid::regclass::text as child_table,con.confrelid::regclass::text as parent_table,con.condeferrable,con.condeferred,con.convalidated,pg_get_constraintdef(con.oid,true) as definition from pg_catalog.pg_constraint con where con.contype='f' and (con.conrelid in (select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth')) or con.confrelid in(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth'))) order by child_table,con.conname"),
    db.query("select n.nspname as schema_name,c.relname as table_name,t.tgname,t.tgenabled,t.tgisinternal,pg_get_triggerdef(t.oid,true) as definition from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') order by n.nspname,c.relname,t.tgname"),
    db.query("select version,name from supabase_migrations.schema_migrations order by version"),
  ]);
  assert.equal(guards.length, 0, "A TEST environment guard exists: refuse this database");
  assert.equal(owner.length, 1, "Exactly one matching retained admin is required");
  const admin = owner[0];
  assert(admin.status === "active" && admin.auth_user_id && admin.employee_id && admin.department_id && admin.position_id && admin.employment_type_id && admin.auth_exists && admin.has_admin_access, "Retained admin login/auth/employee/RBAC graph is not intact");
  const schema = { tables, foreignKeys, triggers, migrations };
  return { project: PROD, forbiddenProject: TEST, admin, reader: db.kind, schema, schemaSha256: hash(JSON.stringify(schema)) };
}

function encrypt(bytes, key) {
  const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, nonce);
  return Buffer.concat([Buffer.from("CTBK1"), nonce, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
}
function decrypt(bytes, key) {
  assert.equal(bytes.subarray(0,5).toString(), "CTBK1");
  const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(5,17));
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(17,-16)), decipher.final()]);
}

async function backup(db, before, config) {
  assert.equal(config.PRODUCTION_CLEANUP_MAINTENANCE_CONFIRMED, "true", "Confirm production maintenance and paused writers before a backup can be considered consistent");
  const payload = { target: PROD, createdAt: new Date().toISOString(), inspection: before, rows: {}, storageMetadata: {} };
  // Run each aggregate separately. No pagination can silently omit tail rows.
  // Read-only SQL on auth includes password/identity material: never log results.
  for (const table of before.schema.tables) {
    const qualified = `${quoteIdentifier(table.schema_name)}.${quoteIdentifier(table.table_name)}`;
    const result = await db.query(`select count(*)::text as expected_count,coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) as rows from ${qualified} t`);
    assert.equal(result.length, 1);
    assert.equal(Number(result[0].expected_count), result[0].rows.length, `Incomplete backup: ${qualified}`);
    payload.rows[`${table.schema_name}.${table.table_name}`] = result[0].rows;
  }
  for (const table of ["buckets", "objects"]) {
    const result = await db.query(`select count(*)::text as expected_count,coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) as rows from storage.${quoteIdentifier(table)} t`);
    assert.equal(Number(result[0].expected_count), result[0].rows.length, "Incomplete storage metadata backup");
    payload.storageMetadata[table] = result[0].rows;
  }
  const after = await inspect(db);
  assert.equal(after.schemaSha256, before.schemaSha256, "Schema changed during backup");
  assert.deepEqual(after.admin, before.admin, "Retained admin changed during backup");
  const bytes = Buffer.from(JSON.stringify(payload));
  assert(bytes.length <= 256 * 1024 * 1024, "Backup too large for this bounded JSON preparation tool; use pg_dump/provider backup");
  const suppliedKey = config.PRODUCTION_CLEANUP_BACKUP_KEY;
  if (suppliedKey && !/^[a-f0-9]{64}$/i.test(suppliedKey)) throw new Error("PRODUCTION_CLEANUP_BACKUP_KEY must be exactly 64 hex characters");
  const key = suppliedKey ? Buffer.from(suppliedKey, "hex") : randomBytes(32);
  const id = new Date().toISOString().replace(/[:.]/g,"-");
  const directory = path.join(root, ".tmp/production-cleanup", id);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const encrypted = encrypt(bytes, key);
  assert.equal(hash(decrypt(encrypted,key)), hash(bytes), "Encryption verification failed");
  await writeFile(path.join(directory,"snapshot.private.enc"), encrypted, { flag:"wx", mode:0o600 });
  let keyLocation = "PRODUCTION_CLEANUP_BACKUP_KEY environment value";
  if (!suppliedKey) {
    const keysDirectory = path.join(root,".tmp/production-cleanup-keys");
    await mkdir(keysDirectory,{recursive:true,mode:0o700});
    keyLocation = path.join(keysDirectory,`${id}.private.key`);
    await writeFile(keyLocation,key.toString("hex"),{flag:"wx",mode:0o600});
  }
  const verified = await readFile(path.join(directory,"snapshot.private.enc"));
  assert.equal(hash(decrypt(verified,key)),hash(bytes),"Written backup cannot be decrypted");
  const manifest = { mode:"ENCRYPTED_READ_ONLY_BACKUP", project:PROD, adminId:ADMIN, createdAt:payload.createdAt, schemaSha256:before.schemaSha256, plaintextSha256:hash(bytes), encryptedSha256:hash(verified), rowCounts:Object.fromEntries(Object.entries(payload.rows).map(([name,rows])=>[name,rows.length])), storageMetadataCounts:Object.fromEntries(Object.entries(payload.storageMetadata).map(([name,rows])=>[name,rows.length])), encryption:"AES-256-GCM", keyLocation, objectBinariesBackedUp:false, restoreDrillVerified:false, destructiveExecutionAllowed:false };
  await writeFile(path.join(directory,"manifest.private.json"),JSON.stringify(manifest,null,2),{flag:"wx",mode:0o600});
  return { mode:manifest.mode, project:PROD, directory:path.relative(root,directory), tableCount:before.schema.tables.length, encryptedBytes:encrypted.length, decryptCheck:"passed", objectBinariesBackedUp:false, destructiveExecutionAllowed:false };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length===1 && args[0]==="--help") {
    console.log("Usage: node scripts/operations/production-cleanup-runner.mjs inspect|backup|execute --project uioywupuuestcaliawlc\ninspect/backup issue only read-only SQL. backup encrypts public/auth/storage metadata under ignored .tmp; actual object binaries and a restore drill are NOT included. execute is disabled pending a reviewed live cleanup transaction. PRODUCTION_DATABASE_URL uses verified psql; otherwise use Supabase Management SQL with Owner/Database access.");
    return;
  }
  const [phase, flag, project, ...extra] = args;
  assert(["inspect","backup","execute"].includes(phase) && flag==="--project" && project===PROD && !extra.length,"Explicit approved production project is required; TEST and implicit project-ref are forbidden");
  if (phase==="execute") throw new Error("EXECUTION_DISABLED: no verified live FK/trigger DELETE transaction or object-binary restore proof exists. Run inspect after SQL access is granted, obtain a consistent encrypted backup, review the explicit retention/delete plan, and add a separately reviewed executor. This command performs no connection or mutation.");
  const config = {...parseEnv(await readFile(path.join(root,".env.local"),"utf8").catch(()=>"")),...process.env};
  const db = await reader(config), result = await inspect(db);
  if (phase==="backup") console.log(JSON.stringify(await backup(db,result,config)));
  else {
    const directory = path.join(root,".tmp/production-cleanup");
    await mkdir(directory,{recursive:true,mode:0o700});
    await writeFile(path.join(directory,"inspection.private.json"),JSON.stringify(result,null,2),{mode:0o600});
    console.log(JSON.stringify({ mode:"READ_ONLY_INSPECTION", project:PROD, retainedAdmin:ADMIN, reader:db.kind, tables:result.schema.tables.length, foreignKeys:result.schema.foreignKeys.length, userTriggers:result.schema.triggers.filter(t=>!t.tgisinternal).length, schemaSha256:result.schemaSha256, report: ".tmp/production-cleanup/inspection.private.json", destructiveExecutionAllowed:false }));
  }
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(error=>{console.error(String(error.message).replace(/(?:postgres(?:ql)?:\/\/)[^\s]+/g,"[redacted-connection]").replace(/(?:sb_secret_|sbp_)[A-Za-z0-9._-]+/g,"[redacted]"));process.exitCode=1;});
}
