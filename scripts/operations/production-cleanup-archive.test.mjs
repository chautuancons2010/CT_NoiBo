import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { sealArchive, openArchive } from "./production-cleanup-archive.mjs";

test("encrypted backups preserve exact JSON bytes including bigint values", () => {
  const bytes = Buffer.from('{"sequence":9223372036854775807,"unicode":"Châu Tuấn"}');
  const key = randomBytes(32), encoded = sealArchive(bytes, key);
  assert.deepEqual(openArchive(encoded, key), bytes);
  assert(!encoded.includes(Buffer.from("9223372036854775807")));
});
test("a modified or wrong-key backup cannot be accepted", () => {
  const key = randomBytes(32), encoded = sealArchive(Buffer.from("private data"), key);
  assert.throws(() => openArchive(encoded, randomBytes(32)));
  encoded[20] ^= 1;
  assert.throws(() => openArchive(encoded, key));
});
