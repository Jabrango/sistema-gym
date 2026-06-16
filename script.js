// ══════════════════════════════
//  STATE
// ══════════════════════════════
let miembros = JSON.parse(localStorage.getItem('mcs-miembros') || '[]');
let asistencias = JSON.parse(localStorage.getItem('mcs-asistencias') || '[]');
let calendarios = JSON.parse(localStorage.getItem('mcs-calendarios') || '{}');
let metas = JSON.parse(localStorage.getItem('mcs-metas') || '{}');
const CUOTA = 4000;

let currentMiembroId = null;
// Calendar state
let calMiembroId = null;
let calYear = null, calMonth = null;
let calSelectedDate = null;

// ══════════════════════════════
//  INIT
// ══════════════════════════════
(function init() {
  const fechaInp = document.getElementById('cont-fecha');
  if (fechaInp) fechaInp.value = todayStr();
  renderTabla();
  renderSelectPersonas();
  calcStats();
})();

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ══════════════════════════════
//  TABS
// ══════════════════════════════
function showTab(name, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'contabilidad') { renderSelectPersonas(); calcStats(); renderAsistencias(); }
}

// ══════════════════════════════
//  AGREGAR MIEMBRO
// ══════════════════════════════
function agregarMiembro() {
  const nombre = document.getElementById('inp-nombre').value.trim();
  const apellido = document.getElementById('inp-apellido').value.trim();
  const fecha = document.getElementById('inp-fecha').value;
  const edad = document.getElementById('inp-edad').value;
  const estatura = document.getElementById('inp-estatura').value;
  const peso = document.getElementById('inp-peso').value;
  const cintura = document.getElementById('inp-cintura').value;
  if (!nombre || !apellido) return toast('Nombre y apellido son requeridos', true);
  const existe = miembros.some(m => m.nombre.toLowerCase() === nombre.toLowerCase() && m.apellido.toLowerCase() === apellido.toLowerCase());
  if (existe) return toast('Ya existe un miembro con ese nombre y apellido', true);
  const miembro = {
    id: Date.now(),
    nombre, apellido, fecha, edad, estatura, peso, cintura,
    fechaRegistro: todayStr()
  };
  miembros.push(miembro);
  // Guardar medidas iniciales en metas
  metas[miembro.id] = {
    inicial: { peso, cintura, estatura, edad, fecha: todayStr() },
    historial: []
  };
  save();
  renderTabla();
  renderSelectPersonas();
  limpiarForm();
  toast('✅ Miembro registrado correctamente');
}

function limpiarForm() {
  ['nombre', 'apellido', 'fecha', 'edad', 'estatura', 'peso', 'cintura'].forEach(f => {
    const el = document.getElementById('inp-' + f);
    if (el) el.value = '';
  });
}

// ══════════════════════════════
//  RENDER TABLA
// ══════════════════════════════
function renderTabla(lista) {
  const data = lista || miembros;
  const tbody = document.getElementById('tabla-miembros');
  if (!tbody) return;
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="icon">🏋️</div>Sin miembros registrados</div></td></tr>'; return; }
  tbody.innerHTML = data.map((m, i) => `
<tr>
  <td style="color:var(--muted)">${i + 1}</td>
  <td><strong>${m.nombre}</strong></td>
  <td>${m.apellido}</td>
  <td>${m.edad || '—'}</td>
  <td>${m.peso ? m.peso + ' kg' : '—'}</td>
  <td>${m.estatura ? m.estatura + ' cm' : '—'}</td>
  <td>${m.cintura ? m.cintura + ' cm' : '—'}</td>
  <td style="white-space:nowrap">
    <button class="btn btn-outline btn-sm" onclick="verDetalle(${m.id})">👁</button>
    <button class="btn btn-sm" style="background:rgba(34,197,94,0.15);border:1px solid var(--green);color:var(--green);margin-left:3px" onclick="abrirCalendario(${m.id})">📅</button>
    <button class="btn btn-sm" style="background:rgba(168,85,247,0.15);border:1px solid var(--purple);color:var(--purple);margin-left:3px" onclick="abrirMetas(${m.id})">🎯</button>
    <button class="btn btn-sm" style="background:#2a2a2a;border:none;color:var(--red);margin-left:3px" onclick="eliminarMiembro(${m.id})">✕</button>
  </td>
</tr>`).join('');
}

