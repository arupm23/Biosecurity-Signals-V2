(function (root) {
  'use strict';
  const TIMEOUT_MS = 12000;
  async function loadPublishedRecords() {
    const config = root.BIOSECURITY_CONFIG || {};
    const origin = String(config.supabaseUrl || '').replace(/\/+$/, '');
    const key = String(config.supabasePublishableKey || '');
    if (!origin || !key) return { records: root.REPOSITORY_DATA || [], mode: 'snapshot', message: 'Curated snapshot · Database not configured' };
    let url;
    try {
      url = new URL(origin);
      if (url.protocol !== 'https:' || !/^[a-z0-9.-]+\.supabase\.co$/i.test(url.hostname) || url.pathname !== '/') throw new Error('Not a Supabase project URL');
    } catch (_) {
      return { records: root.REPOSITORY_DATA || [], mode: 'snapshot', message: 'Curated snapshot · Database URL is invalid' };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url.origin + '/rest/v1/published_records?select=*&order=name.asc&limit=1000', {
        headers: { apikey: key, Accept: 'application/json' },
        signal: controller.signal, cache: 'no-store'
      });
      if (!response.ok) throw new Error('Public read returned HTTP ' + response.status);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('Unexpected database response');
      if (payload.length === 1000) throw new Error('1000-record limit reached; implement pagination before publishing more');
      return { records: payload, mode: 'database', message: 'Live published database · Source-linked records' };
    } catch (error) {
      console.warn('Biosecurity Signals: falling back to curated snapshot:', error.message);
      return { records: root.REPOSITORY_DATA || [], mode: 'snapshot', message: 'Curated snapshot · Live database unavailable' };
    } finally { clearTimeout(timeout); }
  }
  root.BIOSECURITY_DATABASE = { loadPublishedRecords };
})(window);
