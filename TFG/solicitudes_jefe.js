// ═══════════════════════════════════════════════════════
//   VacationFlow — Solicitudes del Jefe
//   Conecta con:
//     · GET /api/admin/vacations/pending → solicitudes pendientes
//     · GET /api/users/profile           → días del sidebar
// ═══════════════════════════════════════════════════════

const API_URL = 'https://vacationflow-api-production.up.railway.app';

// ─── PROTECCIÓN DE RUTA ───────────────────────────────
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) window.location.href = 'index.html';

// ─── ESTADO ───────────────────────────────────────────
let solicitudes  = [];
let filtroEstado = 'todos';
let filtroTexto  = '';

// ═══════════════════════════════════════════════════════
//   AL CARGAR
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  await cargarSolicitudes();
  await cargarSidebarDias();
  render();

  // Filtros de tabs
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtroEstado = btn.dataset.estado;
      render();
    });
  });

  // Buscador
  document.getElementById('searchInput').addEventListener('input', e => {
    filtroTexto = e.target.value;
    render();
  });

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = 'index.html';
      }
    });
  }
});

// ═══════════════════════════════════════════════════════
//   CARGAR SOLICITUDES DEL BACK
// ═══════════════════════════════════════════════════════
async function cargarSolicitudes() {
  try {
    const res = await fetch(`${API_URL}/api/admin/vacations/pending`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) { cerrarSesion(); return; }
    if (res.status === 403) {
      alert('No tienes permisos de administrador.');
      window.location.href = 'perfil_usuario.html';
      return;
    }
    if (!res.ok) throw new Error('Error al cargar solicitudes');

    const data = await res.json();

    // Mapear datos del back
    // El back devuelve: { id, usuario_id, nombre, apellidos, email, tipo, fecha_inicio, fecha_fin, estado, comentario }
    solicitudes = data.map(s => ({
      id:       s.id,
      nombre:   `${s.nombre} ${s.apellidos || ''}`.trim(),
      email:    s.email,
      tipo:     s.tipo     || s.type   || 'vacaciones',
      desde:    s.fecha_inicio || s.start_date,
      hasta:    s.fecha_fin    || s.end_date,
      estado:   s.estado   || s.status || 'pendiente',
      comentario: s.comentario || s.comment || '',
      userId:   s.usuario_id  || s.user_id
    }));

    console.log(`✅ ${solicitudes.length} solicitudes cargadas`);

  } catch (error) {
    console.error('❌ Error:', error);
    solicitudes = [];
  }
}

// ═══════════════════════════════════════════════════════
//   RENDER
// ═══════════════════════════════════════════════════════
function render() {
  const texto = filtroTexto.trim().toLowerCase();

  let lista = solicitudes.filter(s => {
    const coincideTexto  = s.nombre.toLowerCase().includes(texto) || s.email.toLowerCase().includes(texto);
    const coincideEstado = filtroEstado === 'todos' || s.estado.toLowerCase() === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  const tbody     = document.getElementById('solicitudesBody');
  const emptyEl   = document.getElementById('emptyState');

  tbody.innerHTML = '';
  lista.forEach(s => tbody.appendChild(crearFila(s)));
  emptyEl.style.display = lista.length === 0 ? 'block' : 'none';

  actualizarStats();
}

// ═══════════════════════════════════════════════════════
//   CREAR FILA
// ═══════════════════════════════════════════════════════
function crearFila(s) {
  const tr      = document.createElement('tr');
  const inicial = s.nombre.charAt(0).toUpperCase();
  const dias    = calcularDias(s.desde, s.hasta);

  const claseEstado = {
    'pendiente': 'tag-pendiente',
    'aprobado':  'tag-aprobado',
    'rechazado': 'tag-rechazado'
  }[s.estado?.toLowerCase()] || 'tag-pendiente';

  tr.innerHTML = `
    <td>
      <div class="employee-cell">
        <div class="employee-avatar">${inicial}</div>
        <div>
          <div class="employee-name">${s.nombre}</div>
          <div style="font-size:11px;color:var(--text-sub);">${s.email}</div>
        </div>
      </div>
    </td>
    <td>${formatearTipo(s.tipo)}</td>
    <td>${formatearFecha(s.desde)}</td>
    <td>${formatearFecha(s.hasta)}</td>
    <td><span style="font-weight:700;">${dias}</span></td>
    <td><span class="status-tag ${claseEstado}">● ${s.estado.toUpperCase()}</span></td>
    <td>
      <a href="detalle_solicitud.html?id=${s.id}" class="btn-ver">Ver →</a>
    </td>
  `;

  return tr;
}

// ═══════════════════════════════════════════════════════
//   STATS
// ═══════════════════════════════════════════════════════
function actualizarStats() {
  document.getElementById('statTotal').textContent      = solicitudes.length;
  document.getElementById('statPendientes').textContent = solicitudes.filter(s => s.estado?.toLowerCase() === 'pendiente').length;
  document.getElementById('statAprobadas').textContent  = solicitudes.filter(s => s.estado?.toLowerCase() === 'aprobado').length;
  document.getElementById('statRechazadas').textContent = solicitudes.filter(s => s.estado?.toLowerCase() === 'rechazado').length;
}

// ═══════════════════════════════════════════════════════
//   SIDEBAR DÍAS
// ═══════════════════════════════════════════════════════
async function cargarSidebarDias() {
  try {
    const resMe = await fetch(`${API_URL}/api/users/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resMe.ok) return;
    const me = await resMe.json();

    const resDisp = await fetch(
      `${API_URL}/yo/disponible?usuario_id=${me.id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!resDisp.ok) return;
    const disp = await resDisp.json();

    const restantes = disp.dias_disponibles || 0;
    const el   = document.getElementById('sidebarDays');
    const unit = document.getElementById('sidebarUnit');
    if (el)   el.textContent   = restantes;
    if (unit) unit.textContent = restantes === 1 ? 'día' : 'días';
  } catch (e) {
    console.warn('⚠️ No se pudo cargar el sidebar');
  }
}

// ═══════════════════════════════════════════════════════
//   HELPERS
// ═══════════════════════════════════════════════════════
function formatearFecha(iso) {
  if (!iso) return '—';
  const fecha = iso.split('T')[0];
  const [año, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${año}`;
}

function formatearTipo(tipo) {
  const tipos = {
    'vacaciones':     '🏖️ Vacaciones',
    'baja_medica':    '🏥 Baja Médica',
    'asuntos_propios':'📋 Asuntos Propios',
    'baja':           '🏥 Baja'
  };
  return tipos[tipo] || tipo || '—';
}

function calcularDias(desde, hasta) {
  if (!desde || !hasta) return '—';
  const d1 = new Date(desde);
  const d2 = new Date(hasta);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}

function cerrarSesion() {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  window.location.href = 'index.html';
}