function badgePago(pago) {
  const map = { fisico: ['badge-green', '💵 Físico'], nequi: ['badge-blue', '📱 Nequi'], fiado: ['badge-orange', '📋 Fiado'] };
  const [cls, label] = map[pago] || ['', '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function eliminarMiembro(id) {
  if (!confirm('¿Eliminar este miembro?')) return;
  miembros = miembros.filter(m => m.id !== id);
  delete calendarios[id];
  delete metas[id];
  save();
  renderTabla();
  renderSelectPersonas();
  toast('Miembro eliminado');
}

// ══════════════════════════════
//  DETALLE
// ══════════════════════════════
function verDetalle(id) {
  const m = miembros.find(x => x.id === id);
  if (!m) return;
  currentMiembroId = id;
  const nombreEl = document.getElementById('modal-nombre');
  const bodyEl = document.getElementById('modal-body');
  if (nombreEl) nombreEl.textContent = m.nombre + ' ' + m.apellido;
  if (bodyEl) {
    bodyEl.innerHTML = `
<div class="detail-item" style="grid-column:1 / -1;color:var(--muted);font-size:0.95rem;line-height:1.4;">Puedes cambiar los datos del miembro de inmediato. No es necesario esperar un mes para actualizar nombre o medidas.</div>
<div class="detail-item"><label>Nombre</label><input type="text" id="detalle-nombre" value="${m.nombre}" placeholder="Nombre"></div>
<div class="detail-item"><label>Apellido</label><input type="text" id="detalle-apellido" value="${m.apellido}" placeholder="Apellido"></div>
<div class="detail-item"><label>Fecha Nacimiento</label><input type="date" id="detalle-fecha" value="${m.fecha || ''}"></div>
<div class="detail-item"><label>Edad</label><input type="number" id="detalle-edad" value="${m.edad || ''}" placeholder="Edad"></div>
<div class="detail-item"><label>Estatura</label><input type="number" id="detalle-estatura" value="${m.estatura || ''}" placeholder="cm"></div>
<div class="detail-item"><label>Peso</label><input type="number" id="detalle-peso" value="${m.peso || ''}" placeholder="kg" step="0.1"></div>
<div class="detail-item"><label>Cintura</label><input type="number" id="detalle-cintura" value="${m.cintura || ''}" placeholder="cm" step="0.1"></div>
<div class="detail-item"><label>Registrado</label><span>${m.fechaRegistro || '—'}</span></div>
<div style="margin-top:1rem;text-align:center"><button class="btn btn-primary btn-sm" onclick="actualizarMiembro(${m.id})">Guardar cambios del miembro</button></div>`;
  }
  openModal('modal-detalle-overlay');
}

// ══════════════════════════════
//  ACTUALIZAR MIEMBRO
// ══════════════════════════════
function actualizarMiembro(id) {
  const nombre = document.getElementById('detalle-nombre').value.trim();
  const apellido = document.getElementById('detalle-apellido').value.trim();
  const fecha = document.getElementById('detalle-fecha').value;
  const edad = document.getElementById('detalle-edad').value;
  const estatura = document.getElementById('detalle-estatura').value;
  const peso = document.getElementById('detalle-peso').value;
  const cintura = document.getElementById('detalle-cintura').value;
  if (!nombre || !apellido) return toast('Nombre y apellido son requeridos', true);
  const existe = miembros.some(m => m.id !== id && m.nombre.toLowerCase() === nombre.toLowerCase() && m.apellido.toLowerCase() === apellido.toLowerCase());
  if (existe) return toast('Ya existe otro miembro con ese nombre y apellido', true);
  const miembro = miembros.find(m => m.id === id);
  if (!miembro) return toast('Miembro no encontrado', true);

  // Guardar peso/cintura/edad anterior en el historial si hay cambios
  const oldPeso = miembro.peso || '';
  const oldCintura = miembro.cintura || '';
  const oldEdad = miembro.edad || '';
  const newPeso = peso || '';
  const newCintura = cintura || '';
  const newEdad = edad || '';

  if (!metas[id]) metas[id] = { inicial: { peso: miembro.peso || '', cintura: miembro.cintura || '', estatura: miembro.estatura || '', fecha: miembro.fechaRegistro || todayStr() }, historial: [] };
  if (!metas[id].historial) metas[id].historial = [];

  const changed = (oldPeso !== '' && newPeso !== '' && oldPeso != newPeso) || (oldCintura !== '' && newCintura !== '' && oldCintura != newCintura) || (oldEdad !== '' && newEdad !== '' && oldEdad != newEdad);
  if (changed) {
    metas[id].historial.push({ peso: oldPeso, cintura: oldCintura, edad: oldEdad, fecha: todayStr() + ' (antes)' });
    metas[id].historial.push({ peso: newPeso, cintura: newCintura, edad: newEdad, fecha: todayStr() });
  }

  // Actualizar datos del miembro
  miembro.nombre = nombre;
  miembro.apellido = apellido;
  miembro.fecha = fecha;
  miembro.edad = edad;
  miembro.estatura = estatura;
  miembro.peso = peso;
  miembro.cintura = cintura;
  save();
  renderTabla();
  renderMetaContent(id);
  verDetalle(id);
  toast('✅ Datos del miembro actualizados y progreso guardado');
}

// ══════════════════════════════
//  CONTABILIDAD
// ══════════════════════════════
function renderSelectPersonas() {
  const sel = document.getElementById('cont-persona');
  if (!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar miembro —</option>' + miembros.map(m => `<option value="${m.id}">${m.nombre} ${m.apellido}</option>`).join('');
  if (val) sel.value = val;
}

function registrarAsistencia() {
  const personaId = document.getElementById('cont-persona').value;
  const metodo = document.getElementById('cont-metodo').value;
  const fecha = document.getElementById('cont-fecha').value;
  if (!personaId) return toast('Selecciona un miembro', true);
  if (!fecha) return toast('Selecciona una fecha', true);
  const miembro = miembros.find(m => m.id == personaId);
  if (!miembro) return toast('Miembro no encontrado', true);
  asistencias.push({
    id: Date.now(),
    miembroId: personaId,
    nombre: miembro.nombre,
    apellido: miembro.apellido,
    metodo,
    fecha,
    valor: CUOTA
  });
  save(); calcStats(); renderAsistencias();
  toast('✅ Asistencia registrada');
}

function registrarPagoExterno() {
  const nombre = document.getElementById('cont-nombre-externo').value.trim();
  const apellido = document.getElementById('cont-apellido-externo').value.trim();
  const metodo = document.getElementById('cont-metodo-externo').value;
  const valor = Number(document.getElementById('cont-valor-externo').value);
  const fechaInput = document.getElementById('cont-fecha');
  const fecha = fechaInput ? fechaInput.value : todayStr();
  if (!nombre || !apellido) return toast('Nombre y apellido son requeridos', true);
  if (!valor || valor <= 0) return toast('Ingresa un valor válido', true);
  asistencias.push({
    id: Date.now(),
    miembroId: null,
    nombre,
    apellido,
    metodo,
    fecha,
    valor
  });
  save(); calcStats(); renderAsistencias();
  const mensaje = document.getElementById('ultimo-pago-guardado');
  if (mensaje) mensaje.textContent = `Último pago guardado: ${nombre} ${apellido} - $${valor.toLocaleString('es-CO')} (${metodo})`;
  limpiarPagoExterno();
  toast('✅ Pago externo guardado');
}

function limpiarPagoExterno() {
  document.getElementById('cont-nombre-externo').value = '';
  document.getElementById('cont-apellido-externo').value = '';
  document.getElementById('cont-metodo-externo').value = 'fisico';
  document.getElementById('cont-valor-externo').value = '';
}

function renderAsistencias() {
  const cont = document.getElementById('asistencias-contenido');
  if (!cont) return;
  if (!asistencias.length) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">📅</div>Sin registros</div>';
    return;
  }
  cont.innerHTML = `
<div class="table-wrapper">
  <table>
    <thead><tr><th>Fecha</th><th>Nombre</th><th>Apellido</th><th>Método</th><th>Valor</th><th>✕</th></tr></thead>
    <tbody>${[...asistencias].reverse().map(a => `
      <tr>
        <td style="color:var(--muted)">${a.fecha}</td>
        <td>${a.nombre}</td>
        <td>${a.apellido || ''}</td>
        <td>${badgePago(a.metodo)}</td>
        <td style="color:var(--yellow);font-weight:700">$${a.valor.toLocaleString('es-CO')}</td>
        <td><button class="btn btn-sm" style="background:#2a2a2a;border:none;color:var(--red)" onclick="eliminarAsistencia(${a.id})">✕</button></td>
      </tr>`).join('')}</tbody>
  </table>
</div>`;
}

function eliminarAsistencia(id) {
  asistencias = asistencias.filter(a => a.id !== id);
  save(); calcStats(); renderAsistencias();
  toast('Registro eliminado');
}

function buscarMiembroAsistencia() {
  const q = document.getElementById('inp-buscar-asistencia').value.trim().toLowerCase();
  const cont = document.getElementById('resultados-buscar-asistencia');
  if (!cont) return;
  if (!q) { cont.innerHTML = '<div class="empty-state"><div class="icon">👥</div>Escribe para buscar</div>'; return; }
  const res = miembros.filter(m => m.nombre.toLowerCase().includes(q) || m.apellido.toLowerCase().includes(q));
  if (!res.length) { cont.innerHTML = '<div class="empty-state"><div class="icon">😕</div>No se encontraron personas</div>'; return; }
  cont.innerHTML = res.map(m => `<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:0.8rem;margin-bottom:0.6rem">
<div style="margin-bottom:0.8rem">
  <strong>${m.nombre} ${m.apellido}</strong><br><small style="color:var(--muted)">Edad: ${m.edad || '—'} | Peso: ${m.peso || '—'}kg</small>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.6rem">
  <select id="pago-metodo-${m.id}" style="padding:0.5rem;background:var(--input);border:1px solid var(--border);border-radius:4px;color:#fff;font-size:0.9rem">
    <option value="fisico">💵 Efectivo</option>
    <option value="nequi">📱 Nequi</option>
    <option value="fiado">📋 Fiado</option>
  </select>
  <input type="number" id="pago-valor-${m.id}" placeholder="Monto" min="0" step="100" style="padding:0.5rem;background:var(--input);border:1px solid var(--border);border-radius:4px;color:#fff;font-size:0.9rem" />
</div>
<button class="btn btn-primary" style="width:100%;" onclick="registrarPagoMiembro('${m.id}','${m.nombre}','${m.apellido}')">💾 Guardar Pago</button>
</div>`).join('');
}

function selectPersonaAsistencia(id, nombre) {
  const personaEl = document.getElementById('cont-persona');
  const buscarEl = document.getElementById('inp-buscar-asistencia');
  const resEl = document.getElementById('resultados-buscar-asistencia');
  if (personaEl) personaEl.value = id;
  if (buscarEl) buscarEl.value = '';
  if (resEl) resEl.innerHTML = '<div class="empty-state"><div class="icon">✅</div>Persona seleccionada: ' + nombre + '</div>';
}

function registrarPagoMiembro(id, nombre, apellido) {
  const metodo = document.getElementById('pago-metodo-' + id).value;
  const valor = Number(document.getElementById('pago-valor-' + id).value);
  if (!valor || valor <= 0) return toast('Ingresa un valor válido', true);
  asistencias.push({
    id: Date.now(),
    miembroId: id,
    nombre,
    apellido,
    metodo,
    fecha: todayStr(),
    valor
  });
  save(); calcStats(); renderAsistencias();
  const buscarEl = document.getElementById('inp-buscar-asistencia');
  const resEl = document.getElementById('resultados-buscar-asistencia');
  if (buscarEl) buscarEl.value = '';
  if (resEl) resEl.innerHTML = '<div class="empty-state"><div class="icon">✅</div>Pago registrado para ' + nombre + ' ' + apellido + '</div>';
  toast('✅ Pago registrado');
}

function calcStats() {
  const totals = { fisico: 0, nequi: 0, fiado: 0 };
  for (const a of asistencias || []) {
    const valor = Number(a.valor) || 0;
    if (a.metodo && totals[a.metodo] !== undefined) {
      totals[a.metodo] += valor;
    }
  }
  const totalCount = asistencias.length;
  const totalRecaudo = totals.fisico + totals.nequi + totals.fiado;

  const totalEl = document.getElementById('stat-total');
  const fisicoEl = document.getElementById('stat-fisico');
  const nequiEl = document.getElementById('stat-nequi');
  const fiadoEl = document.getElementById('stat-fiado');
  const recaudoEl = document.getElementById('stat-recaudo');

  if (totalEl) totalEl.textContent = totalCount;
  if (fisicoEl) fisicoEl.textContent = '$' + totals.fisico.toLocaleString('es-CO');
  if (nequiEl) nequiEl.textContent = '$' + totals.nequi.toLocaleString('es-CO');
  if (fiadoEl) fiadoEl.textContent = '$' + totals.fiado.toLocaleString('es-CO');
  if (recaudoEl) recaudoEl.textContent = '$' + totalRecaudo.toLocaleString('es-CO');
  try { drawEarningsChart(); } catch (e) { /* no bloquear */ }
}

function drawEarningsChart() {
  try {
    const canvas = document.getElementById('earnings-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const totals = { fisico: 0, nequi: 0, fiado: 0 };
    for (const a of asistencias || []) {
      if (!a || !a.metodo) continue;
      totals[a.metodo] = (totals[a.metodo] || 0) + (Number(a.valor) || 0);
    }
    const labels = ['Efectivo', 'Nequi', 'Fiado'];
    const keys = ['fisico', 'nequi', 'fiado'];
    const colors = ['#22c55e', '#3b82f6', '#f97316'];

    const padding = 24, chartW = w - padding * 2, chartH = h - padding * 2 - 24;
    const barGap = 24, barCount = keys.length, barW = (chartW - (barGap * (barCount - 1))) / barCount;
    const maxVal = Math.max(...keys.map(k => totals[k] || 0), 1);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(padding, padding, chartW, chartH + 8);

    keys.forEach((k, i) => {
      const val = totals[k] || 0;
      const x = padding + i * (barW + barGap), height = (val / maxVal) * chartH, y = padding + (chartH - height);
      const grad = ctx.createLinearGradient(x, y, x, y + height);
      grad.addColorStop(0, colors[i] + 'f2');
      grad.addColorStop(1, colors[i] + '72');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW, height, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = '600 12px Barlow, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$' + val.toLocaleString('es-CO'), x + barW / 2, y - 8);
      ctx.fillStyle = 'rgba(200,200,200,0.6)';
      ctx.font = '600 11px Barlow, sans-serif';
      ctx.fillText(labels[i], x + barW / 2, padding + chartH + 20);
    });

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  } catch (e) { console.warn('drawEarningsChart error', e); }
}

// ══════════════════════════════
//  CALENDARIO
// ══════════════════════════════
function abrirCalendario(id) {
  calMiembroId = id;
  calSelectedDate = null;
  const m = miembros.find(x => x.id === id);
  const nombreEl = document.getElementById('cal-miembro-nombre');
  if (nombreEl) nombreEl.textContent = '📅 ' + m.nombre + ' ' + m.apellido;
  const now = new Date();
  calYear = now.getFullYear(); calMonth = now.getMonth();
  closeModalById('modal-detalle-overlay');
  renderCal();
  openModal('modal-cal-overlay');
}

function calNav(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCal();
}

function renderCal() {
  const monthLabel = document.getElementById('cal-month-label');
  const eEl = document.getElementById('cal-stat-e');
  const dEl = document.getElementById('cal-stat-d');
  const fEl = document.getElementById('cal-stat-f');
  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  if (monthLabel) monthLabel.textContent = monthNames[calMonth] + ' ' + calYear;

  const cal = calendarios[calMiembroId] || {};
  // stats for all time
  let entrenos = 0, descansos = 0, faltas = 0;
  Object.values(cal).forEach(v => { if (v === 'entreno') entrenos++; else if (v === 'descanso') descansos++; else if (v === 'falta') faltas++; });
  
  if (eEl) eEl.textContent = entrenos;
  if (dEl) dEl.textContent = descansos;
  if (fEl) fEl.textContent = faltas;

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  let html = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('');

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = todayStr();

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const estado = cal[dateStr] || '';
    const isToday = dateStr === today;
    const isSel = dateStr === calSelectedDate;
    html += `<div class="cal-day ${estado} ${isToday ? 'today' : ''}" 
          style="${isSel ? 'outline:2px solid var(--yellow);outline-offset:2px' : ''}"
          onclick="selDia('${dateStr}',${d})" title="${dateStr}">
          <span>${d}</span>
          ${estado ? `<div class="day-dot"></div>` : ''}
       </div>`;
  }
  grid.innerHTML = html;
}

