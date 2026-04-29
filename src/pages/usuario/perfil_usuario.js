// ═══════════════════════════════════════════════════════
//   VacationFlow — Página Perfil de Usuario
//   Conecta con el back:
//     · GET /api/users/profile   → datos del usuario logueado
//     · GET /yo/disponible       → días de vacaciones disponibles
//
//   Historial del empleado:
//     · GET /api/users/history   → solicitudes propias
//
//   Presencia del equipo sigue pendiente de endpoints específicos.
// ═══════════════════════════════════════════════════════

const API_URL = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';

const token = localStorage.getItem('token') || sessionStorage.getItem('token');

if (!token) {
  window.location.href = '/index.html';
}

document.addEventListener('DOMContentLoaded', async () => {

  let solicitudes = [];
  const presenciaEquipo = [];
  const historyEmpty = document.getElementById('historyEmpty');

  // ═══════════════════════════════════════════════════════
  //   1. CARGAR DATOS DEL USUARIO DESDE EL BACK
  // ═══════════════════════════════════════════════════════
  let usuario = null;
  let disponibilidad = null;

  try {
    const resProfile = await fetch(`${API_URL}/api/users/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (resProfile.status === 401) {
      cerrarSesion();
      return;
    }

    if (!resProfile.ok) throw new Error('Error al cargar el perfil');

    usuario = await resProfile.json();

    // ✅ CORREGIDO: ahora se envía el token para que el back sepa quién eres
    const resDisp = await fetch(`${API_URL}/yo/disponible`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (resDisp.ok) {
      disponibilidad = await resDisp.json();
    } else {
      disponibilidad = { dias_totales: 30, dias_consumidos: 0, dias_disponibles: 30 };
    }

    const resHistory = await fetch(`${API_URL}/api/users/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (resHistory.ok) {
      const historyData = await resHistory.json();
      solicitudes = normalizarSolicitudes(historyData);
    } else {
      solicitudes = [];
    }

  } catch (error) {
    console.error('Error al cargar datos del usuario:', error);
    alert('No se pudieron cargar tus datos. Inténtalo de nuevo.');
    return;
  }

  // ═══════════════════════════════════════════════════════
  //   2. RENDERIZAR DATOS DEL USUARIO EN LA CABECERA
  // ═══════════════════════════════════════════════════════
  const nombreCompleto = `${usuario.nombre} ${usuario.apellidos || ''}`.trim();

  document.getElementById('userName').textContent = nombreCompleto;
  document.getElementById('userRole').textContent = usuario.rol || 'Empleado';
  document.getElementById('userJoinDate').textContent = `📅 ${usuario.email}`;
  document.title = `VacationFlow - ${nombreCompleto}`;

  const avatarEl = document.getElementById('userAvatar');
  avatarEl.alt = nombreCompleto;

  // ═══════════════════════════════════════════════════════
  //   3. RENDERIZAR STATS DE DISPONIBILIDAD
  // ═══════════════════════════════════════════════════════
  const cuota      = disponibilidad.dias_totales || 0;
  const consumidos = disponibilidad.dias_consumidos || 0;
  const restantes  = disponibilidad.dias_disponibles || 0;

  document.getElementById('statCuota').textContent      = cuota;
  document.getElementById('statConsumidos').textContent = consumidos;
  document.getElementById('statRestantes').textContent  = restantes;

  document.getElementById('sidebarDays').textContent = restantes;
  document.getElementById('sidebarUnit').textContent = restantes === 1 ? 'día' : 'días';

  // ═══════════════════════════════════════════════════════
  //   4. BARRA DE PROGRESO ANIMADA
  // ═══════════════════════════════════════════════════════
  const porcentaje = cuota > 0 ? Math.round((consumidos / cuota) * 100) : 0;
  const barFill    = document.getElementById('progressBarFill');
  const percentEl  = document.getElementById('progressPercent');
  const subEl      = document.getElementById('progressSub');

  subEl.textContent     = `${consumidos} de ${cuota} días usados`;
  percentEl.textContent = `${porcentaje}%`;

  setTimeout(() => {
    barFill.style.width = `${porcentaje}%`;
  }, 100);

  if (porcentaje >= 75) {
    barFill.classList.add('warning');
    percentEl.style.color = '#f39c12';
  }

  // ═══════════════════════════════════════════════════════
  //   5. RENDERIZAR HISTORIAL DE SOLICITUDES
  // ═══════════════════════════════════════════════════════
  renderHistorial(solicitudes);

  // ═══════════════════════════════════════════════════════
  //   6. RENDERIZAR PRESENCIA DEL EQUIPO
  // ═══════════════════════════════════════════════════════
  renderPresenciaEquipo(presenciaEquipo);

  // ═══════════════════════════════════════════════════════
  //   7. CONFIGURAR CIERRE DE SESIÓN
  // ═══════════════════════════════════════════════════════
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) cerrarSesion();
    });
  }

  console.log(`🌿 VacationFlow: Panel de ${nombreCompleto} cargado correctamente.`);
  console.log(`   Días restantes: ${restantes}/${cuota}`);
});

