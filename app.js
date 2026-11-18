(function () {
  'use strict';
  const core = window.BIOSECURITY_CORE;
  const layerDefinitions = window.BIOSECURITY_LAYERS || [];
  const els = {
    grid: document.getElementById('recordGrid'),
    search: document.getElementById('searchInput'),
    type: document.getElementById('typeFilter'),
    action: document.getElementById('actionFilter'),
    year: document.getElementById('periodFilter'),
    count: document.getElementById('resultCount'),
    activeFilter: document.getElementById('activeFilter'),
    empty: document.getElementById('emptyState'),
    dialog: document.getElementById('detailDialog'),
    dialogContent: document.getElementById('dialogContent'),
    stack: document.getElementById('layerStack'),
    layerDetails: document.getElementById('layerDetails'),
    dataSource: document.getElementById('dataSourceStatus')
  };
  const esc = core.escapeHtml;
  const safeUrl = core.safeSourceUrl;
  const state = { records: [], filtered: [], selectedLayer: 'evaluation', selectedSafeguard: '', activeRecord: null, activeSignal: 0, showAll: false };
  const getLayer = (key) => layerDefinitions.find((item) => item.key === key) || { key, label: 'Other reported practices', description: 'Additional reported practices' };
  const currentFilters = () => ({ query: els.search.value, recordType: els.type.value, safeguard: els.action.value, year: els.year.value });
  const ratio = (count, total) => total ? Math.min(100, Math.round(100 * count / total)) : 0;
  const statusLabel = (status) => status === 'independently-evaluated' ? 'Independent evaluation documented' : status === 'unclear' ? 'Evidence unclear' : 'Publicly reported';

  function fillOptions(select, labels) {
    while (select.options.length > 1) select.remove(1);
    labels.forEach((label) => select.add(new Option(label, label)));
  }
  function renderSummary() {
    const records = state.records;
    const tags = core.unique(records.flatMap((record) => record.actions));
    document.getElementById('entryCount').textContent = records.length;
    document.getElementById('orgCount').textContent = core.unique(records.map((record) => record.organization)).length;
    document.getElementById('actionCount').textContent = tags.length;
    document.getElementById('sourceCount').textContent = records.reduce((count, record) => count + record.sources.length, 0);
    const reviews = records.map((record) => record.lastReviewedOn).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
    document.getElementById('reviewSummary').textContent = reviews.length ? 'Latest review ' + reviews[reviews.length - 1] : 'Review dates vary by record';
    fillOptions(els.type, core.unique(records.map((record) => record.recordType)));
    fillOptions(els.action, tags);
    fillOptions(els.year, core.unique(records.map((record) => record.date.slice(0, 4)).filter((item) => /^\d{4}$/.test(item))));
  }
  function cardTemplate(record) {
    const tags = record.actions.slice(0, 3).map((action) => '<span>' + esc(action) + '</span>').join('');
    return '<article class="record-card">'
      + '<div class="card-topline"><span class="record-type">' + esc(record.recordType) + '</span><span class="evidence-dot"><i aria-hidden="true"></i>' + esc(record.evidence) + '</span></div>'
      + '<h3>' + esc(record.name) + '</h3><p class="organization">' + esc(record.organization) + '</p>'
      + '<p class="summary">' + esc(record.summary) + '</p>'
      + '<div class="tag-list">' + tags + (record.actions.length > 3 ? '<span>+' + (record.actions.length - 3) + '</span>' : '') + '</div>'
      + '<button type="button" class="card-link" data-open="' + esc(record.id) + '">Explore evidence <span aria-hidden="true">↗</span></button></article>';
  }
  function renderCards() {
    state.filtered = core.filterRecords(state.records, currentFilters());
    els.grid.innerHTML = state.filtered.map(cardTemplate).join('');
    els.count.textContent = state.filtered.length;
    els.empty.hidden = state.filtered.length > 0;
    const filters = currentFilters();
    const active = [];
    if (filters.query.trim()) active.push('search: ' + filters.query.trim());
    if (filters.recordType !== 'all') active.push('type: ' + filters.recordType);
    if (filters.safeguard !== 'all') active.push('safeguard: ' + filters.safeguard);
    if (filters.year !== 'all') active.push('year: ' + filters.year);
    els.activeFilter.textContent = active.length ? 'Showing ' + state.filtered.length + ' records · ' + active.join(' · ') : 'Showing all ' + state.filtered.length + ' records';
  }
  function renderLayers() {
    const visible = layerDefinitions.filter((layer) => layer.key !== 'other' || state.filtered.some((record) => record.safeguards.some((signal) => signal.layer === 'other')));
    els.stack.innerHTML = visible.map((layer, index) => {
      const stats = core.layerStats(state.filtered, layer.key);
      const selected = layer.key === state.selectedLayer;
      return '<button type="button" class="layer-card' + (selected ? ' selected' : '') + '" data-layer="' + esc(layer.key) + '" aria-pressed="' + selected + '">'
        + '<span class="layer-index">0' + (index + 1) + '</span>'
        + '<span class="layer-body"><strong>' + esc(layer.label) + '</strong><small>' + esc(layer.description) + '</small>'
        + '<span class="layer-track" role="img" aria-label="' + stats.count + ' of ' + stats.total + ' filtered records tagged"><i style="width:' + ratio(stats.count, stats.total) + '%"></i></span></span>'
        + '<span class="layer-count"><strong>' + stats.count + '/' + stats.total + '</strong><small>records</small></span>'
        + '</button>';
    }).join('');
    renderLayerDetail();
  }
  function renderLayerDetail() {
    const layer = getLayer(state.selectedLayer);
    const stats = core.layerStats(state.filtered, state.selectedLayer);
    if (!stats.safeguards.some((item) => item.label === state.selectedSafeguard)) state.selectedSafeguard = stats.safeguards[0]?.label || '';
    const selected = stats.safeguards.find((item) => item.label === state.selectedSafeguard);
    let html = '<div class="layer-detail-head"><p class="eyebrow">Selected layer</p><h3>' + esc(layer.label) + '</h3><p>' + esc(layer.description) + '</p></div>';
    html += '<div class="metric-strip"><div><strong>' + stats.count + '</strong><span>records tagged</span></div><div><strong>' + stats.safeguards.length + '</strong><span>distinct safeguards</span></div><div><strong>' + stats.organizations + '</strong><span>organizations</span></div></div>';
    html += '<p class="chart-caption">Safeguard reporting frequency across the <strong>' + state.filtered.length + '</strong> currently filtered records. Select a bar to inspect source links.</p>';
    if (!stats.safeguards.length) {
      html += '<p class="empty-layer">No reported signals in this layer for the current filters. This does not imply safeguards are absent.</p>';
    } else {
      html += '<div class="safeguard-bars">';
      stats.safeguards.forEach((item) => {
        const active = item.label === state.selectedSafeguard;
        html += '<button type="button" class="safeguard-bar' + (active ? ' selected' : '') + '" data-safeguard="' + esc(item.label) + '" aria-pressed="' + active + '">'
          + '<span class="bar-label">' + esc(item.label) + '</span><span class="bar-track"><i style="width:' + ratio(item.count, state.filtered.length) + '%"></i></span><span class="bar-value">' + item.count + '</span></button>';
      });
      html += '</div>';
      if (selected) {
        html += '<div class="source-drilldown"><h4>' + esc(selected.label) + ' · ' + selected.count + ' record' + (selected.count === 1 ? '' : 's') + '</h4>';
        html += '<p>' + selected.independentlyEvaluated + ' record(s) contain a link to documented independent evaluation. Classification does not establish effectiveness.</p>';
        const listed = state.showAll ? selected.records : selected.records.slice(0, 12);
        listed.forEach((record) => {
          const match = record.safeguards.find((signal) => signal.layer === state.selectedLayer && signal.label === selected.label);
          const source = record.sources.find((item) => item.id === match?.sourceId);
          html += '<div class="drilldown-record"><button type="button" class="inline-record" data-open="' + esc(record.id) + '">' + esc(record.name) + '</button><span>' + esc(statusLabel(match?.status)) + '</span>'
            + (source ? '<a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">Source ↗</a>' : '') + '</div>';
        });
        if (selected.records.length > 12) html += '<button type="button" class="text-link button-link show-more" id="toggleMore">' + (state.showAll ? 'Show fewer records' : 'Show all ' + selected.records.length + ' records') + '</button>';
        html += '</div>';
      }
    }
    html += '<p class="pattern-disclaimer">Frequency is a descriptive count, not a safety score. Guidance and case studies are included unless filtered out.</p>';
    els.layerDetails.innerHTML = html;
  }
  function sourceList(record) {
    return record.sources.map((source) => '<li><span class="source-date">' + esc(source.period) + '</span><div><strong>' + esc(source.title) + '</strong><p>' + esc(source.type) + '</p><a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">Open primary source ↗</a></div></li>').join('');
  }
  function signalButtons(record) {
    const groups = layerDefinitions.filter((layer) => record.safeguards.some((signal) => signal.layer === layer.key));
    return groups.map((layer) => {
      const candidates = record.safeguards.map((signal, idx) => ({ signal, idx })).filter((entry) => entry.signal.layer === layer.key);
      const bars = '<div class="record-chart-track"><i style="width:' + ratio(candidates.length, record.safeguards.length) + '%"></i></div>';
      return '<section class="record-layer"><h4>' + esc(layer.label) + ' <span>' + candidates.length + ' signal(s)</span></h4>' + bars
        + '<div class="signal-buttons">' + candidates.map(({signal, idx}) => '<button type="button" class="signal-button' + (idx === state.activeSignal ? ' selected' : '') + '" data-signal="' + idx + '" aria-pressed="' + (idx === state.activeSignal) + '">' + esc(signal.label) + '</button>').join('') + '</div></section>';
    }).join('');
  }
  function renderDetails() {
    const record = state.activeRecord;
    if (!record) return;
    const signal = record.safeguards[state.activeSignal];
    const source = signal ? record.sources.find((item) => item.id === signal.sourceId) : null;
    let html = '<p class="eyebrow">' + esc(record.recordType) + ' · ' + esc(record.date) + '</p>'
      + '<h2 id="dialogTitle">' + esc(record.name) + '</h2><p class="dialog-org">' + esc(record.organization) + ' · ' + esc(record.domain) + '</p>'
      + '<p class="dialog-summary">' + esc(record.summary) + '</p>'
      + '<div class="dialog-section"><h3>Safeguard profile by lifecycle layer</h3><p class="chart-caption">' + record.safeguards.length + ' source-linked reported signals. Bar lengths represent shares of this record’s tagged signals, not strength or completeness.</p>'
      + (record.safeguards.length ? signalButtons(record) : '<p>No safeguards are currently classified for this record.</p>') + '</div>';
    if (signal) {
      html += '<div class="evidence-detail" role="region" aria-label="Selected safeguard evidence"><p class="eyebrow">Selected evidence</p><h3>' + esc(signal.label) + '</h3>'
        + '<span class="status-chip">' + esc(statusLabel(signal.status)) + '</span>'
        + (signal.note ? '<p>' + esc(signal.note) + '</p>' : '<p>Tagged from the linked public source. This classification does not verify effectiveness.</p>')
        + (source ? '<p class="source-citation"><strong>Source:</strong> ' + esc(source.title) + ' · ' + esc(source.period) + '</p><a class="button button-primary" href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">Read supporting source ↗</a>' : '<p>No valid public source URL available.</p>')
        + '</div>';
    }
    html += '<div class="dialog-section"><h3>Release & access information</h3><div class="tag-list large">' + record.access.map((access) => '<span>' + esc(access) + '</span>').join('') + '</div></div>';
    html += '<div class="dialog-section"><h3>Source timeline</h3><ol class="source-timeline">' + sourceList(record) + '</ol></div>';
    html += '<div class="caveat"><strong>Evidence caveat</strong><p>' + esc(record.caveat) + '</p></div>';
    if (record.lastReviewedOn) html += '<p class="review-date">Last reviewed: ' + esc(record.lastReviewedOn) + '</p>';
    els.dialogContent.innerHTML = html;
  }
  function openDetails(id) {
    const record = state.records.find((item) => item.id === id);
    if (!record) return;
    state.activeRecord = record;
    state.activeSignal = 0;
    renderDetails();
    if (!els.dialog.open) {
      if (typeof els.dialog.showModal === 'function') els.dialog.showModal();
      else els.dialog.setAttribute('open', '');
    }
  }
  function render() { renderCards(); renderLayers(); }
  function reset() {
    els.search.value = '';
    els.type.value = 'all';
    els.action.value = 'all';
    els.year.value = 'all';
    state.showAll = false;
    render();
  }
  [els.search, els.type, els.action, els.year].forEach((control) => control.addEventListener('input', () => { state.showAll = false; render(); }));
  document.getElementById('resetFilters').addEventListener('click', reset);
  document.getElementById('emptyReset').addEventListener('click', reset);
  document.getElementById('closeDialog').addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', (event) => {
    if (event.target === els.dialog) els.dialog.close();
  });
  els.dialogContent.addEventListener('click', (event) => {
    const button = event.target.closest('[data-signal]');
    if (!button || !state.activeRecord) return;
    const idx = Number(button.dataset.signal);
    if (!Number.isInteger(idx) || idx < 0 || idx >= state.activeRecord.safeguards.length) return;
    state.activeSignal = idx;
    renderDetails();
  });
  els.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-open]');
    if (button) openDetails(button.dataset.open);
  });
  els.stack.addEventListener('click', (event) => {
    const button = event.target.closest('[data-layer]');
    if (!button) return;
    state.selectedLayer = button.dataset.layer;
    state.selectedSafeguard = '';
    state.showAll = false;
    renderLayers();
  });
  els.layerDetails.addEventListener('click', (event) => {
    const button = event.target.closest('[data-safeguard]');
    if (button) { state.selectedSafeguard = button.dataset.safeguard; state.showAll = false; renderLayerDetail(); return; }
    const link = event.target.closest('[data-open]');
    if (link) { openDetails(link.dataset.open); return; }
    if (event.target.closest('#toggleMore')) { state.showAll = !state.showAll; renderLayerDetail(); }
  });
  document.getElementById('downloadJson').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'biosecurity-signals-v2-filtered.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  async function init() {
    const result = await window.BIOSECURITY_DATABASE.loadPublishedRecords();
    state.records = (result.records || []).map(core.normalizeRecord).filter(Boolean);
    els.dataSource.textContent = result.message + (result.mode === 'snapshot' ? ' · ' + state.records.length + ' historical records; verify sources before reuse' : '');
    renderSummary();
    render();
  }
  init().catch((error) => {
    console.error('Biosecurity Signals initialization failed:', error);
    els.dataSource.textContent = 'Unable to display the research records. Please reload the page.';
  });
})();