function selDia(dateStr, d) {
  calSelectedDate = dateStr;
  const selEl = document.getElementById('cal-selected-date');
  if (selEl) selEl.textContent = `Día seleccionado: ${dateStr}`;
  renderCal();
}

function marcarDia(estado) {
  if (!calSelectedDate) return toast('Selecciona un día primero', true);
  if (!calendarios[calMiembroId]) calendarios[calMiembroId] = {};
  if (estado === null) delete calendarios[calMiembroId][calSelectedDate];
  else calendarios[calMiembroId][calSelectedDate] = estado;
  save(); renderCal();
  if (estado) toast('✅ Día marcado como ' + estado);
}


// ══════════════════════════════
//  METAS MENSUALES
// ══════════════════════════════
function abrirMetas(id) {
  calMiembroId = id;
  const m = miembros.find(x => x.id === id);
  const nameEl = document.getElementById('meta-miembro-nombre');
  if (nameEl) nameEl.textContent = '🎯 ' + m.nombre + ' ' + m.apellido;
  renderMetaContent(id);
  closeModalById('modal-detalle-overlay');
  openModal('modal-meta-overlay');
}

function renderMetaContent(id) {
  const m = miembros.find(x => x.id === id);
  if (!metas[id]) metas[id] = { inicial: { peso: m.peso, cintura: m.cintura, estatura: m.estatura, fecha: m.fechaRegistro || todayStr() }, historial: [] };
  const meta = metas[id];
  const ini = meta.inicial;
  const hist = meta.historial || [];

  // Calcular próxima medición (1 mes desde fecha inicial)
  const fechaIni = new Date(ini.fecha);
  const fechaProx = new Date(fechaIni);
  fechaProx.setMonth(fechaProx.getMonth() + 1);
  const hoy = new Date();
  const diasRestantes = Math.ceil((fechaProx - hoy) / (1000 * 60 * 60 * 24));
  const vencida = diasRestantes <= 0;

  let alertaHtml = '';
  if (vencida) {
    alertaHtml = `<div class="meta-alert">⏰ Puedes registrar una nueva medición ahora mismo. No necesitas esperar un mes.</div>`;
  } else {
    alertaHtml = `<div class="meta-alert ok">📆 Esta medición está disponible de inmediato. Usa el formulario abajo para guardar cambios o registrar progreso.</div>`;
  }

  // Último registro
  const ultimo = hist.length > 0 ? hist[hist.length - 1] : null;
  const datosActuales = {
    peso: ultimo?.peso || ini.peso || m.peso || '',
    cintura: ultimo?.cintura || ini.cintura || m.cintura || '',
    edad: ultimo?.edad || ini.edad || m.edad || '',
    fecha: ultimo?.fecha || todayStr()
  };

  let comparativaHtml = '';
  if (ultimo) {
    const dpeso = parseFloat(ultimo.peso) - parseFloat(ini.peso);
    const dcint = parseFloat(ultimo.cintura) - parseFloat(ini.cintura);
    comparativaHtml = `
  <div class="meta-section">
    <div class="meta-section-title">📊 Comparativa (Inicial → Último)</div>
    <div class="meta-row">
      <div class="meta-item">
        <label>Peso Inicial</label><div class="val">${ini.peso || '—'} kg</div>
        <label style="margin-top:0.5rem">Peso Actual</label>
        <div class="val ${dpeso < 0 ? 'better' : dpeso > 0 ? 'worse' : 'same'}">${ultimo.peso} kg 
          <span style="font-size:0.8rem">(${dpeso > 0 ? '+' : ''}${dpeso.toFixed(1)})</span>
        </div>
        <div class="meta-progress"><div class="meta-progress-bar" style="width:${Math.min(100, Math.abs(dpeso) * 10)}%;background:${dpeso < 0 ? 'var(--green)' : 'var(--red)'}"></div></div>
      </div>
      <div class="meta-item">
        <label>Cintura Inicial</label><div class="val">${ini.cintura || '—'} cm</div>
        <label style="margin-top:0.5rem">Cintura Actual</label>
        <div class="val ${dcint < 0 ? 'better' : dcint > 0 ? 'worse' : 'same'}">${ultimo.cintura} cm
          <span style="font-size:0.8rem">(${dcint > 0 ? '+' : ''}${dcint.toFixed(1)})</span>
        </div>
        <div class="meta-progress"><div class="meta-progress-bar" style="width:${Math.min(100, Math.abs(dcint) * 5)}%;background:${dcint < 0 ? 'var(--green)' : 'var(--red)'}"></div></div>
      </div>
      <div class="meta-item">
        <label>Última medición</label>
        <div class="val" style="color:var(--muted);font-size:0.95rem">${ultimo.fecha}</div>
      </div>
    </div>
  </div>`;
  }

  // Historial
  let histHtml = '';
  if (hist.length > 0) {
    const histReversed = [...hist].reverse();
    histHtml = `<div class="meta-section">
  <div class="meta-section-title">📋 Historial de Mediciones</div>
  <div class="table-wrapper"><table>
    <thead><tr><th>Fecha</th><th>Peso</th><th>Cintura</th><th>Edad</th><th>✕</th></tr></thead>
    <tbody>${histReversed.map((h, i) => {
      const idx = hist.length - 1 - i;
      return `<tr>
        <td style="color:var(--muted)">${h.fecha}</td>
        <td>${h.peso} kg</td><td>${h.cintura} cm</td><td>${h.edad || '—'}</td>
        <td><button class="btn btn-xs" style="background:none;border:none;color:var(--red);cursor:pointer" onclick="borrarMedicion(${id},${idx})">✕</button></td>
      </tr>`;
    }).join('')}
    </tbody></table></div></div>`;
  }

  const cont = document.getElementById('meta-content');
  if (cont) {
    cont.innerHTML = `
${alertaHtml}
<div class="meta-section">
  <div class="meta-section-title">➕ Registrar / actualizar medición</div>
  <div class="meta-copy">Edita los datos actuales y guarda la nueva medición con fecha. Puedes hacerlo siempre que quieras para llevar el progreso completo.</div>
  <div class="input-meta-row">
    <div class="form-group"><label>Peso (kg)</label><input type="number" id="meta-peso" placeholder="Ej: 68" step="0.1" value="${datosActuales.peso}"></div>
    <div class="form-group"><label>Cintura (cm)</label><input type="number" id="meta-cintura" placeholder="Ej: 82" step="0.1" value="${datosActuales.cintura}"></div>
    <div class="form-group"><label>Edad</label><input type="number" id="meta-edad" placeholder="Ej: 26" value="${datosActuales.edad}"></div>
  </div>
  <div class="form-group" style="margin-bottom:1rem;max-width:200px"><label>Fecha</label><input type="date" id="meta-fecha" value="${datosActuales.fecha}"></div>
  <button class="btn btn-primary btn-sm" onclick="guardarMedicion(${id})">Guardar Medición</button>
</div>
<div class="meta-section">
  <div class="meta-section-title">📏 Medidas Iniciales (${ini.fecha})</div>
  <div class="meta-row">
    <div class="meta-item"><label>Peso</label><div class="val">${ini.peso || '—'} kg</div></div>
    <div class="meta-item"><label>Cintura</label><div class="val">${ini.cintura || '—'} cm</div></div>
    <div class="meta-item"><label>Estatura</label><div class="val">${ini.estatura || '—'} cm</div></div>
  </div>
</div>
${comparativaHtml}
${histHtml}
`;
  }
}

