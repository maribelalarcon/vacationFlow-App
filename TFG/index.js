// ═══════════════════════════════════════════════════════
//   VacationFlow — Login (index.js)
//   Conecta con POST /api/auth/login en Railway
//   Guarda el token JWT y redirige al perfil del usuario
// ═══════════════════════════════════════════════════════

// URL base de la API en producción
const API_URL = 'https://vacationflow-api-production.up.railway.app';

document.addEventListener('DOMContentLoaded', () => {
    const form         = document.getElementById('loginForm');
    const submitBtn    = document.getElementById('submitBtn');
    const messageEl    = document.getElementById('loginMessage');
    const rememberChk  = document.getElementById('check');

    // ─── Si el usuario ya tiene un token guardado, va directo al perfil
    //     (evita que tenga que volver a loguearse cada vez)
    if (localStorage.getItem('token') || sessionStorage.getItem('token')) {
        window.location.href = 'perfil_usuario.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validación básica en el front
        if (!email || !password) {
            showMessage('Por favor, rellena todos los campos.', 'error');
            return;
        }

        // Deshabilitar el botón mientras procesa
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Accediendo...';
        showMessage('', '');

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ Login correcto: guardamos el token
                //    Si marcó "Recordar sesión" → localStorage (persiste al cerrar navegador)
                //    Si no                    → sessionStorage (se borra al cerrar)
                const storage = rememberChk.checked ? localStorage : sessionStorage;
                storage.setItem('token', data.token);

                showMessage('✅ ¡Bienvenido! Redirigiendo...', 'success');

                setTimeout(() => {
                    window.location.href = 'perfil_usuario.html';
                }, 800);

            } else {
                // ⚠️ Credenciales incorrectas u otro error del back
                //    El back devuelve { message: "Las credenciales no son correctas." }
                showMessage('❌ ' + (data.message || 'No se pudo iniciar sesión.'), 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Acceder &nbsp; →';
            }

        } catch (error) {
            // ❌ Fallo de red / servidor caído
            console.error('Error en login:', error);
            showMessage('❌ No se pudo conectar con el servidor. Inténtalo más tarde.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Acceder &nbsp; →';
        }
    });

    // ─── Mostrar mensaje debajo del botón ──────────────────
    function showMessage(msg, type) {
        messageEl.textContent = msg;
        messageEl.className = 'mensaje-estado ' + (type || '');
    }
});