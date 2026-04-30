// ═══════════════════════════════════════════════════════
//   VacationFlow — Solicitudes Jefe (solicitudes_jefe.js)
// ═══════════════════════════════════════════════════════

const BASE = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';

function getToken() {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

// ─── PROTECCIÓN: solo admin ───────────────────────────
const _token = getToken();
if (!_token) {
  window.location.replace('/index.html');
} else {
  try {
    const payload = JSON.parse(atob(_token.split('.')[1]));
    if (payload.rol !== 'admin') {
      alert('🚫 Acceso restringido: esta zona es solo para jefes.');
      window.location.replace('/src/pages/usuario/perfil_usuario.html');
    }
  } catch {
    window.location.replace('/index.html');
  }
}

// ─── COLORES AVATARES ─────────────────────────────────────
const COLORES = ['av1','av2','av3','av4','av5'];

// ─── CARGAR SOLICITUDES PENDIENTES ───────────────────────
async function cargarPendientes() {
  try {
    const res = await fetch(`${BASE}/api/admin/vacations/pending`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (res.status === 401) { window.location.replace('/index.html'); return; }
    if (res.status === 403) { window.location.replace('/src/pages/usuario/perfil_usuario.html'); return; }
    const data = await res.json();
    renderSolicitudes(data);
    actualizarBadge(data.length);
    actualizarHistorico(data.length);
  } catch (err) {
    console.error('Error cargando pendientes:', err);
    renderSolicitudes([]);
    actualizarBadge(0);
    actualizarHistorico(0);
  }
}

async function cargarPerfilManager() {
  try {
    const res = await fetch(`${BASE}/api/users/profile`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) return;
    const user = await res.json();
    const nombre = `${user.nombre || ''} ${user.apellidos || ''}`.trim() || 'Manager';
    const role = user.rol === 'admin' ? 'Administrador' : (user.rol || 'Manager');
    const nameEl = document.querySelector('.manager-name');
    const roleEl = document.querySelector('.manager-role');
    const avatarEl = document.querySelector('.manager-avatar');
    if (nameEl) nameEl.textContent = nombre;
    if (roleEl) roleEl.textContent = role;
    if (avatarEl) {
      const initials = `${(user.nombre || '')[0] || ''}${(user.apellidos || '')[0] || ''}`.toUpperCase() || 'MG';
      avatarEl.textContent = initials;
    }
  } catch (err) {
    console.warn('No se pudo cargar el perfil del manager:', err);
  }
}

function renderSolicitudes(solicitudes) {
  const grid = document.getElementById('solicitudes-grid');
  grid.innerHTML = '';

  if (!solicitudes.length) {
    grid.innerHTML = '<p class="cargando">✅ No hay solicitudes pendientes.</p>';
    return;
  }

  solicitudes.forEach((s, i) => {
    const nombre = s.empleado?.nombre || 'Empleado';
    const apellidos = s.empleado?.apellidos || '';
    const iniciales = `${nombre[0] || 'E'}${apellidos[0] || ''}`;
    const tipoClass = s.tipo === 'vacaciones' ? 'vacaciones' : s.tipo === 'baja_medica' ? 'baja' : 'asuntos';
    const tipoLabel = s.tipo === 'vacaciones' ? 'VACACIONES' : s.tipo === 'baja_medica' ? 'BAJA MÉDICA' : 'ASUNTOS PROPIOS';
    const fechaI = formatFecha(s.fecha_inicio);
    const fechaF = formatFecha(s.fecha_fin);

    const card = document.createElement('div');
    card.className = 'solicitud-card';
    card.dataset.id = s.id;
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="sol-top">
        <div class="sol-avatar ${COLORES[i % COLORES.length]}">${iniciales}</div>
        <div>
          <div class="sol-nombre">${nombre} ${apellidos}</div>
          <span class="sol-tag ${tipoClass}">${tipoLabel}</span>
        </div>
      </div>
      <div class="sol-fechas">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        ${fechaI} — ${fechaF}
        <span class="sol-dias">${s.total_dias} días</span>
      </div>
      <div class="sol-actions">
        <button class="btn-aprobar" onclick="aprobar(this, ${s.id})">Aprobar</button>
        <button class="btn-rechazar" onclick="rechazar(this, ${s.id})">Rechazar</button>
      </div>
    `;
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      openDetalle(s.id);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDetalle(s.id);
      }
    });
    grid.appendChild(card);
  });
}

function openDetalle(id) {
  window.location.href = `/src/pages/solicitud/detalle_solicitud.html#id=${id}`;
}

function actualizarBadge(n) {
  document.getElementById('acciones-badge').textContent = `${n} Acciones Requeridas`;
}

function actualizarHistorico(pendientes) {
  document.getElementById('historico-sub').textContent =
    `${pendientes} solicitudes pendientes de revisión este mes.`;
}

// ─── HELPER FECHA ─────────────────────────────────────────
function formatFecha(str) {
  if (!str) return '';
  const d = parseDateOnly(str);
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d.getDate()} ${meses[d.getMonth()]}`;
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
      btn.closest('.solicitud-card').classList.add('aprobada');
      btn.disabled = true;
      btn.closest('.solicitud-card').querySelector('.btn-rechazar').disabled = true;
      showToast('✅ Solicitud aprobada correctamente.');
    } else {
      showToast('⚠️ ' + data.message);
    }
  } catch {
    showToast('❌ No se pudo conectar con el servidor.');
  }
}

function parseDateOnly(value) {
  const [year, month, day] = String(value).split('T')[0].split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
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
      btn.closest('.solicitud-card').classList.add('rechazada');
      btn.disabled = true;
      btn.closest('.solicitud-card').querySelector('.btn-aprobar').disabled = true;
      showToast('❌ Solicitud rechazada.');
    } else {
      showToast('⚠️ ' + data.message);
    }
  } catch {
    showToast('❌ No se pudo conectar con el servidor.');
  }
}

// ─── CALENDARIO ───────────────────────────────────────────
const eventos = [];
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const hoyInicio = new Date();
let currentYear  = hoyInicio.getFullYear();
let currentMonth = hoyInicio.getMonth();

function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const label = document.getElementById('cal-month');
  grid.innerHTML = '';
  label.textContent = `${MESES_ES[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay  = new Date(currentYear, currentMonth + 1, 0);
  const today    = new Date();
  let startDow   = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const prevLast   = new Date(currentYear, currentMonth, 0).getDate();
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    let dayNum, cellDate;

    if (i < startDow) {
      dayNum = prevLast - startDow + i + 1;
      cellDate = new Date(currentYear, currentMonth - 1, dayNum);
      cell.classList.add('other-month');
    } else if (i >= startDow + lastDay.getDate()) {
      dayNum = i - startDow - lastDay.getDate() + 1;
      cellDate = new Date(currentYear, currentMonth + 1, dayNum);
      cell.classList.add('other-month');
    } else {
      dayNum = i - startDow + 1;
      cellDate = new Date(currentYear, currentMonth, dayNum);
    }

    if (
      cellDate.getDate() === today.getDate() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getFullYear() === today.getFullYear()
    ) cell.classList.add('today');

    const numEl = document.createElement('div');
    numEl.className = 'day-num';
    numEl.textContent = cellDate.getDate();
    cell.appendChild(numEl);

    eventos.forEach(ev => {
      const ini = new Date(ev.inicio); ini.setHours(0,0,0,0);
      const fin = new Date(ev.fin);   fin.setHours(0,0,0,0);
      cellDate.setHours(0,0,0,0);
      if (cellDate >= ini && cellDate <= fin) {
        const bar = document.createElement('div');
        bar.className = `event-bar ${ev.tipo}`;
        bar.textContent = ev.nombreCorto || ev.nombre;
        bar.title = `${ev.nombre}: ${formatFecha(ev.inicio)} — ${formatFecha(ev.fin)}`;
        cell.appendChild(bar);
      }
    });

    grid.appendChild(cell);
  }
}

async function cargarCalendario() {
  try {
    const res = await fetch(
      `${BASE}/api/admin/calendar?anio=${currentYear}&mes=${currentMonth + 1}`,
      { headers: { 'Authorization': `Bearer ${getToken()}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    eventos.length = 0;
    (data.eventos || []).forEach(e => {
      eventos.push({
        nombre: e.empleado?.nombre || 'Empleado',
        nombreCorto: (e.empleado?.nombre || 'Empleado').trim().split(/\s+/)[0],
        tipo: e.tipo === 'vacaciones' ? 'annual' : 'sick',
        inicio: e.fecha_inicio.slice(0, 10),
        fin: e.fecha_fin.slice(0, 10)
      });
    });
  } catch { eventos.length = 0; }
  renderCalendar();
}

document.getElementById('prev-btn').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  cargarCalendario();
});
document.getElementById('next-btn').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  cargarCalendario();
});

// ─── TOAST ────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function setupMobileMenu() {
  const body = document.body;
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const closeBtn = document.getElementById('sidebarCloseBtn');
  const overlay = document.getElementById('menuOverlay');
  const navLinks = document.querySelectorAll('.sidebar .nav-item, .sidebar .nav-bottom-item, .sidebar .sidebar-logo');

  if (!toggleBtn || !closeBtn || !overlay) return;

  const setOpen = (open) => {
    body.classList.toggle('menu-open', open);
    toggleBtn.setAttribute('aria-expanded', String(open));
    overlay.hidden = !open;
  };

  toggleBtn.addEventListener('click', () => setOpen(!body.classList.contains('menu-open')));
  closeBtn.addEventListener('click', () => setOpen(false));
  overlay.addEventListener('click', () => setOpen(false));

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 960) setOpen(false);
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) setOpen(false);
  });
}

// ─── INIT ─────────────────────────────────────────────────
setupMobileMenu();
cargarPerfilManager();
cargarPendientes();
cargarCalendario();
