// ═══════════════════════════════════════════════════════
//   VacationFlow — Registro (registro.js)
//   Conecta con POST /api/auth/register en Railway
// ═══════════════════════════════════════════════════════

// URL base de la API en producción
const API_URL = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';

document.addEventListener('DOMContentLoaded', () => {
    const form       = document.getElementById('registroForm');
    const submitBtn  = document.getElementById('submitBtn');
    const messageEl  = document.getElementById('registroMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1) Capturamos los datos del formulario
        const nombre    = document.getElementById('nombre').value.trim();
        const apellido  = document.getElementById('apellido').value.trim();
        const email     = document.getElementById('email').value.trim();
        const password  = document.getElementById('password').value;

        // 2) Validaciones en el front antes de enviar
        if (!nombre || !apellido || !email || !password) {
            showMessage('Por favor, rellena todos los campos.', 'error');
            return;
        }
        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }
        if (!email.includes('@')) {
            showMessage('El correo electrónico no es válido.', 'error');
            return;
        }

        // 3) Deshabilitamos el botón mientras se envía
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando cuenta...';
        showMessage('', '');

        try {
            // 4) Llamada al endpoint de registro
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, apellido, email, password, rol: 'empleado' })
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ Registro correcto
                showMessage('✅ ¡Cuenta creada! Redirigiendo al login...', 'success');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1500);
            } else {
                // ⚠️ Error del servidor: mostramos el mensaje exacto que envía el back
                //    (ej: "El usuario ya está registrado", "Completa todos los campos", etc.)
                const mensaje = data.message || 'No se pudo crear la cuenta.';
                showMessage('❌ ' + mensaje, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrarse';
            }

        } catch (error) {
            // ❌ Fallo de red / servidor caído
            console.error('Error en registro:', error);
            showMessage('❌ No se pudo conectar con el servidor. Inténtalo más tarde.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrarse';
        }
    });

    // ─── Mostrar mensaje debajo del botón ──────────────────
    function showMessage(msg, type) {
        messageEl.textContent = msg;
        messageEl.className = 'mensaje-estado ' + (type || '');
    }
});
