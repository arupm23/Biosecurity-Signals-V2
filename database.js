(function (root) {
  'use strict';
  const TIMEOUT_MS = 12000;
  const REALTIME_CLIENT = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm';

  function getConnection() {
    const config = root.BIOSECURITY_CONFIG || {};
    const origin = String(config.supabaseUrl || '').replace(/\/+$/, '');
    const key = String(config.supabasePublishableKey || '');
    if (!origin || !key) return null;
    const url = new URL(origin);
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)
        || url.pathname !== '/' || url.search || url.hash || url.username || url.password || url.port) {
      throw new Error('Not a Supabase project URL');
    }
    return { origin: url.origin, key };
  }

  async function loadPublishedRecords() {
    let connection;
    try {
      connection = getConnection();
    } catch (_) {
      return { records: root.REPOSITORY_DATA || [], mode: 'snapshot', message: 'Curated snapshot · Database URL is invalid' };
    }
    if (!connection) return { records: root.REPOSITORY_DATA || [], mode: 'snapshot', message: 'Curated snapshot · Database not configured' };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(connection.origin + '/rest/v1/published_records?select=*&order=name.asc&limit=1000', {
        headers: { apikey: connection.key, Accept: 'application/json' },
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
  function watchPublishedRecords(onUpdate) {
    let connection;
    try { connection = getConnection(); } catch (_) { return; }
    if (!connection) return;

    let running = false;
    let queued = false;
    let refreshTimer;
    async function refresh() {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      try {
        onUpdate(await loadPublishedRecords());
      } finally {
        running = false;
        if (queued) {
          queued = false;
          scheduleRefresh();
        }
      }
    }
    function scheduleRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refresh().catch((error) => console.error('Could not update published records:', error));
      }, 400);
    }

    // Reconcile missed notifications and keep refreshing if the socket is unavailable.
    root.setInterval(() => {
      if (!root.document.hidden) scheduleRefresh();
    }, 30000);
    root.document.addEventListener('visibilitychange', () => {
      if (!root.document.hidden) scheduleRefresh();
    });

    import(REALTIME_CLIENT).then(({ createClient }) => {
      const client = createClient(connection.origin, connection.key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      client.channel('published-record-updates')
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'published_records_revision'
        }, scheduleRefresh)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') scheduleRefresh();
        });
    }).catch((error) => console.warn('Realtime unavailable; using periodic refresh:', error.message));
  }

  root.BIOSECURITY_DATABASE = { loadPublishedRecords, watchPublishedRecords };
})(window);
