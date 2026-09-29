(() => {
  const STORAGE = { api: 'mai_url', interval: 'mai_interval', instances: 'mai_instances', keys: 'mai_hub_device_keys' };
  const state = { filter: '', lastSignature: '', panel: null };
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const api = () => String(localStorage.getItem(STORAGE.api) || document.querySelector('#url')?.value || 'https://maintain-ai-3.vercel.app').trim().replace(/\/$/, '');
  const interval = () => Math.max(1000, Number(localStorage.getItem(STORAGE.interval) || document.querySelector('#interval')?.value || 5000));

  function getKeys() {
    try { const value = JSON.parse(localStorage.getItem(STORAGE.keys) || '{}'); return value && typeof value === 'object' ? value : {}; }
    catch { return {}; }
  }
  function setHubKey(code, value) {
    const keys = getKeys();
    if (value) keys[code] = String(value).trim(); else delete keys[code];
    localStorage.setItem(STORAGE.keys, JSON.stringify(keys));
  }
  function getInstances() {
    try { const value = JSON.parse(localStorage.getItem(STORAGE.instances) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  function findDomRow(code) {
    return [...document.querySelectorAll('#instances .inst')].find(row => (row.textContent || '').includes(`${code} ·`));
  }
  function domMachines() {
    return getInstances().map(instance => {
      const row = findDomRow(instance.code);
      const text = row?.textContent || '';
      const key = instance.key || getKeys()[instance.code] || '';
      return { ...instance, key, active: /· streaming(?: ·|$)/i.test(text) };
    });
  }
  function saveMachineKey(code, key) {
    const value = String(key || '').trim();
    setHubKey(code, value);
    const row = findDomRow(code);
    if (!row) return false;
    row.querySelector('.actions button:nth-child(2)')?.click();
    const keyInput = document.querySelector('#key');
    const save = document.querySelector('#save');
    if (!keyInput || !save) return false;
    keyInput.value = value;
    save.click();
    return true;
  }
  function clickMachineAction(code, wantRunning) {
    const row = findDomRow(code);
    if (!row) return false;
    const button = row.querySelector('.actions button:first-child');
    if (!button) return false;
    const isRunning = /stop/i.test(button.textContent || '');
    if (wantRunning !== isRunning) button.click();
    return true;
  }
  function syncConfiguration() {
    const urlInput = document.querySelector('#url');
    const intervalInput = document.querySelector('#interval');
    if (urlInput) urlInput.value = api();
    if (intervalInput) intervalInput.value = String(interval());
    localStorage.setItem(STORAGE.api, api());
    localStorage.setItem(STORAGE.interval, String(interval()));
  }
  function log(message, error = false) {
    const el = document.querySelector('#maiConnLog'); if (!el) return;
    const line = document.createElement('div'); line.textContent = `${new Date().toLocaleTimeString()} · ${message}`;
    if (error) line.style.color = '#ff9aa8'; el.prepend(line);
    while (el.children.length > 80) el.removeChild(el.lastChild);
  }
  function setStatus(text, ok = false) {
    const el = document.querySelector('#maiConnStatus'); if (!el) return;
    el.textContent = text; el.style.color = ok ? '#73dfb9' : '#8ea0b7'; el.style.borderColor = ok ? '#1c5546' : '#344b66';
  }
  function renderMachineKeys(force = false) {
    const el = document.querySelector('#maiMachineKeys'); if (!el) return;
    const rows = domMachines();
    const visible = rows.filter(machine => !state.filter || `${machine.code} ${machine.name} ${machine.type} ${machine.arch || ''}`.toLowerCase().includes(state.filter));
    const signature = JSON.stringify(rows.map(x => [x.code, x.name, x.type, x.arch, x.key, x.active])) + `|${state.filter}`;
    if (!force && signature === state.lastSignature) return;
    state.lastSignature = signature;
    const configured = rows.filter(x => x.key).length, active = rows.filter(x => x.active).length;
    const summary = document.querySelector('#maiConnSummary');
    if (summary) summary.textContent = `${rows.length} machine instances · ${configured} keys configured · ${active} streaming`;
    if (!rows.length) { el.innerHTML = '<div class="mai-empty">No machine instances yet. Add a machine instance first.</div>'; return; }
    if (!visible.length) { el.innerHTML = '<div class="mai-empty">No machines match this filter.</div>'; return; }
    el.innerHTML = visible.map(machine => `
      <article class="mai-machine" data-code="${esc(machine.code)}">
        <div class="mai-machine-head"><div><strong>${esc(machine.code)}</strong><span>${esc(machine.name)}</span></div><span class="mai-status ${machine.active ? 'live' : ''}">${machine.active ? 'Streaming' : 'Stopped'}</span></div>
        <div class="mai-machine-meta">${esc(machine.type)}${machine.arch ? ` · ${esc(machine.arch)}` : ''} · ${machine.key ? 'device key saved' : 'device key required'}</div>
        <div class="mai-key-row"><input data-key type="password" value="${esc(machine.key)}" placeholder="Paste the MAINTAIN AI key for ${esc(machine.code)}"><button data-save>Save key</button></div>
        <div class="mai-machine-actions"><button data-start>${machine.active ? 'Stop machine' : 'Start machine'}</button><button data-open>Open machine</button></div>
      </article>`).join('');
    el.querySelectorAll('.mai-machine').forEach(card => {
      const code = card.dataset.code;
      card.querySelector('[data-save]').onclick = () => {
        const key = card.querySelector('[data-key]').value.trim();
        if (!key) { log(`${code}: enter a device key before saving.`, true); return; }
        if (saveMachineKey(code, key)) { log(`${code}: device key saved to the simulator machine.`); renderMachineKeys(true); }
        else log(`${code}: simulator machine row was not found.`, true);
      };
      card.querySelector('[data-start]').onclick = () => {
        const machine = domMachines().find(x => x.code === code);
        if (!machine?.key) { log(`${code}: device key is required before starting telemetry.`, true); return; }
        syncConfiguration(); clickMachineAction(code, !machine.active);
        log(`${code}: ${machine.active ? 'stopping' : 'starting'} simulator telemetry.`);
        setTimeout(() => renderMachineKeys(true), 80);
      };
      card.querySelector('[data-open]').onclick = () => { findDomRow(code)?.querySelector('.actions button:nth-child(2)')?.click(); setTimeout(() => renderMachineKeys(true), 50); };
    });
  }
  function startAll() {
    syncConfiguration(); const rows = domMachines(); const missing = rows.filter(x => !x.key).map(x => x.code); let started = 0;
    for (const machine of rows) if (machine.key && clickMachineAction(machine.code, true)) started++;
    if (missing.length) log(`Missing device key for: ${missing.join(', ')}. Each machine needs its own unique key.`, true);
    log(`Started ${started} configured machine stream(s). The simulator's native loop sends readings every ${interval() / 1000}s.`); setStatus(`Streaming · ${started} machine(s)`, started > 0);
    setTimeout(() => renderMachineKeys(true), 100);
  }
  function stopAll() {
    const rows = domMachines(); let stopped = 0; for (const machine of rows) if (machine.active && clickMachineAction(machine.code, false)) stopped++;
    log(`Stopped ${stopped} simulator machine stream(s).`); setStatus('Telemetry stopped'); setTimeout(() => renderMachineKeys(true), 100);
  }
  function addPanel() {
    if (document.getElementById('maiConnectionPanel')) return;
    const panel = document.createElement('section'); panel.id = 'maiConnectionPanel'; panel.innerHTML = `
      <div class="mai-panel-head"><div><strong>MAINTAIN AI Device Connections</strong><span>One unique device key per simulator machine</span></div><button id="maiClose" class="mai-close" aria-label="Close">×</button></div>
      <div class="mai-config"><label>MAINTAIN AI API URL<input id="maiApiUrl" value="${esc(api())}"></label><div class="mai-config-row"><button id="maiSave" class="mai-secondary">Save configuration</button><label>Interval<select id="maiInterval"><option value="1000">1 second</option><option value="2000">2 seconds</option><option value="5000">5 seconds</option><option value="10000">10 seconds</option></select></label></div></div>
      <div class="mai-toolbar"><div><strong>Machine device keys</strong><span id="maiConnSummary">Loading machines…</span></div><input id="maiMachineFilter" placeholder="Filter machines…"></div>
      <div id="maiMachineKeys" class="mai-machine-grid"></div><div class="mai-global-actions"><button id="maiConnect" class="mai-primary">Start all telemetry</button><button id="maiStop" class="mai-danger">Stop all telemetry</button></div><div id="maiConnLog" class="mai-log"></div>`;
    document.body.appendChild(panel);
    const style = document.createElement('style'); style.textContent = `
      #maiConnectionPanel{position:fixed;right:18px;bottom:18px;width:min(760px,calc(100vw - 36px));max-height:min(88vh,820px);overflow:auto;z-index:9999;background:linear-gradient(180deg,#0d1928,#09131f);border:1px solid #29405b;border-radius:16px;box-shadow:0 28px 90px #000b;color:#e8eef7;font:13px/1.45 Inter,system-ui,sans-serif;padding:16px}#maiConnectionPanel *{box-sizing:border-box}.mai-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}.mai-panel-head strong{display:block;font-size:15px}.mai-panel-head span,.mai-toolbar span{display:block;color:#7f93aa;font-size:11px;margin-top:3px}.mai-close{background:#111e2d;color:#b9c7d8;border:1px solid #2b425d;border-radius:8px;font-size:18px;width:32px;height:32px}.mai-config{padding:12px;border:1px solid #22364d;border-radius:12px;background:#0a1521}.mai-config label{display:flex;flex-direction:column;gap:5px;color:#8297ae;font-size:10px;font-weight:700}.mai-config input,.mai-config select,.mai-toolbar input,.mai-key-row input{width:100%;background:#07111d;border:1px solid #2a405b;color:#e8eef7;border-radius:8px;padding:9px}.mai-config-row{display:grid;grid-template-columns:1fr 140px;gap:8px;margin-top:8px}.mai-config-row label{min-width:0}.mai-config-row button,.mai-global-actions button,.mai-key-row button,.mai-machine-actions button{border-radius:8px;padding:9px 11px;cursor:pointer;font:inherit}.mai-secondary{background:#142235;color:#e8eef7;border:1px solid #2a405b}.mai-toolbar{display:flex;justify-content:space-between;align-items:end;gap:10px;margin:14px 0 8px}.mai-toolbar>div{min-width:0}.mai-toolbar input{width:190px}.mai-machine-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mai-machine{border:1px solid #22364d;border-radius:12px;background:#091521;padding:11px}.mai-machine-head{display:flex;justify-content:space-between;gap:8px;align-items:start}.mai-machine-head strong{display:block}.mai-machine-head span{display:block;color:#b6c4d6;font-size:11px;margin-top:2px}.mai-status{padding:4px 7px;border:1px solid #344b66;border-radius:999px;color:#8ea0b7;font-size:10px;white-space:nowrap}.mai-status.live{color:#73dfb9;border-color:#1c5546;background:#0d251f}.mai-machine-meta{color:#71859d;font-size:10px;margin:8px 0}.mai-key-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.mai-key-row button{background:#142235;color:#e8eef7;border:1px solid #2a405b}.mai-machine-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.mai-machine-actions button:first-child{background:#4f8cff;color:#fff;border:1px solid #4f8cff}.mai-machine-actions button:last-child{background:#111e2d;color:#d7e2ef;border:1px solid #2a405b}.mai-global-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.mai-primary{background:#4f8cff;color:#fff;border:1px solid #4f8cff}.mai-danger{background:#3a1820;color:#ffd9df;border:1px solid #6c2735}.mai-log{margin-top:10px;padding:10px;background:#06101a;border:1px solid #22364d;border-radius:10px;max-height:130px;overflow:auto;color:#8ea0b7;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}.mai-empty{grid-column:1/-1;padding:14px;border:1px dashed #2a405b;border-radius:10px;color:#8ea0b7}@media(max-width:720px){#maiConnectionPanel{right:10px;bottom:10px;width:calc(100vw - 20px)}.mai-machine-grid{grid-template-columns:1fr}.mai-config-row{grid-template-columns:1fr}.mai-toolbar{align-items:stretch;flex-direction:column}.mai-toolbar input{width:100%}}`;
    document.head.appendChild(style);
    panel.querySelector('#maiClose').onclick = () => panel.remove();
    panel.querySelector('#maiSave').onclick = () => {
      const url = panel.querySelector('#maiApiUrl').value.trim().replace(/\/$/, ''); const every = Math.max(1000, Number(panel.querySelector('#maiInterval').value));
      localStorage.setItem(STORAGE.api, url); localStorage.setItem(STORAGE.interval, String(every));
      const inlineUrl = document.querySelector('#url'), inlineInterval = document.querySelector('#interval');
      if (inlineUrl) inlineUrl.value = url; if (inlineInterval) inlineInterval.value = String(every);
      document.querySelector('#save')?.click();
      log(`MAINTAIN AI connection configuration saved locally. Simulator interval is now ${every / 1000}s.`); renderMachineKeys(true);
    };
    panel.querySelector('#maiApiUrl').value = api(); panel.querySelector('#maiInterval').value = String(interval()); panel.querySelector('#maiConnect').onclick = startAll; panel.querySelector('#maiStop').onclick = stopAll;
    panel.querySelector('#maiMachineFilter').oninput = event => { state.filter = String(event.target.value || '').trim().toLowerCase(); renderMachineKeys(true); };
    renderMachineKeys(true); log('Ready. Every simulator machine is mapped to its own MAINTAIN AI device key.');
  }
  window.addEventListener('load', () => setTimeout(() => { syncConfiguration(); addPanel(); setInterval(() => { if (document.getElementById('maiConnectionPanel')) renderMachineKeys(); }, 1000), 100));
})();
