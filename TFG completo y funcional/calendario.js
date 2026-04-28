// ═══════════════════════════════════════════════════════
//   VacationFlow — Calendario
//   · Protección de ruta con token
//   · Arranca en el mes actual
//   · Carga eventos del back (GET /api/admin/calendar?anio=YYYY&mes=MM)
//   · Si no hay eventos del back → calendario vacío (sin datos fake)
//   · Logout funcional
// ═══════════════════════════════════════════════════════

const API_URL = 'https://vacationflow-api-production.up.railway.app';

// ─── PROTECCIÓN DE RUTA ───────────────────────────────
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  window.location.href = 'index.html';
}

// ─── MESES EN ESPAÑOL ─────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// ─── ESTADO DEL CALENDARIO ────────────────────────────
const hoy          = new Date();
let currentYear    = hoy.getFullYear();   // año actual
let currentMonth   = hoy.getMonth();      // mes actual (0-based)
let eventos        = [];                  // eventos cargados del back

// ═══════════════════════════════════════════════════════
//   AL CARGAR LA PÁGINA
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // 1) Cargar eventos del back para el mes actual
  await cargarEventos();

  // 2) Renderizar el calendario
  renderCalendar();

  // 3) Navegación entre meses (ahora también recarga eventos del nuevo mes)
  document.getElementById('prev-btn').addEventListener('click', async () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    await cargarEventos();
    renderCalendar();
  });

  document.getElementById('next-btn').addEventListener('click', async () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    await cargarEventos();
    renderCalendar();
  });

  // 4) Logout
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
//   CARGAR EVENTOS DESDE EL BACK
// ═══════════════════════════════════════════════════════
async function cargarEventos() {
  try {
    // El endpoint exige ?anio= y ?mes= (mes 1-12)
    const url = `${API_URL}/api/admin/calendar?anio=${currentYear}&mes=${currentMonth + 1}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();

      // El back devuelve: { periodo, eventos: [...] }
      // Cada evento: { id, referencia, empleado:{nombre,apellidos,...}, tipo, estado, fecha_inicio, fecha_fin, ... }
      const lista = Array.isArray(data) ? data : (data.eventos || []);

      eventos = lista.map(ev => {
        const nombre    = ev.empleado?.nombre    || ev.nombre    || '';
        const apellidos = ev.empleado?.apellidos || ev.apellidos || '';
        return {
          nombre: `${nombre} ${apellidos}`.trim() || 'Sin nombre',
          tipo:   mapearTipo(ev.tipo || ev.type),
          inicio: ev.fecha_inicio || ev.start_date,
          fin:    ev.fecha_fin    || ev.end_date
        };
      });

      console.log(`✅ Calendario: ${eventos.length} eventos cargados para ${MESES[currentMonth]} ${currentYear}`);
    } else if (res.status === 403) {
      console.warn('⚠️ Sin permisos para ver el calendario de equipo.');
      eventos = [];
    } else if (res.status === 400) {
      console.warn('⚠️ Parámetros inválidos al pedir el calendario.');
      eventos = [];
    } else {
      console.warn(`⚠️ No se pudieron cargar los eventos (HTTP ${res.status}).`);
      eventos = [];
    }
  } catch (error) {
    console.warn('⚠️ Error al cargar eventos:', error);
    eventos = [];
  }
}

// Mapea el tipo del back al tipo CSS del calendario
function mapearTipo(tipo) {
  switch (tipo) {
    case 'vacaciones':      return 'annual';
    case 'baja_medica':
    case 'baja':            return 'sick';
    case 'asuntos_propios': return 'holiday';
    default:                return 'annual';
  }
}

// ═══════════════════════════════════════════════════════
//   RENDERIZAR CALENDARIO
// ═══════════════════════════════════════════════════════
function renderCalendar() {
  const grid  = document.getElementById('cal-grid');
  const label = document.getElementById('month-label');
  grid.innerHTML = '';

  label.textContent = `${MESES[currentMonth]} ${currentYear}`;

  const firstDay  = new Date(currentYear, currentMonth, 1);
  const lastDay   = new Date(currentYear, currentMonth + 1, 0);
  const todayDate = new Date();

  // Ajustar día de la semana (Lun=0 ... Dom=6)
  let startDow = firstDay.getDay();
  startDow = (startDow === 0) ? 6 : startDow - 1;

  const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();
  const totalCells    = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day';

    let dayNum, cellDate;

    if (i < startDow) {
      dayNum   = prevMonthLast - startDow + i + 1;
      cellDate = new Date(currentYear, currentMonth - 1, dayNum);
      cell.classList.add('other-month');
    } else if (i >= startDow + lastDay.getDate()) {
      dayNum   = i - startDow - lastDay.getDate() + 1;
      cellDate = new Date(currentYear, currentMonth + 1, dayNum);
      cell.classList.add('other-month');
    } else {
      dayNum   = i - startDow + 1;
      cellDate = new Date(currentYear, currentMonth, dayNum);
    }

    // ¿Es hoy?
    if (
      cellDate.getDate()     === todayDate.getDate()     &&
      cellDate.getMonth()    === todayDate.getMonth()    &&
      cellDate.getFullYear() === todayDate.getFullYear()
    ) {
      cell.classList.add('today');
    }

    // Número del día
    const numEl = document.createElement('div');
    numEl.className = 'day-num';
    numEl.textContent = cellDate.getDate();
    cell.appendChild(numEl);

    // Eventos que caen en esta celda
    eventos.forEach(ev => {
      if (!ev.inicio || !ev.fin) return;

      const inicio = new Date(ev.inicio);
      const fin    = new Date(ev.fin);
      inicio.setHours(0,0,0,0);
      fin.setHours(0,0,0,0);
      cellDate.setHours(0,0,0,0);

      if (cellDate >= inicio && cellDate <= fin) {
        const bar = document.createElement('div');
        bar.className = `event-bar ${ev.tipo}`;

        if (cellDate.getTime() === inicio.getTime()) {
          const inicioStr = formatFecha(inicio);
          const finStr    = formatFecha(fin);
          bar.textContent = `${ev.nombre}: ${inicioStr}–${finStr}`;
          bar.title       = `${ev.nombre}: ${inicioStr} – ${finStr}`;
        } else {
          bar.textContent = '';
          bar.title       = ev.nombre;
        }

        cell.appendChild(bar);
      }
    });

    grid.appendChild(cell);
  }
}

// ─── Formatear fecha corta: "1 Jun" ───────────────────
function formatFecha(date) {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${date.getDate()} ${meses[date.getMonth()]}`;
}
