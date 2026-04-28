// ═══════════════════════════════════════════════════════
//   VacationFlow — Panel Jefe (panel_jefe.js)
// ═══════════════════════════════════════════════════════

const BASE = 'https://vacationflow-api-production.up.railway.app';

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// ─── PROTECCIÓN: solo admin ───────────────────────────
const _token = getToken();
if (!_token) {
  window.location.replace('index.html');
} else {
  try {
    const payload = JSON.parse(atob(_token.split('.')[1]));
    if (payload.rol !== 'admin') {
      alert('🚫 Acceso restringido: esta zona es solo para jefes.');
      window.location.replace('perfil_usuario.html');
    }
  } catch {
    window.location.replace('index.html');
  }
}

// ─── CARGAR SOLICITUDES PENDIENTES ───────────────────────────
async function cargarPendientes() {
  try {
    const res = await fetch(`${BASE}/api/admin/vacations/pending`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (res.status === 401) { window.location.replace('index.html'); return; }
    if (res.status === 403) { window.location.replace('perfil_usuario.html'); return; }
    const data = await res.json();
    renderPendientes(data);
    document.getElementById('badge-pendientes').textContent = `${data.length} NUEVAS`;
  } catch (err) {
    console.error('Error cargando pendientes:', err);
    renderPendientes([]);
  }
}

function renderPendientes(solicitudes) {
  const list = document.getElementById('requests-list');
  list.innerHTML = '';

  if (!solicitudes.length) {
    list.innerHTML = '<p style="color:var(--text-sub);font-size:13px">No hay solicitudes pendientes.</p>';
    return;
  }

  const colores = ['av1','av2','av3','av4','av5'];
  solicitudes.forEach((s, i) => {
    const iniciales = `${s.empleado.nombre[0]}${s.empleado.apellidos[0]}`;
    const tipo = s.tipo === 'vacaciones' ? 'vacation' : 'medical';
    const tipoLabel = s.tipo === 'vacaciones' ? 'VACACIONES' : s.tipo === 'baja_medica' ? 'BAJA MÉDICA' : 'ASUNTOS PROPIOS';
    const fechaI = s.fecha_inicio?.slice(0,10) || '';
    const fechaF = s.fecha_fin?.slice(0,10) || '';

    const item = document.createElement('div');
    item.className = 'request-item';
    item.dataset.id = s.id;
    item.innerHTML = `
      <div class="req-avatar ${colores[i % colores.length]}">${iniciales}</div>
      <div class="req-info">
        <div class="req-name">${s.empleado.nombre} ${s.empleado.apellidos}</div>
        <div class="req-meta">
          <span class="req-tag ${tipo}">${tipoLabel}</span>
          ${fechaI} · ${fechaF} (${s.total_dias} días)
        </div>
      </div>
      <div class="req-actions">
        <button class="btn-reject" onclick="rechazar(this, ${s.id})">Rechazar</button>
        <button class="btn-approve" onclick="aprobar(this, ${s.id})">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Aprobar
        </button>
      </div>
    `;
    list.appendChild(item);
  });
}

// ─── APROBAR ─────────────────────────────────────────────
async function aprobar(btn, id) {
  try {
    const res = await fetch(`${BASE}/api/admin/vacations/${id}/approve`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (res.ok) {
      btn.closest('.request-item').classList.add('approved');
      btn.disabled = true;
      btn.closest('.request-item').querySelector('.btn-reject').disabled = true;
      showToast('✅ Solicitud aprobada correctamente.');
    } else {
      showToast('⚠️ ' + data.message);
    }
  } catch (err) {
    showToast('❌ No se pudo conectar con el servidor.');
  }
}

// ─── RECHAZAR ────────────────────────────────────────────
async function rechazar(btn, id) {
  try {
    const res = await fetch(`${BASE}/api/admin/vacations/${id}/reject`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (res.ok) {
      btn.closest('.request-item').classList.add('rejected');
      btn.disabled = true;
      btn.closest('.request-item').querySelector('.btn-approve').disabled = true;
      showToast('❌ Solicitud rechazada.');
    } else {
      showToast('⚠️ ' + data.message);
    }
  } catch (err) {
    showToast('❌ No se pudo conectar con el servidor.');
  }
}

// ─── GRÁFICO BARRAS - OCCUPATION ─────────────────────────
async function cargarOcupacion() {
  try {
    const res = await fetch(`${BASE}/api/admin/stats/occupation`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    renderBarChart(data.ocupacion_mensual);
  } catch (err) {
    renderBarChart([]);
  }
}

function renderBarChart(datos) {
  const canvas = document.getElementById('occupation-chart');
  const ctx = canvas.getContext('2d');
  const mesesNombres = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  const valores = Array(12).fill(0);
  if (datos && datos.length) {
    datos.forEach(d => { valores[d.mes - 1] = d.total_ausencias; });
  } else {
    [30,45,35,50,95,60,40,55,30,45,35,50].forEach((v,i) => valores[i] = v);
  }

  const maxVal = Math.max(...valores, 1);
  const W = canvas.parentElement.offsetWidth;
  const H = 200;
  canvas.width = W;
  canvas.height = H;

  const padL=10, padR=10, padT=20, padB=36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const gap = chartW / 12;
  const barW = gap * 0.5;

  ctx.clearRect(0, 0, W, H);

  valores.forEach((val, i) => {
    const x = padL + i * gap + gap / 2;
    const isPeak = val === maxVal && val > 0;
    const barH = (val / maxVal) * chartH;

    ctx.fillStyle = isPeak ? '#1a3a35' : '#3aaa93';
    ctx.beginPath();
    ctx.roundRect(x - barW/2, padT + chartH - barH, barW, barH, [4,4,0,0]);
    ctx.fill();

    if (isPeak) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${val}`, x, padT + chartH - barH + 14);
    }

    ctx.fillStyle = '#5c7872';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mesesNombres[i], x, H - 8);
  });
}

// ─── GRÁFICO DONUT - ABSENCES ─────────────────────────────
async function cargarAusencias() {
  try {
    const res = await fetch(`${BASE}/api/admin/stats/absences`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    renderDonut(data);
  } catch (err) {
    renderDonut([]);
  }
}

function renderDonut(datos) {
  const canvas = document.getElementById('donut-chart');
  const ctx = canvas.getContext('2d');
  const cx = 80, cy = 80, r = 65, inner = 44;

  const total = datos.reduce((acc, d) => acc + d.total, 0) || 1;
  const colores = { vacaciones: '#2e8b78', baja_medica: '#e05a5a', asuntos_propios: '#3aaa93' };

  let startAngle = -Math.PI / 2;
  if (datos.length) {
    datos.forEach(d => {
      const pct = d.total / total;
      const endAngle = startAngle + pct * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colores[d.tipo] || '#9db4b0';
      ctx.fill();
      startAngle = endAngle;
    });
  } else {
    [{pct:.75,color:'#2e8b78'},{pct:.25,color:'#e05a5a'}].forEach(s => {
      const end = startAngle + s.pct * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,startAngle,end);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      startAngle = end;
    });
  }

  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

// ─── MINI CALENDARIO ─────────────────────────────────────
function renderMiniCal() {
  const grid = document.getElementById('mini-grid');
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();

  const meses = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('month-chip').textContent = `${meses[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const prevLast = new Date(year, month, 0).getDate();
  const total = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  for (let i = 0; i < total; i++) {
    const cell = document.createElement('div');
    cell.className = 'mini-day';
    let num;
    if (i < startDow) {
      num = prevLast - startDow + i + 1;
      cell.classList.add('other');
    } else if (i >= startDow + lastDay.getDate()) {
      num = i - startDow - lastDay.getDate() + 1;
      cell.classList.add('other');
    } else {
      num = i - startDow + 1;
      if (num === hoy.getDate()) cell.classList.add('today');
    }
    cell.textContent = num;
    grid.appendChild(cell);
  }
}

// ─── TOAST ────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── INIT ─────────────────────────────────────────────────
renderMiniCal();
cargarPendientes();
cargarAusencias();
window.addEventListener('resize', () => cargarOcupacion());
setTimeout(cargarOcupacion, 50);