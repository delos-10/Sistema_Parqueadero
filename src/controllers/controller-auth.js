/* ============================================================
   CONTROLLER-AUTH.JS — Autenticación, sesiones y permisos por rol
   Archivo: src/controllers/controller-auth.js
============================================================ */

// Rol seleccionado en el login
let rolSeleccionado = 'usuario';

// Sesión actual
let sesionActual = null;

/* ---- Seleccionar rol en los botones ---- */
function seleccionarRol(rol) {
  rolSeleccionado = rol;
  document.querySelectorAll('.session-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-role="${rol}"]`).classList.add('active');
  document.getElementById('loginError').textContent = '';
}

/* ---- Mostrar/ocultar contraseña ---- */
function togglePass() {
  const input = document.getElementById('loginPass');
  input.type = input.type === 'password' ? 'text' : 'password';
}

/* ---- Iniciar sesión ---- */
function iniciarSesion() {
  const usuario  = document.getElementById('loginUser').value.trim().toLowerCase();
  const password = document.getElementById('loginPass').value;

  if (!usuario || !password) {
    mostrarErrorLogin('⚠️ Por favor ingresa usuario y contraseña.');
    return;
  }

  const datos = USUARIOS[usuario];
  if (!datos) {
    mostrarErrorLogin('❌ Usuario no encontrado en el sistema.');
    return;
  }
  if (datos.rol !== rolSeleccionado) {
    mostrarErrorLogin(`❌ Este usuario no es un ${rolSeleccionado}. Selecciona el rol correcto.`);
    return;
  }
  if (datos.password !== password) {
    mostrarErrorLogin('❌ Contraseña incorrecta. Inténtalo de nuevo.');
    return;
  }

  sesionActual = {
    usuario,
    rol: datos.rol,
    nombre: datos.nombre,
    icon: datos.icon,
    horaIngreso: new Date()
  };

  const card = document.getElementById('loginCard');
  card.classList.add('login-exit');

  setTimeout(() => {
    document.getElementById('loginOverlay').style.display = 'none';
    iniciarSistema();
  }, 500);
}

/* ---- Mostrar error en login ---- */
function mostrarErrorLogin(txt) {
  const err = document.getElementById('loginError');
  err.textContent = txt;
  err.classList.add('shake');
  setTimeout(() => err.classList.remove('shake'), 500);
}

/* ---- Cerrar sesión ---- */
function cerrarSesion() {
  if (!confirm('¿Seguro que deseas cerrar sesión?')) return;
  sesionActual = null;

  // Ocultar todo el sistema
  document.getElementById('sistemaApp').style.display = 'none';

  // Mostrar login limpio
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginCard').classList.remove('login-exit');
  seleccionarRol('usuario');
}

/* ---- IDs de cards por categoría de rol ---- */
const CARDS_USUARIO   = ['cardReservaUsuario', 'cardMiVehiculo', 'cardMisReservas', 'cardHistorialUsuario'];
const CARDS_OPERADOR  = ['cardRegistroVehiculos', 'cardVehiculosActivos', 'cardReservasActuales', 'panelOperador', 'cardHistorial'];
const CARDS_ADMIN     = ['panelAdmin'];

/* ---- Mostrar/ocultar tarjetas según rol ---- */
function aplicarPermisosRol(rol) {
  const esUsuario  = rol === 'usuario'  || rol === 'administrador';
  const esOperador = rol === 'operador' || rol === 'administrador';
  const esAdmin    = rol === 'administrador';

  CARDS_USUARIO.forEach(id  => mostrarCard(id, esUsuario));
  CARDS_OPERADOR.forEach(id => mostrarCard(id, esOperador));
  CARDS_ADMIN.forEach(id    => mostrarCard(id, esAdmin));
}

function mostrarCard(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? 'block' : 'none';
}

/* ---- Iniciar sistema después del login ---- */
function iniciarSistema() {
  document.getElementById('sistemaApp').style.display = 'block';
  document.getElementById('roleIcon').textContent = sesionActual.icon;
  document.getElementById('roleName').textContent = sesionActual.nombre + ' (' + capitalizar(sesionActual.rol) + ')';
  document.getElementById('footerSesion').textContent = capitalizar(sesionActual.rol) + ' — ' + sesionActual.nombre;

  aplicarPermisosRol(sesionActual.rol);
  initApp();
  renderMisReservas();
  renderHistorialUsuario();
  renderReservasOperador();
}

/* ---- Tecla Enter en el login ---- */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') iniciarSesion();
  });
  document.getElementById('loginUser').addEventListener('keydown', e => {
    if (e.key === 'Enter') iniciarSesion();
  });
});