// ═══════════════════════════════════════════════════════
//   FUNCIONES AUXILIARES
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
      'Aprobado':  'tag-aprobado',
      'Pendiente': 'tag-pendiente',
      'Rechazado': 'tag-rechazado'
    }[s.estado] || 'tag-pendiente';

    return `
      <tr>
        <td>
          <div class="tipo-name">${formatearRango(s.desde, s.hasta)}</div>
          <div class="tipo-desc">Enviado el ${formatearFechaCorta(s.enviado)}</div>
        </td>
        <td><span class="days-badge">${s.dias}</span></td>
        <td class="tipo-name">${s.icono} ${s.tipo}</td>
        <td>
          <span class="status-tag ${claseEstado}">● ${s.estado.toUpperCase()}</span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPresenciaEquipo(lista) {
  const cont = document.getElementById('teamPresence');
  if (!lista || lista.length === 0) {
    cont.innerHTML = '<p class="ayuda-desc">No hay datos de presencia del equipo disponibles.</p>';
    return;
  }
  cont.innerHTML = lista.map(p => `
    <div class="ayuda-item">
      <div class="ayuda-icon">${p.nombre.charAt(0).toUpperCase()}</div>
      <div>
        <p class="ayuda-name">${p.nombre}</p>
        <p class="ayuda-desc">${p.motivo}</p>
      </div>
    </div>
  `).join('');
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('rol');
  localStorage.removeItem('userId');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('rol');
  sessionStorage.removeItem('userId');
  window.location.href = '/index.html';
}

function formatearFechaCorta(iso) {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const [año, mes, dia] = iso.split('-');
  return `${parseInt(dia, 10)} ${meses[parseInt(mes, 10) - 1]}`;
}

function formatearRango(desde, hasta) {
  const añoHasta = hasta.split('-')[0];
  return `${formatearFechaCorta(desde)} – ${formatearFechaCorta(hasta)}, ${añoHasta}`;
}

function normalizarSolicitudes(rows) {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const desde = soloFecha(row.fecha_inicio);
    const hasta = soloFecha(row.fecha_fin);
    const dias = calcularDias(desde, hasta);
    const tipo = mapTipoLabel(row.tipo);
    const enviado = soloFecha(row.created_at) || desde;

    return {
      id: row.id,
      desde,
      hasta,
      enviado,
      dias,
      tipo: tipo.label,
      icono: tipo.icono,
      estado: capitalizarEstado(row.estado),
    };
  });
}

function soloFecha(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function calcularDias(desde, hasta) {
  if (!desde || !hasta) return 0;
  const inicio = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);
  const diff = fin.getTime() - inicio.getTime();
  return Number.isFinite(diff) ? Math.floor(diff / 86400000) + 1 : 0;
}

function mapTipoLabel(tipo) {
  if (tipo === 'vacaciones') return { label: 'Vacaciones', icono: '🏖️' };
  if (tipo === 'baja_medica') return { label: 'Baja médica', icono: '🏥' };
  if (tipo === 'asuntos_propios') return { label: 'Asuntos propios', icono: '📋' };
  return { label: tipo || 'Solicitud', icono: '📄' };
}

function capitalizarEstado(estado) {
  if (!estado) return 'Pendiente';
  return estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
}
