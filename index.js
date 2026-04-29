// ═══════════════════════════════════════════════════════
//   VacationFlow — Login (index.js)
//   Conecta con POST /api/auth/login en Railway
//   Guarda el token JWT y el ROL, y redirige según el rol:
//     · admin   → panel_jefe.html
//     · empleado → perfil_usuario.html
// ═══════════════════════════════════════════════════════

const API_URL = localStorage.getItem('vacationflow_api_url') || 'https://vacationflow-api-production.up.railway.app';

document.addEventListener('DOMContentLoaded', () => {
    const form         = document.getElementById('loginForm');
    const submitBtn    = document.getElementById('submitBtn');
    const messageEl    = document.getElementById('loginMessage');
    const rememberChk  = document.getElementById('check');

    // ─── Si ya hay sesión iniciada, redirigir según rol ────
    const tokenGuardado = localStorage.getItem('token') || sessionStorage.getItem('token');
    const rolGuardado   = localStorage.getItem('rol')   || sessionStorage.getItem('rol');

    if (tokenGuardado) {
        if (rolGuardado === 'admin') {
            window.location.href = '/src/pages/jefe/panel_jefe.html';
        } else {
            window.location.href = '/src/pages/usuario/perfil_usuario.html';
        }
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showMessage('Por favor, rellena todos los campos.', 'error');
            return;
        }

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
                // ✅ Login correcto: guardamos token, rol y userId
                const storage = rememberChk.checked ? localStorage : sessionStorage;
                storage.setItem('token',  data.token);
                storage.setItem('rol',    data.rol    || 'empleado');
                storage.setItem('userId', data.userId || '');

                showMessage('✅ ¡Bienvenido! Redirigiendo...', 'success');

                // ─── Redirección según rol ────────────────────
                setTimeout(() => {
                    if (data.rol === 'admin') {
                        window.location.href = '/src/pages/jefe/panel_jefe.html';
                    } else {
                        window.location.href = '/src/pages/usuario/perfil_usuario.html';
                    }
                }, 800);

            } else {
                showMessage('❌ ' + (data.message || 'No se pudo iniciar sesión.'), 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Acceder &nbsp; →';
            }

        } catch (error) {
            console.error('Error en login:', error);
            showMessage('❌ No se pudo conectar con el servidor. Inténtalo más tarde.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Acceder &nbsp; →';
        }
    });

    function showMessage(msg, type) {
        messageEl.textContent = msg;
        messageEl.className = 'mensaje-estado ' + (type || '');
    }
});
