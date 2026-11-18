(function (root) {
  'use strict';
  const LAYERS = root.BIOSECURITY_LAYERS || [];
  const TAXONOMY = root.BIOSECURITY_TAXONOMY || {};
  const allowedStatus = new Set(['reported', 'independently-evaluated', 'unclear']);
  const unique = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  const normalizeText = (value) => String(value ?? '').toLowerCase().replace(/[-–—_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  function safeSourceUrl(value) {
    try { const url = new URL(String(value)); return url.protocol === 'https:' && url.username === '' && url.password === '' ? url.href : ''; }
    catch (_) { return ''; }
  }
  function normalizeRecord(input) {
    if (!input || typeof input !== 'object') return null;
    const base = { ...input };
    base.id = String(base.id ?? '').trim();
    base.name = String(base.name ?? '').trim();
    if (!base.id || !base.name) return null;
    base.recordType = String(base.recordType || 'Other');
    base.organization = String(base.organization || 'Organization not specified');
    base.domain = String(base.domain || 'Not specified');
    base.date = String(base.date || 'Undated');
    base.summary = String(base.summary || 'No summary available.');
    base.caveat = String(base.caveat || 'This entry does not independently establish safeguard effectiveness.');
    base.evidence = String(base.evidence || 'Public source');
    base.access = Array.isArray(base.access) ? base.access.map(String) : [];
    let sources = Array.isArray(base.sources) ? base.sources : [];
    if (!sources.length && base.sourceUrl) {
      sources = [{ id: base.id + '-primary', title: base.sourceTitle || 'Primary source', url: base.sourceUrl, type: base.evidence, period: base.date }];
    }
    base.sources = sources.map((source, index) => ({
      id: String(source.id || base.id + '-source-' + index),
      title: String(source.title || 'Public source'),
      url: safeSourceUrl(source.url),
      type: String(source.type || 'Public source'),
      period: String(source.period || base.date)
    })).filter((source) => source.url);
    let safeguards = Array.isArray(base.safeguards) ? base.safeguards : [];
    if (!safeguards.length && Array.isArray(base.actions)) {
      safeguards = base.actions.map((label) => ({ label, layer: TAXONOMY[label] || 'other', status: 'reported', sourceId: base.sources[0]?.id || '', note: '' }));
    }
    base.safeguards = safeguards.map((item) => ({
      label: String(item.label || ''),
      layer: LAYERS.some((layer) => layer.key === item.layer) ? item.layer : (TAXONOMY[item.label] || 'other'),
      status: allowedStatus.has(item.status) ? item.status : 'reported',
      sourceId: String(item.sourceId || ''),
      note: String(item.note || '')
    })).filter((item) => item.label && base.sources.some((source) => source.id === item.sourceId));
    base.actions = unique(base.safeguards.map((item) => item.label));
    base.sourceUrl = base.sources[0]?.url || '';
    base.sourceTitle = base.sources[0]?.title || '';
    base.lastReviewedOn = String(base.lastReviewedOn || '');
    return base;
  }
  function filterRecords(records, filters = {}) {
    const query = normalizeText(filters.query || '');
    return records.filter((record) => {
      const haystack = normalizeText([record.name, record.organization, record.domain, record.summary, record.evidence, ...record.actions, ...record.access, ...record.sources.map((source) => source.title)].join(' '));
      return (!query || haystack.includes(query))
        && (!filters.recordType || filters.recordType === 'all' || record.recordType === filters.recordType)
        && (!filters.safeguard || filters.safeguard === 'all' || record.actions.includes(filters.safeguard))
        && (!filters.year || filters.year === 'all' || record.date.startsWith(String(filters.year)));
    });
  }
  function layerStats(records, layerKey) {
    const selected = records.filter((record) => record.safeguards.some((signal) => signal.layer === layerKey));
    const labels = unique(records.flatMap((record) => record.safeguards.filter((signal) => signal.layer === layerKey).map((signal) => signal.label)));
    const safeguards = labels.map((label) => {
      const tagged = records.filter((record) => record.safeguards.some((signal) => signal.layer === layerKey && signal.label === label));
      const independent = tagged.filter((record) => record.safeguards.some((signal) => signal.layer === layerKey && signal.label === label && signal.status === 'independently-evaluated'));
      return { label, count: tagged.length, independentlyEvaluated: independent.length, records: tagged };
    }).sort((a,b) => b.count - a.count || a.label.localeCompare(b.label));
    return {
      key: layerKey, count: selected.length, total: records.length,
      organizations: unique(selected.map((record) => record.organization)).length,
      independentRecords: selected.filter((record) => record.safeguards.some((signal) => signal.layer === layerKey && signal.status === 'independently-evaluated')).length,
      safeguards, records: selected
    };
  }
  root.BIOSECURITY_CORE = { unique, normalizeText, escapeHtml, safeSourceUrl, normalizeRecord, filterRecords, layerStats };
})(window);
