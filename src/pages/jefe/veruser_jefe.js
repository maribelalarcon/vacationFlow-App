// ═══════════════════════════════════════════════════════
//   VacationFlow — Perfil Empleado (vista del manager)
//   Carga los datos del empleado cuyo ID viene en la URL:
//     perfil_empleado.html?id=3
//
//   Endpoints usados:
//     · GET /api/users/:id          → datos del empleado
//     · GET /yo/disponible?usuario_id=X → días disponibles
// ═══════════════════════════════════════════════════════

const API_URL = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';

// ─── PROTECCIÓN DE RUTA ───────────────────────────────
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  window.location.href = '/index.html';
}

// ─── OBTENER ID DEL EMPLEADO DE LA URL ────────────────
// La URL será: perfil_empleado.html?id=3
const params = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const empleadoId = params.get('id') || hashParams.get('id');

if (!empleadoId) {
  // Si no hay ID en la URL → volver al equipo
  window.location.href = '/src/pages/equipo/equipo.html';
}

// ═══════════════════════════════════════════════════════
//   AL CARGAR LA PÁGINA
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // 1) Cargar datos del empleado
  let empleado     = null;
  let disponibilidad = null;
  let solicitudes = [];

  try {
    const resEmp = await fetch(`${API_URL}/api/users/${empleadoId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (resEmp.status === 401) { cerrarSesion(); return; }
    if (resEmp.status === 403) {
      window.location.href = '/src/pages/usuario/perfil_usuario.html';
      return;
    }
    if (resEmp.status === 404) {
      alert('Empleado no encontrado.');
      window.location.href = '/src/pages/equipo/equipo.html';
      return;
    }
    if (!resEmp.ok) throw new Error('Error al cargar empleado');

    empleado = await resEmp.json();
    console.log('✅ Empleado cargado:', empleado);

  } catch (error) {
    console.error('❌ Error:', error);
    alert('No se pudo cargar el perfil del empleado.');
    return;
  }

  // 2) Cargar disponibilidad del empleado
  try {
    const resDisp = await fetch(
      `${API_URL}/yo/disponible?usuario_id=${empleadoId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (resDisp.ok) {
      disponibilidad = await resDisp.json();
    }
  } catch (e) {
    console.warn('⚠️ No se pudo cargar disponibilidad');
  }

  // 3) Cargar solicitudes pendientes visibles para manager
  try {
    const resSolicitudes = await fetch(`${API_URL}/api/admin/vacations/pending`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (resSolicitudes.ok) {
      const todas = await resSolicitudes.json();
      solicitudes = todas.filter(s =>
        String(s.usuario_id || s.user_id || s.empleado?.id) === String(empleadoId)
      );
    }
  } catch (e) {
    console.warn('⚠️ No se pudo cargar el historial de solicitudes del empleado');
  }

  // 4) Cargar días del manager en el sidebar
  await cargarSidebarDias();

  // 5) Renderizar perfil del empleado
  renderPerfil(empleado, disponibilidad, solicitudes);

  // 6) Logout
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
//   RENDERIZAR PERFIL DEL EMPLEADO
// ═══════════════════════════════════════════════════════
function renderPerfil(emp, disp, solicitudes) {
  const nombreCompleto = `${emp.nombre} ${emp.apellidos || ''}`.trim();
  const inicial        = nombreCompleto.charAt(0).toUpperCase();

  // Cabecera
  document.getElementById('empNombre').textContent    = nombreCompleto;
  document.getElementById('empRol').textContent       = emp.rol || 'Empleado';
  document.getElementById('empEmail').textContent     = emp.email || '';
  document.getElementById('avatarInitials').textContent = inicial;
  document.title = `VacationFlow - ${nombreCompleto}`;

  // Stats de disponibilidad
  const total      = disp?.dias_totales     || 0;
  const consumidos = disp?.dias_consumidos  || 0;
  const pendientes = disp?.dias_pendientes  || solicitudes.filter(s => (s.estado || '').toLowerCase() === 'pendiente').length;

  document.getElementById('statTotal').textContent      = total;
  document.getElementById('statConsumidos').textContent = consumidos;
  document.getElementById('statPendientes').textContent = pendientes;

  renderHistorial(solicitudes);

  const proxima = solicitudes
    .filter(s => (s.estado || '').toLowerCase() === 'pendiente')
    .sort((a, b) => parseDateOnly(a.fecha_inicio) - parseDateOnly(b.fecha_inicio))[0] || null;
  renderProximoDescanso(proxima);
}

// ═══════════════════════════════════════════════════════
//   HISTORIAL DE SOLICITUDES
//   Se muestra con las solicitudes pendientes visibles para manager.
// ═══════════════════════════════════════════════════════
function renderHistorial(solicitudes) {
  const tbody     = document.getElementById('historyTableBody');
  const emptyHist = document.getElementById('historyEmpty');

  if (!solicitudes || solicitudes.length === 0) {
    emptyHist.style.display = 'block';
    tbody.innerHTML = '';
    return;
  }

  emptyHist.style.display = 'none';
  tbody.innerHTML = solicitudes.map(s => {
    const claseEstado = {
      'aprobado':  'tag-aprobado',
      'pendiente': 'tag-pendiente',
      'rechazado': 'tag-rechazado'
    }[s.estado?.toLowerCase()] || 'tag-pendiente';

    const dias = calcularDias(s.fecha_inicio, s.fecha_fin);

    return `
      <tr>
        <td>
          <div class="tipo-name">${formatearRango(s.fecha_inicio, s.fecha_fin)}</div>
          <div class="tipo-desc-small">Enviado el ${formatearFechaCorta(s.created_at || s.fecha_inicio)}</div>
        </td>
        <td><span class="days-badge">${dias}</span></td>
        <td class="tipo-name">${formatearTipo(s.tipo) || '—'}</td>
        <td><span class="status-tag ${claseEstado}">● ${(s.estado || '').toUpperCase()}</span></td>
        <td><a class="btn-accion" href="/src/pages/solicitud/detalle_solicitud.html#id=${s.id}" title="Ver detalle">Ver</a></td>
      </tr>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════
//   PRÓXIMO DESCANSO
// ═══════════════════════════════════════════════════════
function renderProximoDescanso(solicitud) {
  const cont = document.getElementById('proximoDescanso');
  if (!solicitud) {
    cont.innerHTML = '<p class="proximo-empty">No hay próximas vacaciones aprobadas.</p>';
    return;
  }
  const dias = calcularDias(solicitud.fecha_inicio, solicitud.fecha_fin);
  cont.innerHTML = `
    <div class="proximo-item">
      <div class="proximo-icon">🏖️</div>
      <div>
        <div class="proximo-fechas">${formatearRango(solicitud.fecha_inicio, solicitud.fecha_fin)}</div>
        <div class="proximo-tipo">${solicitud.tipo || 'Vacaciones'}</div>
      </div>
      <span class="proximo-dias">${dias} días</span>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
//   DÍAS DEL MANAGER EN EL SIDEBAR
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
//   CERRAR SESIÓN
// ═══════════════════════════════════════════════════════
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('rol');
  localStorage.removeItem('userId');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('rol');
  sessionStorage.removeItem('userId');
  window.location.href = '/index.html';
}

// ═══════════════════════════════════════════════════════
//   HELPERS DE FECHAS
// ═══════════════════════════════════════════════════════
function formatearFechaCorta(iso) {
  if (!iso) return '—';
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const [, mes, dia] = iso.split('T')[0].split('-');
  return `${parseInt(dia, 10)} ${meses[parseInt(mes, 10) - 1]}`;
}

function formatearRango(desde, hasta) {
  if (!desde || !hasta) return '—';
  const año = hasta.split('T')[0].split('-')[0];
  return `${formatearFechaCorta(desde)} – ${formatearFechaCorta(hasta)}, ${año}`;
}

function calcularDias(desde, hasta) {
  if (!desde || !hasta) return 0;
  const d1 = parseDateOnly(desde);
  const d2 = parseDateOnly(hasta);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}

function parseDateOnly(value) {
  const [year, month, day] = String(value).split('T')[0].split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatearTipo(tipo) {
  const tipos = {
    vacaciones: 'Vacaciones',
    baja_medica: 'Baja médica',
    asuntos_propios: 'Asuntos propios'
  };
  return tipos[tipo] || tipo || '—';
}
