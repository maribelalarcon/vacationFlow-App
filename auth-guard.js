// ═══════════════════════════════════════════════════════
//   VacationFlow — auth-guard.js
//
//   Uso en HTML (DEBE ir en <head>, ANTES que cualquier otro script):
//     <script src="auth-guard.js" data-required-role="admin"></script>
//     <script src="auth-guard.js" data-required-role="any"></script>
// ═══════════════════════════════════════════════════════

(function () {
    // ─── 1. OCULTAR LA PÁGINA AL INSTANTE ────────────────
    document.write('<style id="vf-hide">body{visibility:hidden!important}</style>');

    function mostrarPagina() {
        const s = document.getElementById('vf-hide');
        if (s) s.remove();
    }

    // ─── 2. Leer sesión de cualquier storage ──────────────
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const rol   = (localStorage.getItem('rol')  || sessionStorage.getItem('rol') || '').trim().toLowerCase();

    // ─── 3. Leer rol exigido por la página ────────────────
    const script = document.currentScript ||
                   document.querySelector('script[src*="auth-guard.js"]');
    const requiredRole = (script && script.dataset.requiredRole) || 'any';

    console.log('[VFAuth] Página exige:', requiredRole, '| Tu rol:', rol || '(ninguno)');

    // ─── 4. Sin token → al login ──────────────────────────
    if (!token) {
        console.log('[VFAuth] Sin token → al login');
        window.location.replace('index.html');
        return;
    }

    // ─── 5. Página de admin y no eres admin → fuera ──────
    if (requiredRole === 'admin' && rol !== 'admin') {
        console.log('[VFAuth] 🚫 No eres admin → al perfil');
        alert('🚫 Acceso restringido: esta zona es solo para jefes.');
        window.location.replace('perfil_usuario.html');
        return;
    }

    // ─── 6. Acceso concedido → mostrar página ─────────────
    console.log('[VFAuth] ✅ Acceso concedido');

    // ─── 7. Ocultar links del sidebar según rol ───────────
    // Los links de admin tienen la clase "nav-item-manager".
    // Si el usuario no es admin, los ocultamos en cuanto el DOM esté listo.
    document.addEventListener('DOMContentLoaded', () => {
        if (rol !== 'admin') {
            document.querySelectorAll('.nav-item-manager').forEach(el => {
                el.style.display = 'none';
            });
        }
        mostrarPagina();
    });

    // Si el DOM ya estaba listo (fallback), mostramos igualmente
    if (document.readyState !== 'loading') {
        if (rol !== 'admin') {
            document.querySelectorAll('.nav-item-manager').forEach(el => {
                el.style.display = 'none';
            });
        }
        mostrarPagina();
    }

    // ─── 8. Utilidades globales ───────────────────────────
    window.VFAuth = {
        token,
        rol,
        userId: localStorage.getItem('userId') || sessionStorage.getItem('userId'),
        isAdmin: () => rol === 'admin',

        logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('rol');
            localStorage.removeItem('userId');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('rol');
            sessionStorage.removeItem('userId');
            window.location.replace('index.html');
        },

        authHeader() {
            return { 'Authorization': `Bearer ${token}` };
        }
    };

    // ─── 9. Conectar botones de logout cuando cargue el DOM
    document.addEventListener('DOMContentLoaded', () => {
        const logoutEls = document.querySelectorAll('#logoutBtn, .logout-btn');
        logoutEls.forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                    window.VFAuth.logout();
                }
            });
        });
    });
})();