  // Selección de tipo
  function selectTipo(el) {
    document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }
 
  // Drag & Drop
  const dz = document.getElementById('dropzone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
 
  let uploadedFiles = [];
 
  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        showToast('⚠️ El archivo "' + file.name + '" supera los 10MB.', false);
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
 
  // Validación y envío
async function handleSubmit() {
  const inicio = document.getElementById('fecha-inicio').value;
  const fin = document.getElementById('fecha-fin').value;
  const tipoSel = document.querySelector('.tipo-card.selected');
  const comentario = document.getElementById('motivo').value;

  if (!tipoSel) { showToast('⚠️ Selecciona un tipo de solicitud.', false); return; }
  if (!inicio) { showToast('⚠️ Indica la fecha de inicio.', false); return; }
  if (!fin) { showToast('⚠️ Indica la fecha de finalización.', false); return; }
  if (new Date(fin) < new Date(inicio)) { showToast('⚠️ La fecha de fin no puede ser anterior al inicio.', false); return; }

  try {
   
    let justificante_ref = null;
    if (uploadedFiles.length > 0) {
      const formData = new FormData();
      formData.append('justificante', uploadedFiles[0]);

      const uploadRes = await fetch('http://localhost:3000/solicitudes/subir-justificante', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        showToast('⚠️ ' + uploadData.message, false);
        return;
      }

      justificante_ref = uploadData.justificante_ref;
    }

    
    const response = await fetch('http://localhost:3000/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: localStorage.getItem('usuario_id'),
        tipo: tipoSel.dataset.tipo,
        fecha_inicio: inicio,
        fecha_fin: fin,
        comentario: comentario || null,
        justificante_ref: justificante_ref
      })
    });

    const data = await response.json();

    if (response.ok) {
      showToast('✅ Solicitud enviada correctamente.');
      setTimeout(resetForm, 2000);
    } else {
      showToast('⚠️ ' + data.message, false);
    }

  } catch (error) {
    showToast('❌ No se pudo conectar con el servidor.', false);
    console.error(error);
  }
}
 
  function handleCancel() {
    if (confirm('¿Seguro que quieres cancelar? Se perderán los datos.')) resetForm();
  }
 
  function resetForm() {
    document.getElementById('fecha-inicio').value = '';
    document.getElementById('fecha-fin').value = '';
    document.getElementById('motivo').value = '';
    uploadedFiles = [];
    renderFileList();
    document.querySelectorAll('.tipo-card').forEach((c, i) => {
      c.classList.toggle('selected', i === 0);
    });
  }
 
  // Toast
  function showToast(msg, ok = true) {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    t.style.background = ok ? 'var(--teal-dark)' : '#8b3a2e';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }