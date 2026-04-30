const API_URL = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';

const token = localStorage.getItem('token') || sessionStorage.getItem('token');
const rol = (localStorage.getItem('rol') || sessionStorage.getItem('rol') || '').trim().toLowerCase();

if (!token) {
  window.location.href = '/index.html';
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const hoy = new Date();
let currentYear = hoy.getFullYear();
let currentMonth = hoy.getMonth();
let eventos = [];
let resumen = { ausencias_en_mes: 0, dias_propios_en_mes: 0 };
let ausenciasMes = [];

document.addEventListener('DOMContentLoaded', async () => {
  configurarVistaSegunRol();
  await cargarCalendario();
  renderCalendar();
  renderPanelDerecho();

  document.getElementById('prev-btn').addEventListener('click', async () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    await cargarCalendario();
    renderCalendar();
    renderPanelDerecho();
  });

  document.getElementById('next-btn').addEventListener('click', async () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    await cargarCalendario();
    renderCalendar();
    renderPanelDerecho();
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('rol');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('rol');
        sessionStorage.removeItem('userId');
        window.location.href = '/index.html';
      }
    });
  }
});

function configurarVistaSegunRol() {
  const viewLabel = document.getElementById('calendarViewLabel');
  const title = document.getElementById('calendarTitle');
  const subtitle = document.getElementById('calendarSubtitle');
  const teamPanelTitle = document.getElementById('teamPanelTitle');
  const coverageTitle = document.querySelector('.coverage-title');
  const coverageSub = document.querySelector('.coverage-sub');
  const coverageLink = document.querySelector('.report-btn');

  if (rol === 'admin') {
    viewLabel.textContent = 'Vista de equipo';
    title.textContent = 'Calendario';
    subtitle.textContent = 'Visualiza las ausencias registradas del equipo y detecta solapamientos durante el mes.';
    teamPanelTitle.textContent = 'Ausencias del mes';
    coverageTitle.textContent = 'Planifica con vision de equipo.';
    coverageSub.textContent = 'Visualiza ausencias y bajas para anticiparte y mantener la cobertura.';
    coverageLink.textContent = 'GESTIONAR SOLICITUDES →';
    coverageLink.href = '/src/pages/jefe/solicitud/solicitudes_jefe.html';
    return;
  }

  viewLabel.textContent = 'Mi calendario';
  title.textContent = 'Calendario';
  subtitle.textContent = 'Consulta tus vacaciones pendientes o aprobadas y revisa cuando habra ausencias en el equipo.';
  teamPanelTitle.textContent = 'Equipo con ausencias';
  coverageTitle.textContent = 'Organiza tus descansos con contexto.';
  coverageSub.textContent = 'Revisa solapamientos del mes antes de enviar una nueva solicitud.';
  coverageLink.textContent = 'NUEVA SOLICITUD →';
  coverageLink.href = '/src/pages/solicitud/solicitar.html';
}

