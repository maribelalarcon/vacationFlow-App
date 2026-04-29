// ═══════════════════════════════════════════════════════
//   VacationFlow — Detalle de Solicitud (vista del jefe)
//   Conecta con:
//     · GET /api/admin/vacations/pending     → buscar la solicitud por ID
//     · GET /api/users/:id                   → datos del empleado
//     · GET /yo/disponible?usuario_id=X      → días disponibles del empleado
//     · PUT /api/admin/vacations/:id/approve → aprobar
//     · PUT /api/admin/vacations/:id/reject  → rechazar
// ═══════════════════════════════════════════════════════

const API_URL = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';

// ─── PROTECCIÓN DE RUTA ───────────────────────────────
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) window.location.href = 'index.html';

// ─── ID DE LA SOLICITUD DE LA URL ─────────────────────
const params = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const solicitudId = params.get('id') || hashParams.get('id');
if (!solicitudId) window.location.href = 'solicitudes_jefe.html';

// ─── DATOS DE LA SOLICITUD ────────────────────────────
let solicitudActual = null;

// ═══════════════════════════════════════════════════════
//   AL CARGAR
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  await cargarDetalle();
  await cargarSidebarDias();

  // Botón aprobar
  document.getElementById('btnAprobar').addEventListener('click', async () => {
    if (!confirm('¿Aprobar esta solicitud?')) return;
    await accionSolicitud('approve');
  });

  // Botón rechazar
  document.getElementById('btnRechazar').addEventListener('click', async () => {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    await accionSolicitud('reject');
  });

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        cerrarSesion();
      }
    });
  }
});