function guardarMedicion(id) {
  const peso = document.getElementById('meta-peso').value;
  const cintura = document.getElementById('meta-cintura').value;
  const edad = document.getElementById('meta-edad').value;
  const fecha = document.getElementById('meta-fecha').value || todayStr();
  if (!peso && !cintura) return toast('Ingresa al menos peso o cintura', true);
  if (!metas[id]) metas[id] = { inicial: {}, historial: [] };
  if (!metas[id].historial) metas[id].historial = [];
  metas[id].historial.push({ peso, cintura, edad, fecha });
  const miembro = miembros.find(m => m.id == id);
  if (miembro) {
    if (peso) miembro.peso = peso;
    if (cintura) miembro.cintura = cintura;
    if (edad) miembro.edad = edad;
  }
  save();
  renderTabla();
  renderMetaContent(id);
  toast('✅ Medición registrada y progresos guardados');
}

function borrarMedicion(id, idx) {
  metas[id].historial.splice(idx, 1);
  save(); renderMetaContent(id);
  toast('Medición eliminada');
}

// ══════════════════════════════
//  MODALS
// ══════════════════════════════
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModalById(id, e) {
  const modal = document.getElementById(id);
  if (!e || e.target === modal) {
    if (modal) modal.classList.remove('open');
  }
}

