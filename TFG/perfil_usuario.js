// ═══════════════════════════════════════════════════════
//   VacationFlow — Página Perfil de Usuario
//   Conecta con el back:
//     · GET /api/users/profile   → datos del usuario logueado
//     · GET /yo/disponible       → días de vacaciones disponibles
//
//   Historial y presencia del equipo: datos mock por ahora
//   (los endpoints aún no existen en el back)
// ═══════════════════════════════════════════════════════

const API_URL = 'https://vacationflow-api-production.up.railway.app';

const token = localStorage.getItem('token') || sessionStorage.getItem('token');

if (!token) {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', async () => {

  const solicitudesMock = [
    {
      desde: '2023-10-10',
      hasta: '2023-10-15',
      dias: 5,
      tipo: 'Vacaciones',
      icono: '⛱',
      estado: 'Aprobado',
      enviado: '2023-10-02'
    },
    {
      desde: '2023-11-02',
      hasta: '2023-11-03',
      dias: 2,
      tipo: 'Médica',
      icono: '💼',
      estado: 'Pendiente',
      enviado: '2023-10-18'
    }
  ];

  const presenciaEquipo = [
    { nombre: 'Elena Smith',  motivo: 'Vacaciones' },
    { nombre: 'Marco Rossi',  motivo: 'Médica' }
  ];

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
  //   5. RENDERIZAR HISTORIAL DE SOLICITUDES (mock)
  // ═══════════════════════════════════════════════════════
  renderHistorial(solicitudesMock);

  // ═══════════════════════════════════════════════════════
  //   6. RENDERIZAR PRESENCIA DEL EQUIPO (mock)
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
  window.location.href = 'index.html';
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