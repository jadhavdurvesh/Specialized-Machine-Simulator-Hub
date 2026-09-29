(() => {
  const DEFAULT_API = 'https://maintain-ai-3.vercel.app';
  const STORAGE = { api: 'mai_hub_api', key: 'mai_hub_device_key', interval: 'mai_hub_interval' };
  const state = { running: false, timer: null, commandTimer: null, busy: false };

  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const normalizeApi = value => String(value || '').trim().replace(/\/$/, '');
  const api = () => normalizeApi(document.querySelector('#maiApiUrl')?.value || DEFAULT_API);
  const key = () => String(document.querySelector('#maiDeviceKey')?.value || '').trim();
  const interval = () => Math.max(1000, Number(document.querySelector('#maiInterval')?.value || 5000));

  function addPanel() {
    if (document.getElementById('maiConnectionPanel')) return;
    const panel = document.createElement('section');
    panel.id = 'maiConnectionPanel';
    panel.style.cssText = 'position:fixed;right:18px;bottom:18px;width:min(390px,calc(100vw - 36px));z-index:9999;background:#0d1723;border:1px solid #2a405b;border-radius:14px;box-shadow:0 20px 60px #0009;color:#e8eef7;font:13px/1.45 Inter,system-ui,sans-serif;padding:16px';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px">
        <div><strong style="font-size:15px">MAINTAIN AI Device Connection</strong><div style="color:#8ea0b7;font-size:11px;margin-top:2px">Simulator → machine device key → Maintain AI</div></div>
        <span id="maiConnStatus" style="padding:5px 8px;border:1px solid #344b66;border-radius:999px;color:#8ea0b7">Idle</span>
      </div>
      <label style="display:block;color:#8ea0b7;font-size:11px;margin:8px 0 5px">MAINTAIN AI API URL</label>
      <input id="maiApiUrl" value="${esc(localStorage.getItem(STORAGE.api) || DEFAULT_API)}" style="width:100%;box-sizing:border-box;background:#09131f;border:1px solid #2a405b;color:#e8eef7;border-radius:8px;padding:9px">
      <label style="display:block;color:#8ea0b7;font-size:11px;margin:8px 0 5px">Machine Device Key</label>
      <input id="maiDeviceKey" type="password" value="${esc(localStorage.getItem(STORAGE.key) || '')}" placeholder="Paste the key generated in MAINTAIN AI" style="width:100%;box-sizing:border-box;background:#09131f;border:1px solid #2a405b;color:#e8eef7;border-radius:8px;padding:9px">
      <div style="display:grid;grid-template-columns:1fr 120px;gap:8px;margin-top:8px">
        <button id="maiSave" style="background:#142235;color:#e8eef7;border:1px solid #2a405b;border-radius:8px;padding:9px;cursor:pointer">Save locally</button>
        <select id="maiInterval" style="background:#09131f;color:#e8eef7;border:1px solid #2a405b;border-radius:8px;padding:9px">
          <option value="1000">1 second</option><option value="5000">5 seconds</option><option value="10000">10 seconds</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <button id="maiConnect" style="background:#4f8cff;color:white;border:1px solid #4f8cff;border-radius:8px;padding:9px;cursor:pointer">Start telemetry</button>
        <button id="maiStop" style="background:#3b1820;color:#ffd9df;border:1px solid #6c2735;border-radius:8px;padding:9px;cursor:pointer">Stop telemetry</button>
      </div>
      <div id="maiConnLog" style="margin-top:10px;color:#8ea0b7;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:90px;overflow:auto">Ready. The simulator uses HTTPS device ingestion and the durable command queue.</div>`;
    document.body.appendChild(panel);
    const savedInterval = localStorage.getItem(STORAGE.interval) || '5000';
    document.querySelector('#maiInterval').value = savedInterval;
    panel.querySelector('#maiSave').onclick = save;
    panel.querySelector('#maiConnect').onclick = start;
    panel.querySelector('#maiStop').onclick = stop;
  }

  function save() {
    localStorage.setItem(STORAGE.api, normalizeApi(document.querySelector('#maiApiUrl').value));
    localStorage.setItem(STORAGE.key, key());
    localStorage.setItem(STORAGE.interval, String(document.querySelector('#maiInterval').value));
    log('Configuration saved locally.');
  }

  function log(message, error = false) {
    const el = document.querySelector('#maiConnLog');
    if (!el) return;
    const line = document.createElement('div');
    line.textContent = `${new Date().toLocaleTimeString()} · ${message}`;
    if (error) line.style.color = '#ff9aa8';
    el.prepend(line);
  }

  function status(text, ok = false) {
    const el = document.querySelector('#maiConnStatus');
    if (!el) return;
    el.textContent = text;
    el.style.color = ok ? '#73dfb9' : '#8ea0b7';
    el.style.borderColor = ok ? '#1c5546' : '#344b66';
  }

  function currentMachineId() {
    return document.querySelector('#machineBadge')?.textContent?.trim() || 'SIMULATOR';
  }

  function readMetrics() {
    return [...document.querySelectorAll('#metrics .metric')].map(card => {
      const label = card.querySelector('.label')?.textContent?.trim() || '';
      const valueText = card.querySelector('.value')?.textContent?.trim() || '';
      const unit = card.querySelector('.unit')?.textContent?.trim() || '';
      const value = Number(valueText.replace(/,/g, ''));
      if (!label || !Number.isFinite(value)) return null;
      const readingType = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      return { reading_type: readingType, value, unit };
    }).filter(Boolean);
  }

  async function proxy(path, options = {}) {
    const response = await fetch('/.netlify/functions/maintain-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: api(), path, method: options.method || 'GET', headers: { 'X-Device-Key': key(), 'Content-Type': 'application/json' }, body: options.body || null })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.error || `proxy ${response.status}`);
    return data;
  }

  async function sendCycle() {
    if (!state.running || state.busy || !key()) return;
    state.busy = true;
    try {
      const readings = readMetrics();
      if (!readings.length) throw new Error('No simulator telemetry is currently rendered. Start a machine first.');
      for (const reading of readings) {
        const result = await proxy('/api/devices/ingest', { method: 'POST', body: reading });
        if (result?.safety?.shutdown_requested) {
          await handleShutdown(result.safety);
          return;
        }
      }
      status(`Streaming · ${readings.length} readings`, true);
    } catch (error) {
      status('Offline');
      log(`Telemetry send failed: ${error.message}`, true);
    } finally {
      state.busy = false;
    }
  }

  async function pollCommands() {
    if (!state.running || !key()) return;
    try {
      const command = await proxy(`/api/devices/commands?ts=${Date.now()}`);
      if (command?.pending) await handleShutdown(command);
    } catch (error) {
      log(`Command check failed: ${error.message}`, true);
    }
  }

  async function handleShutdown(command) {
    state.running = false;
    clearInterval(state.timer);
    clearInterval(state.commandTimer);
    const toggle = document.querySelector('#toggleBtn');
    if (toggle && /stop/i.test(toggle.textContent || '')) toggle.click();
    status('SAFETY SHUTDOWN');
    log(`Shutdown command received: ${command.reason || command.command_type || 'safety limit crossed'}`, true);
    if (command.event_id) {
      try {
        await proxy('/api/devices/commands/ack', { method: 'POST', body: { event_id: Number(command.event_id) } });
        log('Shutdown acknowledgement stored by MAINTAIN AI.');
      } catch (error) {
        log(`Shutdown acknowledgement failed: ${error.message}`, true);
      }
    }
  }

  function start() {
    if (!key()) { status('Missing key'); log('Paste the device key generated for this machine in MAINTAIN AI.', true); return; }
    save();
    state.running = true;
    clearInterval(state.timer);
    clearInterval(state.commandTimer);
    sendCycle();
    state.timer = setInterval(sendCycle, interval());
    state.commandTimer = setInterval(pollCommands, 1000);
    status('Connecting');
    log(`Telemetry started for ${currentMachineId()} → ${api()}`);
  }

  function stop() {
    state.running = false;
    clearInterval(state.timer);
    clearInterval(state.commandTimer);
    status('Idle');
    log('Telemetry stopped.');
  }

  window.addEventListener('load', () => {
    addPanel();
    log(`Ready for device-key telemetry. Backend: ${api()}`);
  });
})();