// ══════════════════════════════
//  SAVE
// ══════════════════════════════
function save() {
  localStorage.setItem('mcs-miembros', JSON.stringify(miembros));
  localStorage.setItem('mcs-asistencias', JSON.stringify(asistencias));
  localStorage.setItem('mcs-calendarios', JSON.stringify(calendarios));
  localStorage.setItem('mcs-metas', JSON.stringify(metas));
}

// ══════════════════════════════
//  TOAST
// ══════════════════════════════
function toast(msg, error = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'show' + (error ? ' error' : '');
  setTimeout(() => t.className = '', 3000);
}

// ══════════════════════════════
//  DOM CONTENT LOADED (ANIMATIONS)
// ══════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Programmatic letter splitting for stunning staggered entrance
    const splashText = document.querySelector('.splash-text');
    if (splashText) {
      const text = splashText.textContent.trim();
      splashText.innerHTML = text.split('').map((char, index) => {
        if (char === ' ') return '&nbsp;';
        return `<span style="animation-delay: ${1000 + index * 50}ms">${char}</span>`;
      }).join('');
    }

    const h = document.querySelector('header'); if (h) h.classList.add('fade-in');
    const m = document.querySelector('main'); if (m) m.classList.add('fade-in');
    document.querySelectorAll('.section-title').forEach((el, i) => setTimeout(() => el.classList.add('fade-in'), i * 80));
    document.querySelectorAll('.card').forEach((c, i) => setTimeout(() => c.classList.add('fade-in'), 120 + i * 40));
    // small subtle pulsing for active tab
    const activeBtn = document.querySelector('.tab-btn.active'); if (activeBtn) activeBtn.style.boxShadow = '0 6px 18px rgba(232,25,44,0.12)';

    // Splash logic: elegant entrance + zoom-out exit
    const splash = document.getElementById('splash');
    const splashLogo = document.getElementById('splash-logo');
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (splash && splashLogo) {
      if (!prefersReduced) splash.classList.add('splash-enter');
      const showTime = prefersReduced ? 200 : 3400; // time before starting exit (giving time to enjoy flickers & stagger)
      const exitTime = prefersReduced ? 180 : 760; // duration of exit animation
      setTimeout(() => {
        if (prefersReduced) { try { splash.remove(); } catch (e) { splash.classList.add('hidden'); } return; }
        splash.classList.remove('splash-enter');
        splash.classList.add('splash-leave');
        setTimeout(() => { try { splash.remove(); } catch (e) { splash.classList.add('hidden'); } }, exitTime + 60);
      }, showTime);
    }

    // Animar el contenido principal cuando el splash desaparezca
    function animateContent(reduced) {
      const headerEl = document.querySelector('header');
      const brandLogo = document.querySelector('.brand .logo');
      const gymLogoEl = document.getElementById('gym-logo');
      const navEl = document.querySelector('nav');
      const mainEl = document.querySelector('main');
      if (reduced) {
        [headerEl, brandLogo, gymLogoEl, navEl, mainEl].forEach(el => { if (el) el.style.opacity = 1; });
        document.querySelectorAll('.section-title, .card').forEach(el => el.style.opacity = 1);
        return;
      }
      if (headerEl) setTimeout(() => { headerEl.classList.add('enter-top'); headerEl.style.opacity = 1; }, 60);
      if (brandLogo) setTimeout(() => { brandLogo.classList.add('enter-left'); brandLogo.style.opacity = 1; }, 140);
      if (gymLogoEl) setTimeout(() => { gymLogoEl.classList.add('enter-right'); gymLogoEl.style.opacity = 1; }, 180);
      if (navEl) setTimeout(() => { navEl.classList.add('enter-right'); navEl.style.opacity = 1; }, 200);
      if (mainEl) setTimeout(() => { mainEl.classList.add('enter-bottom'); mainEl.style.opacity = 1; }, 220);

      document.querySelectorAll('.section-title').forEach((el, i) => setTimeout(() => { el.classList.add(i % 2 ? 'enter-right' : 'enter-left'); el.style.opacity = 1; }, 300 + i * 90));
      document.querySelectorAll('.card').forEach((c, i) => setTimeout(() => { c.classList.add(i % 2 ? 'enter-right' : 'enter-left'); c.style.opacity = 1; }, 380 + i * 90));
      // animar campos de formulario y botones con stagger
      document.querySelectorAll('.form-group').forEach((el, i) => setTimeout(() => { el.classList.add('enter-up'); el.style.opacity = 1; }, 520 + i * 60));
      document.querySelectorAll('.payment-options .pay-btn').forEach((el, i) => setTimeout(() => { el.classList.add('enter-fade'); el.style.opacity = 1; }, 680 + i * 80));
      document.querySelectorAll('.btn-primary').forEach((el, i) => setTimeout(() => { el.classList.add('enter-fade'); el.style.opacity = 1; }, 840 + i * 60));
      // animar filas de la tabla (si existen)
      document.querySelectorAll('table tbody tr').forEach((tr, i) => setTimeout(() => { tr.classList.add('enter-left'); tr.style.opacity = 1; }, 920 + i * 60));
    }

    const totalDelay = (prefersReduced ? 200 : 3400) + (prefersReduced ? 180 : 760) + 120;
    setTimeout(() => animateContent(prefersReduced), totalDelay);
  } catch (e) { /* non-blocking */ }
});
