#!/usr/bin/env node
// Produce a reviewed-once migration seed from the existing v0.1 source data.
// Run locally in this repository: node scripts/generate-seed.mjs > supabase/002_seed.sql
// Reads trusted checked-in local JavaScript files in a restricted VM context.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {} };
vm.createContext(context, { codeGeneration: { strings: false, wasm: false } });
for (const file of ['taxonomy.js', 'data.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { timeout: 1000, filename: file });
}
const records = context.window.REPOSITORY_DATA;
const taxonomy = context.window.BIOSECURITY_TAXONOMY;
if (!Array.isArray(records) || !taxonomy || records.length < 1) throw new Error('Missing trusted source data');
const literal = (value) => value === null || value === undefined ? 'NULL' : "'" + String(value).replace(/'/g, "''") + "'";
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const arrayText = (items) => 'ARRAY[' + (items || []).map(literal).join(', ') + ']::text[]';
const seen = new Set();
const emit = (sql) => process.stdout.write(sql + '\n');
emit('-- Generated from trusted v0.1 data.js; run AFTER 001_evidence_observatory.sql.');
emit('-- Inserts only where missing. Existing curated records are never overwritten.');
emit('begin;');
for (const record of records) {
  if (seen.has(record.id)) throw new Error('Duplicate record ' + record.id);
  seen.add(record.id);
  const orgId = slug(record.organization);
  const sourceId = record.id + '-primary';
  if (!/^https:\/\//.test(record.sourceUrl)) throw new Error('Only HTTPS sources supported: ' + record.id);
  emit('insert into public.organizations (id,name) values (' + [literal(orgId),literal(record.organization)].join(',') + ') on conflict (id) do nothing;');
  emit('insert into public.research_records (id,organization_id,name,record_type,domain,published_period,access_patterns,evidence_label,summary,caveat,status) values ('
    + [literal(record.id),literal(orgId),literal(record.name),literal(record.recordType),literal(record.domain),literal(record.date),arrayText(record.access),literal(record.evidence),literal(record.summary),literal(record.caveat),literal('published')].join(',')
    + ') on conflict (id) do nothing;');
  emit('insert into public.research_sources (id,record_id,title,url,source_type,published_period,is_primary) values ('
    + [literal(sourceId),literal(record.id),literal(record.sourceTitle),literal(record.sourceUrl),literal(record.evidence),literal(record.date),'true'].join(',')
    + ') on conflict (id) do nothing;');
  for (const label of record.actions) {
    const key = slug(label);
    const layer = taxonomy[label] || 'other';
    emit('insert into public.safeguards (key,label,layer) values (' + [literal(key),literal(label),literal(layer)].join(',') + ') on conflict (key) do nothing;');
    emit('insert into public.record_safeguards (record_id,safeguard_key,source_id,evidence_status,evidence_note) values ('
      + [literal(record.id),literal(key),literal(sourceId),literal('reported'),literal('Classified from the linked primary source; not independently verified by this repository.')].join(',')
      + ') on conflict (record_id,safeguard_key,source_id) do nothing;');
  }
}
emit('commit;');
