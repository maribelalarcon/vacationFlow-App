// ═══════════════════════════════════════════════════════
//   VacationFlow — Página Perfil de Usuario
//   Conecta con el back:
//     · GET /api/users/profile   → datos del usuario logueado
//     · GET /yo/disponible       → días de vacaciones disponibles
//
//   Historial del empleado:
//     · GET /api/users/history   → solicitudes propias
//
// ═══════════════════════════════════════════════════════

const API_URL = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';
const DEFAULT_AVATAR_URL = 'https://i.imgur.com/8Km9tLL.png';

const token = localStorage.getItem('token') || sessionStorage.getItem('token');

if (!token) {
  window.location.href = '/index.html';
}

document.addEventListener('DOMContentLoaded', async () => {

  let solicitudes = [];
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
  const avatarEl = document.getElementById('userAvatar');
  sincronizarVistaPerfil(usuario, avatarEl);
  avatarEl.addEventListener('error', () => {
    avatarEl.src = DEFAULT_AVATAR_URL;
  });

  configurarCambioAvatar(usuario, avatarEl);
  configurarFormularioPerfil(usuario, avatarEl);

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
  //   6. CONFIGURAR CIERRE DE SESIÓN
  // ═══════════════════════════════════════════════════════
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) cerrarSesion();
    });
  }

  console.log(`🌿 VacationFlow: Panel de ${getNombreCompleto(usuario)} cargado correctamente.`);
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

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('rol');
  localStorage.removeItem('userId');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('rol');
  sessionStorage.removeItem('userId');
  window.location.href = '/index.html';
}

function configurarFormularioPerfil(usuario, avatarEl) {
  const form = document.getElementById('profileEditForm');
  const nombreInput = document.getElementById('editNombre');
  const apellidoInput = document.getElementById('editApellido');
  const emailInput = document.getElementById('editEmail');
  const saveBtn = document.getElementById('profileSaveBtn');
  const messageEl = document.getElementById('profileFormMessage');
  const toggleBtn = document.getElementById('profileToggleBtn');

  if (!form || !nombreInput || !apellidoInput || !emailInput || !saveBtn || !messageEl || !toggleBtn) {
    return;
  }

  nombreInput.value = usuario.nombre || '';
  apellidoInput.value = usuario.apellidos || '';
  emailInput.value = usuario.email || '';

  toggleBtn.addEventListener('click', () => {
    const abierto = !form.hidden;
    form.hidden = abierto;
    toggleBtn.setAttribute('aria-expanded', String(!abierto));
    toggleBtn.textContent = abierto ? 'Modificar perfil' : 'Cerrar';

    if (!abierto) {
      nombreInput.focus();
    } else {
      limpiarMensajePerfil(messageEl);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    limpiarMensajePerfil(messageEl);

    const nombre = nombreInput.value.trim();
    const apellido = apellidoInput.value.trim();
    const email = emailInput.value.trim();

    if (!nombre || !apellido || !email) {
      mostrarMensajePerfil(messageEl, 'Completa nombre, apellido y email.', 'error');
      return;
    }

    const emailNormalizado = email.toLowerCase();

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
      const updatedUser = await persistirPerfil({
        nombre,
        apellido,
        email: emailNormalizado
      });

      Object.assign(usuario, updatedUser);
      sincronizarVistaPerfil(usuario, avatarEl);
      emailInput.value = usuario.email || emailNormalizado;
      mostrarMensajePerfil(messageEl, 'Perfil actualizado correctamente.', 'success');
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      mostrarMensajePerfil(messageEl, error.message || 'No se pudo actualizar el perfil.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar cambios';
    }
  });
}

function sincronizarVistaPerfil(usuario, avatarEl) {
  const nombreCompleto = getNombreCompleto(usuario);

  document.getElementById('userName').textContent = nombreCompleto;
  document.getElementById('userRole').textContent = usuario.rol || 'Empleado';
  document.getElementById('userJoinDate').textContent = `📅 ${usuario.email}`;
  document.title = `VacationFlow - ${nombreCompleto}`;

  avatarEl.alt = nombreCompleto;
  avatarEl.src = usuario.avatar_url || obtenerAvatarGuardado(usuario) || DEFAULT_AVATAR_URL;
}

function getNombreCompleto(usuario) {
  return `${usuario.nombre || ''} ${usuario.apellidos || ''}`.trim();
}

function mostrarMensajePerfil(element, message, type) {
  element.textContent = message;
  element.classList.remove('is-success', 'is-error');
  element.classList.add(type === 'success' ? 'is-success' : 'is-error');
}

function limpiarMensajePerfil(element) {
  element.textContent = '';
  element.classList.remove('is-success', 'is-error');
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

function configurarCambioAvatar(usuario, avatarEl) {
  const avatarInput = document.getElementById('avatarInput');
  if (!avatarInput) return;

  avatarInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecciona una imagen válida para la foto de perfil.');
      avatarInput.value = '';
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('La imagen es demasiado grande. Elige un archivo de hasta 2 MB.');
      avatarInput.value = '';
      return;
    }

    try {
      const dataUrl = await leerArchivoComoDataUrl(file);
      const avatarPersistido = await persistirAvatar(usuario, dataUrl);
      guardarAvatar(usuario, avatarPersistido);
      usuario.avatar_url = avatarPersistido;
      avatarEl.src = avatarPersistido;
    } catch (error) {
      console.error('Error al cargar avatar:', error);
      alert('No se pudo actualizar la foto de perfil.');
    } finally {
      avatarInput.value = '';
    }
  });
}

function leerArchivoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function obtenerAvatarGuardado(usuario) {
  const clave = getAvatarStorageKey(usuario);
  return localStorage.getItem(clave) || '';
}

function guardarAvatar(usuario, dataUrl) {
  const clave = getAvatarStorageKey(usuario);
  localStorage.setItem(clave, dataUrl);
}

function getAvatarStorageKey(usuario) {
  const identificador = usuario?.id || usuario?.email || 'anon';
  return `vacationflow_avatar_${identificador}`;
}

async function persistirAvatar(usuario, dataUrl) {
  try {
    const updatedUser = await persistirPerfil({ avatar_url: dataUrl });
    Object.assign(usuario, updatedUser);
    return updatedUser?.avatar_url || dataUrl;
  } catch (error) {
    console.warn('No se pudo persistir el avatar en backend, se usará almacenamiento local.', error);
    return dataUrl;
  }
}

async function persistirPerfil(payload) {
  const res = await fetch(`${API_URL}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  let data = null;
  try {
    data = await res.json();
  } catch (error) {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data?.user || data || {};
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
