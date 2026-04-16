// Esperamos a que el HTML esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitamos que la página se recargue

        // Extraemos los datos de los inputs
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // URL de la API (sacada de tu archivo Postman)
        const API_URL = 'http://127.0.0.1:3000/api/auth/login';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Si el login es correcto, guardamos el token JWT
                localStorage.setItem('token', data.token);
                
                alert('¡Login exitoso!');
                
                // Redirigir al dashboard o página principal
                // window.location.href = 'dashboard.html';
            } else {
                // Si el servidor nos dice que algo está mal
                alert('Error al acceder: ' + (data.message || 'Credenciales inválidas'));
            }

        } catch (error) {
            // Si el servidor de tu compañero está apagado o hay fallo de red
            console.error('Error en la petición:', error);
            alert('Error crítico: No se puede conectar con el servidor.');
        }
    });
});