// ═══════════════════════════════════════════════════════
//   VacationFlow — Página Solicitar
//   Conecta con el back:
//     · GET  /api/users/profile                 → para obtener usuario_id
//     · GET  /yo/disponible?usuario_id=X        → días disponibles del usuario
//     · POST /solicitudes/subir-justificante    → subir archivo (opcional)
//     · POST /solicitudes                       → crear solicitud
// ═══════════════════════════════════════════════════════

const API_URL = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';

// ─── PROTECCIÓN DE RUTA ───────────────────────────────
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  window.location.href = '/index.html';
}

// ─── ESTADO DE LA PÁGINA ──────────────────────────────
let usuarioActual = null;
let uploadedFiles = [];

// ═══════════════════════════════════════════════════════
//   AL CARGAR LA PÁGINA: obtener datos del usuario
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // 1) Sacar el usuario logueado (CRÍTICO)
  try {
    const resUser = await fetch(`${API_URL}/api/users/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (resUser.status === 401) {
      cerrarSesion();
      return;
    }

    if (!resUser.ok) throw new Error('Error al cargar usuario');
    usuarioActual = await resUser.json();
    console.log('✅ Usuario cargado:', usuarioActual);

  } catch (error) {
    console.error('❌ Error al cargar usuario:', error);
    showToast('❌ No se pudieron cargar tus datos. Recarga la página.', false);
    return;
  }

  // 2) Sacar la disponibilidad (NO crítico, si falla solo se muestra vacío)
  try {
    const resDisp = await fetch(
      `${API_URL}/yo/disponible?usuario_id=${usuarioActual.id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (resDisp.ok) {
      const disp = await resDisp.json();
      renderDisponibilidad(disp);
    } else {
      console.warn('⚠️ No se pudo cargar la disponibilidad');
    }
  } catch (error) {
    console.warn('⚠️ Error en disponibilidad:', error);
  }

  // 3) Configurar botón cerrar sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        cerrarSesion();
      }
    });
  }

  // 4) Fecha mínima = hoy (el back rechaza fechas anteriores)
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha-inicio').min = hoy;
  document.getElementById('fecha-fin').min    = hoy;
});

// ═══════════════════════════════════════════════════════
//   RENDERIZAR PANEL DE DISPONIBILIDAD
// ═══════════════════════════════════════════════════════
function renderDisponibilidad(disp) {
  const total      = disp.dias_totales     || 0;
  const consumidos = disp.dias_consumidos  || 0;
  const restantes  = disp.dias_disponibles || 0;
  const porcentaje = total > 0 ? (consumidos / total) * 100 : 0;

  const setText = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
  };

  setText('dispTotal',      total);
  setText('dispConsumidos', consumidos);
  setText('dispRestantes',  restantes);
  setText('sidebarDays',    restantes);
  setText('sidebarUnit',    restantes === 1 ? 'día' : 'días');

  const fill = document.getElementById('dispFill');
  if (fill) fill.style.width = `${porcentaje}%`;
}

// ═══════════════════════════════════════════════════════
//   SELECCIÓN DE TIPO DE SOLICITUD
// ═══════════════════════════════════════════════════════
function selectTipo(el) {
  document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ═══════════════════════════════════════════════════════
//   DRAG & DROP DE ARCHIVOS
// ═══════════════════════════════════════════════════════
const dz = document.getElementById('dropzone');
dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', ()  => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
  e.preventDefault();
  dz.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      showToast(`⚠️ El archivo "${file.name}" supera los 5MB.`, false);
      return;
    }
    uploadedFiles.push(file);
    renderFileList();
  });
}

function renderFileList() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';
  uploadedFiles.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `<span>📎 ${f.name}</span><span class="file-remove" onclick="removeFile(${i})">×</span>`;
    list.appendChild(item);
  });
}

function removeFile(idx) {
  uploadedFiles.splice(idx, 1);
  renderFileList();
}

// ═══════════════════════════════════════════════════════
//   VALIDAR Y ENVIAR LA SOLICITUD
// ═══════════════════════════════════════════════════════
async function handleSubmit() {
  const inicio     = document.getElementById('fecha-inicio').value;
  const fin        = document.getElementById('fecha-fin').value;
  const tipoSel    = document.querySelector('.tipo-card.selected');
  const comentario = document.getElementById('motivo').value.trim();
  const submitBtn  = document.getElementById('submitBtn');

  // ─── Validaciones en el front ─────────────────────────
  if (!usuarioActual)  { showToast('⚠️ Aún cargando tus datos, espera un momento.', false); return; }
  if (!tipoSel)        { showToast('⚠️ Selecciona un tipo de solicitud.', false); return; }
  if (!inicio)         { showToast('⚠️ Indica la fecha de inicio.', false); return; }
  if (!fin)            { showToast('⚠️ Indica la fecha de finalización.', false); return; }

  if (new Date(fin) < new Date(inicio)) {
    showToast('⚠️ La fecha de fin no puede ser anterior al inicio.', false);
    return;
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (new Date(inicio) < hoy) {
    showToast('⚠️ La fecha de inicio no puede ser anterior a hoy.', false);
    return;
  }

  // Si es baja médica, el justificante es obligatorio
  if (tipoSel.dataset.tipo === 'baja_medica' && uploadedFiles.length === 0) {
    showToast('⚠️ La baja médica requiere un justificante.', false);
    return;
  }

  // Deshabilitar botón mientras se procesa
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.7';

  try {
    // ─── 1) Subir justificante si hay archivo ──────────────
    let justificante_ref = null;
    if (uploadedFiles.length > 0) {
      const formData = new FormData();
      formData.append('justificante', uploadedFiles[0]);

      const uploadRes = await fetch(`${API_URL}/solicitudes/subir-justificante`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        showToast('⚠️ ' + (uploadData.message || 'Error al subir el archivo.'), false);
        resetSubmitBtn(submitBtn);
        return;
      }

      justificante_ref = uploadData.justificante_ref;
    }

    // ─── 2) Crear la solicitud ─────────────────────────────
    const response = await fetch(`${API_URL}/solicitudes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        usuario_id:      usuarioActual.id,
        tipo:            tipoSel.dataset.tipo,
        fecha_inicio:    inicio,
        fecha_fin:       fin,
        comentario:      comentario || null,
        justificante_ref
      })
    });

    const data = await response.json();

    if (response.ok) {
      showToast('✅ Solicitud enviada correctamente.');
      setTimeout(() => {
        window.location.href = '/src/pages/usuario/perfil_usuario.html';
      }, 1800);
    } else {
      showToast('⚠️ ' + (data.message || 'Error al enviar la solicitud.'), false);
      resetSubmitBtn(submitBtn);
    }

  } catch (error) {
    console.error('Error al enviar solicitud:', error);
    showToast('❌ No se pudo conectar con el servidor.', false);
    resetSubmitBtn(submitBtn);
  }
}

function resetSubmitBtn(btn) {
  btn.disabled = false;
  btn.style.opacity = '1';
}

// ═══════════════════════════════════════════════════════
//   CANCELAR
// ═══════════════════════════════════════════════════════
function handleCancel() {
  if (confirm('¿Seguro que quieres cancelar? Se perderán los datos.')) {
    window.location.href = '/src/pages/usuario/perfil_usuario.html';
  }
}

// ═══════════════════════════════════════════════════════
//   TOAST DE NOTIFICACIÓN
// ═══════════════════════════════════════════════════════
function showToast(msg, ok = true) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.style.background = ok ? 'var(--teal-dark)' : '#8b3a2e';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
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