// ═══════════════════════════════════════════════════════
//   CARGAR DETALLE DE LA SOLICITUD
// ═══════════════════════════════════════════════════════
async function cargarDetalle() {
  try {
    // Cargamos todas las pendientes y buscamos la que coincide con el ID
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

    const todas = await res.json();
    solicitudActual = todas.find(s => String(s.id) === String(solicitudId));

    if (!solicitudActual) {
      alert('Solicitud no encontrada.');
      window.location.href = 'solicitudes_jefe.html';
      return;
    }

    // Normalizar campos
    const empleado = solicitudActual.empleado || {};
    solicitudActual.nombre   = `${empleado.nombre || solicitudActual.nombre || ''} ${empleado.apellidos || solicitudActual.apellidos || ''}`.trim();
    solicitudActual.desde    = solicitudActual.fecha_inicio || solicitudActual.start_date;
    solicitudActual.hasta    = solicitudActual.fecha_fin    || solicitudActual.end_date;
    solicitudActual.estado   = solicitudActual.estado || solicitudActual.status || 'pendiente';
    solicitudActual.userId   = solicitudActual.usuario_id || solicitudActual.user_id || empleado.id;
    solicitudActual.email    = empleado.email || solicitudActual.email;
    solicitudActual.rol      = empleado.rol || solicitudActual.rol;

    // Cargar disponibilidad del empleado
    let disp = null;
    try {
      const resDisp = await fetch(
        `${API_URL}/yo/disponible?usuario_id=${solicitudActual.userId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (resDisp.ok) disp = await resDisp.json();
    } catch (e) {}

    renderDetalle(solicitudActual, disp);

  } catch (error) {
    console.error('❌ Error:', error);
    alert('No se pudo cargar el detalle de la solicitud.');
  }
}

// ═══════════════════════════════════════════════════════
//   RENDERIZAR DETALLE
// ═══════════════════════════════════════════════════════
function renderDetalle(s, disp) {
  const inicial = s.nombre.charAt(0).toUpperCase();

  // Panel empleado
  document.getElementById('empAvatar').textContent  = inicial;
  document.getElementById('empNombre').textContent  = s.nombre;
  document.getElementById('empRol').textContent     = s.rol || s.email || 'Empleado';
  document.getElementById('empEmail').textContent   = s.email || '—';

  // Barra de progreso del empleado
  const total      = disp?.dias_totales     || 30;
  const consumidos = disp?.dias_consumidos  || 0;
  const restantes  = disp?.dias_disponibles || total;
  const porcentaje = total > 0 ? (consumidos / total) * 100 : 0;

  document.getElementById('empDias').textContent    = `${restantes} días`;
  document.getElementById('leaveNumber').textContent = `${restantes} días restantes`;
  document.getElementById('progressFill').style.width = `${porcentaje}%`;

  // Referencia
  document.getElementById('solRef').textContent = `Referencia: #VAC-${String(s.id).padStart(4, '0')}`;

  // Badge de estado
  const badge = document.getElementById('statusBadge');
  badge.textContent = s.estado.toUpperCase();
  badge.className = `status-badge ${s.estado.toLowerCase()}`;

  // Cards de info
  document.getElementById('solTipo').textContent  = formatearTipo(s.tipo || s.type);
  document.getElementById('solFechas').textContent = `${formatearFecha(s.desde)} — ${formatearFecha(s.hasta)}`;
  document.getElementById('solDias').textContent   = `${calcularDias(s.desde, s.hasta)} días`;

  // Comentario
  const comentario = s.comentario || s.comment;
  document.getElementById('solComentario').textContent =
    comentario ? `"${comentario}"` : 'Sin comentarios adicionales.';

  // Ocultar botones si ya no está pendiente
  if (s.estado.toLowerCase() !== 'pendiente') {
    document.getElementById('solActions').style.display = 'none';
  }

  document.title = `VacationFlow - Solicitud de ${s.nombre}`;
}

// ═══════════════════════════════════════════════════════
//   APROBAR / RECHAZAR
// ═══════════════════════════════════════════════════════
async function accionSolicitud(accion) {
  const btnAprobar  = document.getElementById('btnAprobar');
  const btnRechazar = document.getElementById('btnRechazar');
  btnAprobar.disabled  = true;
  btnRechazar.disabled = true;

  try {
    const url = `${API_URL}/api/admin/vacations/${solicitudId}/${accion}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (res.ok) {
      const msg = accion === 'approve' ? '✅ Solicitud aprobada correctamente.' : '✅ Solicitud rechazada correctamente.';
      showToast(msg);
      document.getElementById('solActions').style.display = 'none';

      // Actualizar badge de estado
      const nuevoEstado = accion === 'approve' ? 'aprobado' : 'rechazado';
      const badge = document.getElementById('statusBadge');
      badge.textContent = nuevoEstado.toUpperCase();
      badge.className = `status-badge ${nuevoEstado}`;

      // Volver a la lista después de 2 segundos
      setTimeout(() => {
        window.location.href = 'solicitudes_jefe.html';
      }, 2000);
    } else {
      showToast('❌ ' + (data.message || 'Error al procesar la solicitud.'), false);
      btnAprobar.disabled  = false;
      btnRechazar.disabled = false;
    }

  } catch (error) {
    console.error('❌ Error:', error);
    showToast('❌ No se pudo conectar con el servidor.', false);
    btnAprobar.disabled  = false;
    btnRechazar.disabled = false;
  }
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
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════
//   TOAST
// ═══════════════════════════════════════════════════════
function showToast(msg, ok = true) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.style.background = ok ? 'var(--teal-dark)' : '#8b3a2e';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════════════
//   HELPERS
// ═══════════════════════════════════════════════════════
function formatearFecha(iso) {
  if (!iso) return '—';
  const [, mes, dia] = iso.split('T')[0].split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(dia)} ${meses[parseInt(mes) - 1]}`;
}

function formatearTipo(tipo) {
  const tipos = {
    'vacaciones':      '🏖️ Vacaciones',
    'baja_medica':     '🏥 Baja Médica',
    'asuntos_propios': '📋 Asuntos Propios',
    'baja':            '🏥 Baja'
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
  localStorage.removeItem('rol');
  localStorage.removeItem('userId');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('rol');
  sessionStorage.removeItem('userId');
  window.location.href = 'index.html';
}
