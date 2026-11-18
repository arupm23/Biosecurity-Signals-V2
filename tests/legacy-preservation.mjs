import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const original = JSON.parse(readFileSync(new URL('../data/original-v0.1-records.json', import.meta.url), 'utf8'));
const context = {window:{}};
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../data.js', import.meta.url),'utf8'),context);
const current = JSON.parse(JSON.stringify(context.window.REPOSITORY_DATA));
assert.equal(original.length, 8, 'original historical record count');
assert.deepEqual(current, original, 'preserve all original record fields and source information');
for (const record of current) {
  assert.equal(new URL(record.sourceUrl).protocol, 'https:');
  for (const name of ['id','name','organization','recordType','domain','date','evidence','summary','caveat','sourceTitle','sourceUrl']) {
    assert.ok(String(record[name] || '').trim(), `missing ${name} for ${record.id}`);
  }
  assert.ok(Array.isArray(record.actions) && record.actions.length);
}
console.log('PASS: all eight original research entries and source links preserved exactly');
