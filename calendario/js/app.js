// ─── DATOS DE EJEMPLO (ficticios) ───
const eventos = [
  { nombre: 'Maria',  tipo: 'annual',  inicio: '2024-03-12', fin: '2024-03-18' },
  { nombre: 'Carlos', tipo: 'sick',    inicio: '2024-03-15', fin: '2024-03-20' },
  { nombre: 'Elena',  tipo: 'annual',  inicio: '2024-03-25', fin: '2024-03-29' },
  { nombre: 'Jordi',  tipo: 'annual',  inicio: '2024-04-01', fin: '2024-04-05' },
  { nombre: 'Sofía',  tipo: 'sick',    inicio: '2024-04-08', fin: '2024-04-10' },
];

// Meses en inglés para mostrar en el header
const MESES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// Estado del calendario
let currentYear  = 2024;
let currentMonth = 2; // 0-based, 2 = March

// ─── RENDERIZAR CALENDARIO ───
function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const label = document.getElementById('month-label');
  grid.innerHTML = '';

  label.textContent = `${MESES[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay  = new Date(currentYear, currentMonth + 1, 0);
  const today    = new Date();

  // Día de la semana del primer día (0=Dom, ajustamos a Lun=0)
  let startDow = firstDay.getDay(); // 0=Dom
  startDow = (startDow === 0) ? 6 : startDow - 1; // Lun=0 ... Dom=6

  // Días del mes anterior para rellenar
  const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();

  // Total celdas: suficientes para completar semanas
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day';

    let dayNum, cellDate;

    if (i < startDow) {
      // Días mes anterior
      dayNum = prevMonthLast - startDow + i + 1;
      cellDate = new Date(currentYear, currentMonth - 1, dayNum);
      cell.classList.add('other-month');
    } else if (i >= startDow + lastDay.getDate()) {
      // Días mes siguiente
      dayNum = i - startDow - lastDay.getDate() + 1;
      cellDate = new Date(currentYear, currentMonth + 1, dayNum);
      cell.classList.add('other-month');
    } else {
      dayNum = i - startDow + 1;
      cellDate = new Date(currentYear, currentMonth, dayNum);
    }

    // ¿Es hoy?
    if (
      cellDate.getDate() === today.getDate() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getFullYear() === today.getFullYear()
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
      const inicio = new Date(ev.inicio);
      const fin    = new Date(ev.fin);
      // Normalizamos horas
      inicio.setHours(0,0,0,0);
      fin.setHours(0,0,0,0);
      cellDate.setHours(0,0,0,0);

      if (cellDate >= inicio && cellDate <= fin) {
        const bar = document.createElement('div');
        bar.className = `event-bar ${ev.tipo}`;

        // Solo mostramos el nombre en el día de inicio
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

// ─── HELPER: formatear fecha corta "12 Mar" ───
function formatFecha(date) {
  const meses = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${meses[date.getMonth()]}`;
}

// ─── NAVEGACIÓN ENTRE MESES ────
document.getElementById('prev-btn').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
});

document.getElementById('next-btn').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
});

// ─── INIT ────
renderCalendar();

async function cargarEventos() {
  const token = localStorage.getItem('token');
  const res = await fetch('http://localhost:3000/solicitudes', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  // mapear data a formato eventos[] y llamar renderCalendar()
}