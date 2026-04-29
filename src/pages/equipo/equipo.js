// ═══════════════════════════════════════════════════════
//   VacationFlow — Página Equipo
//   Conecta con el back:
//     · GET /api/users → lista todos los usuarios del equipo
//
//   Esta vista lista empleados del equipo.
//   El historial detallado de solicitudes de cada empleado
//   sigue dependiendo de endpoints que no están disponibles.
// ═══════════════════════════════════════════════════════

const API_URL = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';

// ─── PROTECCIÓN DE RUTA ───────────────────────────────
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  window.location.href = '/index.html';
}

// ─── ESTADO DE LA UI ──────────────────────────────────
let usuarios    = [];
let filtroTexto = '';
let ordenCampo  = null;
let ordenDir    = 'asc';

// ─── REFERENCIAS AL DOM ───────────────────────────────
const tbody          = document.getElementById('teamTableBody');
const searchInput    = document.getElementById('searchInput');
const emptyState     = document.getElementById('emptyState');
const activeAbsences = document.getElementById('activeAbsences');
const statTotal      = document.getElementById('statTotal');
const statAprobadas  = document.getElementById('statAprobadas');
const statPendientes = document.getElementById('statPendientes');

// ═══════════════════════════════════════════════════════
//   AL CARGAR LA PÁGINA
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // 1) Cargar usuarios del back
  await cargarUsuarios();

  // 2) Cargar días disponibles del sidebar
  await cargarDisponibilidad();

  // 3) Renderizar tabla
  render();

  // 3) Logout
  const logoutBtn = document.querySelector('a[href="/index.html"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = '/index.html';
      }
    });
  }
});

// ═══════════════════════════════════════════════════════
//   CARGAR DÍAS DISPONIBLES DEL SIDEBAR
// ═══════════════════════════════════════════════════════
async function cargarDisponibilidad() {
  try {
    // Primero obtenemos el id del usuario logueado
    const resProfile = await fetch(`${API_URL}/api/users/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resProfile.ok) return;
    const usuario = await resProfile.json();

    // Luego sus días disponibles
    const resDisp = await fetch(
      `${API_URL}/yo/disponible?usuario_id=${usuario.id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!resDisp.ok) return;
    const disp = await resDisp.json();

    const restantes = disp.dias_disponibles || 0;
    const el = document.getElementById('sidebarDays');
    const unit = document.getElementById('sidebarUnit');
    if (el) el.textContent = restantes;
    if (unit) unit.textContent = restantes === 1 ? 'día' : 'días';

  } catch (error) {
    console.warn('⚠️ No se pudo cargar la disponibilidad del sidebar:', error);
  }
}

// ═══════════════════════════════════════════════════════
//   CARGAR USUARIOS DESDE EL BACK
// ═══════════════════════════════════════════════════════
async function cargarUsuarios() {
  try {
    const res = await fetch(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('rol');
      localStorage.removeItem('userId');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('rol');
      sessionStorage.removeItem('userId');
      window.location.href = '/index.html';
      return;
    }

    if (res.status === 403) {
      window.location.href = '/src/pages/usuario/perfil_usuario.html';
      return;
    }

    if (!res.ok) throw new Error('Error al cargar usuarios');

    const data = await res.json();

    // Mapear datos del back al formato de la tabla
    usuarios = data.map(u => ({
      id:           u.id,
      nombre:       `${u.nombre} ${u.apellidos || ''}`.trim(),
      departamento: u.rol || 'Empleado',
      email:        u.email,
      desde:        '—',
      hasta:        '—',
      estado:       'Sin solicitudes'
    }));

    console.log(`✅ Equipo: ${usuarios.length} usuarios cargados`);

  } catch (error) {
    console.error('❌ Error al cargar usuarios:', error);
    usuarios = [];
  }
}

// ═══════════════════════════════════════════════════════
//   RENDER PRINCIPAL
// ═══════════════════════════════════════════════════════
function render() {
  const texto = filtroTexto.trim().toLowerCase();

  let lista = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(texto) ||
    u.departamento.toLowerCase().includes(texto) ||
    u.email.toLowerCase().includes(texto)
  );

  if (ordenCampo) {
    lista.sort((a, b) => {
      const va = valorOrden(a, ordenCampo);
      const vb = valorOrden(b, ordenCampo);
      if (va < vb) return ordenDir === 'asc' ? -1 : 1;
      if (va > vb) return ordenDir === 'asc' ?  1 : -1;
      return 0;
    });
  }

  tbody.innerHTML = '';
  lista.forEach(u => tbody.appendChild(crearFila(u)));

  emptyState.style.display = lista.length === 0 ? 'block' : 'none';

  actualizarStats();
  actualizarAusencias();
  actualizarFlechasOrden();
}

function valorOrden(u, campo) {
  switch (campo) {
    case 'name':   return u.nombre.toLowerCase();
    case 'dept':   return u.departamento.toLowerCase();
    case 'from':   return u.desde;
    case 'to':     return u.hasta;
    case 'status': return u.estado;
    default:       return '';
  }
}

// ═══════════════════════════════════════════════════════
//   CREAR FILA DE LA TABLA
// ═══════════════════════════════════════════════════════
function crearFila(u) {
  const tr = document.createElement('tr');
  tr.style.cursor = 'pointer';
  tr.title = `Ver perfil de ${u.nombre}`;
  const inicial = u.nombre.charAt(0).toUpperCase();

  tr.innerHTML = `
    <td>
      <div class="employee-cell">
        <div class="employee-avatar">${inicial}</div>
        <div>
          <span class="employee-name">${u.nombre}</span>
          <div style="font-size:11px;color:var(--text-sub);">${u.email}</div>
        </div>
      </div>
    </td>
    <td class="dept-text">${u.departamento}</td>
    <td>${u.desde}</td>
    <td>${u.hasta}</td>
    <td><span style="color:var(--gray-400);font-size:12px;">${u.estado}</span></td>
  `;

  // Al hacer clic en la fila → ir al perfil del empleado
  tr.addEventListener('click', () => {
    window.location.href = `/src/pages/jefe/veruser_jefe.html#id=${u.id}`;
  });

  return tr;
}

// ═══════════════════════════════════════════════════════
//   STATS
// ═══════════════════════════════════════════════════════
function actualizarStats() {
  statTotal.textContent      = usuarios.length;
  statAprobadas.textContent  = 0;
  statPendientes.textContent = 0;
}

function actualizarAusencias() {
  activeAbsences.innerHTML =
    '<p class="ayuda-desc" style="padding:8px 0;">No hay ausencias activas.</p>';
}

// ═══════════════════════════════════════════════════════
//   ORDENACIÓN
// ═══════════════════════════════════════════════════════
function actualizarFlechasOrden() {
  document.querySelectorAll('.profile-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === ordenCampo) {
      th.classList.add(ordenDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

document.querySelectorAll('.profile-table th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const campo = th.dataset.sort;
    if (ordenCampo === campo) {
      ordenDir = ordenDir === 'asc' ? 'desc' : 'asc';
    } else {
      ordenCampo = campo;
      ordenDir   = 'asc';
    }
    render();
  });
});

// ═══════════════════════════════════════════════════════
//   BUSCADOR
// ═══════════════════════════════════════════════════════
searchInput.addEventListener('input', e => {
  filtroTexto = e.target.value;
  render();
});
