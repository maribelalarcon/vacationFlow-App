// ─── EVENTOS (se cargan del back) ────────────────────────
const eventos = [];

const MESES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// Estado del calendario - mes actual
const hoyInicio = new Date();
let currentYear  = hoyInicio.getFullYear();
let currentMonth = hoyInicio.getMonth();

// ─── RENDERIZAR CALENDARIO ───────────────────────────────
function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const label = document.getElementById('month-label');
  grid.innerHTML = '';

  label.textContent = `${MESES[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay  = new Date(currentYear, currentMonth + 1, 0);
  const today    = new Date();

  let startDow = firstDay.getDay();
  startDow = (startDow === 0) ? 6 : startDow - 1;

  const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day';

    let dayNum, cellDate;

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
      cellDate.getDate() === today.getDate() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getFullYear() === today.getFullYear()
    ) {
      cell.classList.add('today');
    }

    const numEl = document.createElement('div');
    numEl.className = 'day-num';
    numEl.textContent = cellDate.getDate();
    cell.appendChild(numEl);

    eventos.forEach(ev => {
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
          bar.title       = `${ev.nombre}`;
        }

        cell.appendChild(bar);
      }
    });

    grid.appendChild(cell);
  }
}

// ─── HELPER: formatear fecha corta "12 Mar" ──────────────
function formatFecha(date) {
  const meses = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${meses[date.getMonth()]}`;
}

// ─── NAVEGACIÓN ENTRE MESES ──────────────────────────────
document.getElementById('prev-btn').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  cargarEventos();
});

document.getElementById('next-btn').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  cargarEventos();
});

// ─── CARGAR EVENTOS DEL BACK ─────────────────────────────
async function cargarEventos() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(
      `http://localhost:3000/calendario?anio=${currentYear}&mes=${currentMonth + 1}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();

    eventos.length = 0;
    data.eventos.forEach(e => {
      eventos.push({
        nombre: e.empleado.nombre,
        tipo: e.tipo === 'vacaciones' ? 'annual' : 'sick',
        inicio: e.fecha_inicio.slice(0, 10),
        fin: e.fecha_fin.slice(0, 10)
      });
    });

    renderCalendar();
  } catch (err) {
    console.error('Error cargando eventos:', err);
    renderCalendar();
  }
}

// ─── OCULTAR MANAGER DASHBOARD SI NO ES MANAGER ──────────
function getRolFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.rol;
  } catch { return null; }
}
/*
if (getRolFromToken() !== 'manager') {
  const managerLink = document.querySelector('.nav-item-manager');
  if (managerLink) managerLink.style.display = 'none';
}

// ─── INIT ─────────────────────────────────────────────────
cargarEventos();
*/