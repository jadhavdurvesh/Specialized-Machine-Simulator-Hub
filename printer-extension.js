/* 3D printer simulator extension.
 * Kept outside index.html so the existing CNC/robot/industrial-machine code path
 * stays untouched. It adds a printer-specific profile and UI through the same
 * per-machine device-key telemetry pipeline.
 */
(() => {
  const PRINTER_ARCH = {
    cartesian: 'Cartesian',
    corexy: 'CoreXY',
    delta: 'Delta',
    resin: 'Resin / MSLA'
  };

  const PRINTER_METRICS = [
    ['nozzle_temperature', 'Nozzle Temperature', '°C'],
    ['bed_temperature', 'Bed Temperature', '°C'],
    ['chamber_temperature', 'Chamber Temperature', '°C'],
    ['print_speed', 'Print Speed', 'mm/s'],
    ['layer_height', 'Layer Height', 'mm'],
    ['z_position', 'Z Position', 'mm'],
    ['extrusion_rate', 'Extrusion Rate', 'mm³/s'],
    ['filament_flow', 'Filament Flow', 'mm/s'],
    ['print_progress', 'Print Progress', '%'],
    ['vibration', 'Vibration', 'mm/s'],
    ['hotend_current', 'Hotend Current', 'A'],
    ['fan_speed', 'Part Cooling Fan', '%']
  ];

  const originalProf = prof;
  const originalVals = vals;
  const originalRenderControls = renderControls;
  const originalRenderHeader = renderHeader;
  const originalRenderInstances = renderInstances;

  TYPES.printer = ['3D Printer', '3DP'];
  MET.printer = PRINTER_METRICS;

  function printerValue(key, i) {
    const n = i.history.length;
    switch (key) {
      case 'nozzle_temperature': return 205 + Math.sin(n / 5) * 3 + rnd(-1.5, 1.5);
      case 'bed_temperature': return 60 + Math.sin(n / 7) * 1.5 + rnd(-0.7, 0.7);
      case 'chamber_temperature': return 31 + Math.sin(n / 12) * 1.5 + rnd(-0.4, 0.4);
      case 'print_speed': return 55 + Math.sin(n / 6) * 8 + rnd(-2, 2);
      case 'layer_height': return 0.20;
      case 'z_position': return (n * 0.20) % 120;
      case 'extrusion_rate': return 5.2 + Math.sin(n / 8) * 0.5 + rnd(-0.15, 0.15);
      case 'filament_flow': return 4.8 + Math.sin(n / 8) * 0.4 + rnd(-0.15, 0.15);
      case 'print_progress': return Math.min(100, (n * 0.55) % 101);
      case 'vibration': return 0.8 + Math.abs(Math.sin(n / 4)) * 0.35 + rnd(-0.05, 0.05);
      case 'hotend_current': return 2.4 + rnd(-0.12, 0.12);
      case 'fan_speed': return 65 + Math.sin(n / 9) * 12 + rnd(-2, 2);
      default: return 50 + rnd(-3, 3);
    }
  }

  // Preserve every existing machine profile; only 3D printers get the new profile.
  prof = function (i) {
    return i.type === 'printer' ? MET.printer : originalProf(i);
  };

  // Preserve every existing value generator; add printer-specific engineering signals.
  vals = function (i) {
    if (i.type !== 'printer') return originalVals(i);
    const out = {};
    for (const [key] of MET.printer) out[key] = printerValue(key, i);
    return out;
  };

  renderControls = function () {
    const i = selected();
    if (!i || i.type !== 'printer') return originalRenderControls();

    $('controls').innerHTML =
      '<div class="form">' +
        '<div class="field"><label>3D printer architecture</label>' +
          '<select id="printerArch">' +
            Object.entries(PRINTER_ARCH).map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="row">' +
          '<div class="field"><label>Nozzle target</label><input id="printerNozzle" type="number" value="205" min="0" max="350"></div>' +
          '<div class="field"><label>Bed target</label><input id="printerBed" type="number" value="60" min="0" max="150"></div>' +
        '</div>' +
        '<div class="muted">3D printers use their own telemetry profile and their own MAINTAIN AI device key. This interface does not alter CNC or robot profiles.</div>' +
      '</div>';

    $('printerArch').value = i.arch || 'cartesian';
    $('printerArch').onchange = () => {
      i.arch = $('printerArch').value;
      i.values = {};
      i.history = [];
      persist();
      render();
    };
  };

  renderHeader = function () {
    originalRenderHeader();
    const i = selected();
    if (i && i.type === 'printer') {
      $('sub').textContent = '3D Printer · ' + (PRINTER_ARCH[i.arch] || PRINTER_ARCH.cartesian) + ' · per-machine device key';
    }
  };

  renderInstances = function () {
    originalRenderInstances();
  };

  // Recover a printer saved in localStorage after a previous extension build.
  // The original load() ran before this extension was injected, so it could not
  // know about the new type yet.
  try {
    const saved = JSON.parse(localStorage.getItem('mai_instances') || 'null');
    if (Array.isArray(saved)) {
      for (const s of saved) {
        if (s.type !== 'printer' || S.items.some(i => i.code === s.code)) continue;
        const i = make('printer');
        i.code = s.code || i.code;
        i.name = s.name || i.name;
        i.key = s.key || '';
        i.arch = s.arch || 'cartesian';
        S.items.push(i);
      }
    }
  } catch {}

  if (!S.sel && S.items.length) S.sel = S.items[0].id;
  render();
})();