async function cargarCalendario() {
  try {
    const url = `${API_URL}/api/calendario?anio=${currentYear}&mes=${currentMonth + 1}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.warn(`No se pudieron cargar los datos del calendario (HTTP ${res.status}).`);
      eventos = [];
      resumen = { ausencias_en_mes: 0, dias_propios_en_mes: 0 };
      ausenciasMes = [];
      return;
    }

    const data = await res.json();
    const lista = Array.isArray(data.eventos) ? data.eventos : [];

    eventos = lista.map((ev) => {
      const nombre = ev.nombre || ev.empleado?.nombre || '';
      const apellidos = ev.apellidos || ev.empleado?.apellidos || '';

      return {
        id: ev.id,
        nombre: `${nombre} ${apellidos}`.trim() || 'Sin nombre',
        nombreCorto: nombre.trim().split(/\s+/)[0] || 'Empleado',
        tipo: mapearTipo(ev.tipo || ev.type),
        inicio: parseDateOnly(ev.fecha_inicio || ev.start_date),
        fin: parseDateOnly(ev.fecha_fin || ev.end_date),
        esPropia: Boolean(ev.es_propia)
      };
    });

    resumen = data.resumen || { ausencias_en_mes: 0, dias_propios_en_mes: 0 };
    ausenciasMes = Array.isArray(data.quienes_fuera) ? data.quienes_fuera : [];
  } catch (error) {
    console.warn('Error al cargar calendario:', error);
    eventos = [];
    resumen = { ausencias_en_mes: 0, dias_propios_en_mes: 0 };
    ausenciasMes = [];
  }
}

function mapearTipo(tipo) {
  switch (tipo) {
    case 'vacaciones':
      return 'annual';
    case 'baja_medica':
    case 'baja':
      return 'sick';
    case 'asuntos_propios':
      return 'holiday';
    default:
      return 'annual';
  }
}

function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const label = document.getElementById('month-label');
  grid.innerHTML = '';

  label.textContent = `${MESES[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const todayDate = new Date();

  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day';

    let dayNum;
    let cellDate;

    if (i < startDow) {
      dayNum = prevMonthLast - startDow + i + 1;
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
      cellDate.getDate() === todayDate.getDate() &&
      cellDate.getMonth() === todayDate.getMonth() &&
      cellDate.getFullYear() === todayDate.getFullYear()
    ) {
      cell.classList.add('today');
    }

    const numEl = document.createElement('div');
    numEl.className = 'day-num';
    numEl.textContent = cellDate.getDate();
    cell.appendChild(numEl);

    const cellStart = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());

    eventos.forEach((ev) => {
      if (!ev.inicio || !ev.fin) {
        return;
      }

      if (cellStart >= ev.inicio && cellStart <= ev.fin) {
        const bar = document.createElement('div');
        bar.className = `event-bar ${ev.tipo}${ev.esPropia ? ' own-event' : ''}`;

        const inicioStr = formatFecha(ev.inicio);
        const finStr = formatFecha(ev.fin);
        bar.textContent = ev.esPropia ? 'Tu ausencia' : (ev.nombreCorto || ev.nombre);
        bar.title = `${ev.nombre}: ${inicioStr} - ${finStr}`;

        cell.appendChild(bar);
      }
    });

    grid.appendChild(cell);
  }
}

function renderPanelDerecho() {
  const badge = document.getElementById('teamBadge');
  const list = document.getElementById('teamList');
  const subtitle = document.getElementById('calendarSubtitle');
  const totalAusencias = Number(resumen.ausencias_en_mes || 0);
  const diasPropios = Number(resumen.dias_propios_en_mes || 0);

  if (rol === 'admin') {
    subtitle.textContent = totalAusencias > 0
      ? `Hay ${totalAusencias} ausencias registradas en ${MESES[currentMonth].toLowerCase()} de ${currentYear}.`
      : `No hay ausencias registradas en ${MESES[currentMonth].toLowerCase()} de ${currentYear}.`;
  } else {
    const base = totalAusencias > 0
      ? `Tu equipo tiene ${totalAusencias} ausencias registradas en ${MESES[currentMonth].toLowerCase()}.`
      : `No hay ausencias registradas en tu equipo durante ${MESES[currentMonth].toLowerCase()}.`;
    subtitle.textContent = diasPropios > 0
      ? `${base} Tus dias propios solicitados en el mes: ${diasPropios}.`
      : base;
  }

  const items = dedupeAusenciasMes(ausenciasMes).slice(0, 6);
  badge.textContent = String(items.length);
  list.innerHTML = '';

  if (!items.length) {
    list.innerHTML = '<p style="font-size:12.5px; color: var(--text-sub);">No hay ausencias registradas este mes.</p>';
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'team-member';

    const avatar = document.createElement('div');
    avatar.className = `avatar av${(index % 5) + 1}`;
    avatar.textContent = getInitials(item.nombre, item.apellidos);

    const info = document.createElement('div');
    info.className = 'member-info';

    const name = document.createElement('div');
    name.className = 'member-name';
    name.textContent = `${item.nombre || ''} ${item.apellidos || ''}`.trim() || 'Sin nombre';

    const meta = document.createElement('div');
    meta.className = 'member-role';
    meta.textContent = `${labelTipo(item.tipo)} · ${formatFecha(parseDateOnly(item.fecha_inicio))} - ${formatFecha(parseDateOnly(item.fecha_fin))}`;

    info.appendChild(name);
    info.appendChild(meta);

    const dot = document.createElement('span');
    dot.className = 'status-dot away';

    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(dot);
    list.appendChild(row);
  });
}

function dedupeAusenciasMes(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = [
      item.usuario_id,
      item.tipo,
      item.fecha_inicio,
      item.fecha_fin
    ].join(':');

    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function parseDateOnly(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatFecha(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 'Fecha sin definir';
  }
  return `${date.getDate()} ${MESES_CORTOS[date.getMonth()]}`;
}

function labelTipo(tipo) {
  switch (tipo) {
    case 'vacaciones':
      return 'Vacaciones';
    case 'baja_medica':
    case 'baja':
      return 'Baja medica';
    case 'asuntos_propios':
      return 'Asuntos propios';
    default:
      return 'Ausencia';
  }
}

function getInitials(nombre, apellidos) {
  const texto = `${nombre || ''} ${apellidos || ''}`.trim();
  if (!texto) {
    return '??';
  }
  return texto
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || '')
    .join('');
}
