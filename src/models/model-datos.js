/* ============================================================
   MODEL-DATOS.JS — Estado global y configuración del sistema
   Archivo: src/models/model-datos.js
============================================================ */

// ---- CONFIGURACIÓN ----
let CAPACIDAD           = 50;
let TARIFA_MIN          = 100;   // $ por minuto de parqueo (editable por admin)
let COBRO_MINIMO        = 100;   // cobro mínimo en $
let TARIFA_HORA_OPERADOR = 8000; // $ por hora trabajada (nómina, editable por admin)

// ---- ROLES DEL SISTEMA ----
const ROLES = ['usuario', 'operador', 'administrador'];

// ---- USUARIOS DEL SISTEMA ----
const USUARIOS = {
  usuario: { password: 'user123', rol: 'usuario',        nombre: 'Juan García',       icon: '👤' },
  operador: { password: 'op2024',  rol: 'operador',       nombre: 'Carlos Mora',        icon: '🛂' },
  admin:    { password: 'admin2024', rol: 'administrador', nombre: 'Director ParkZone',  icon: '👑' }
};

// ---- ESTADO DEL PARQUEADERO ----
let vehiculos = {};        // { placa: { entrada, puesto, reservaId } }
let ocupados  = new Set(); // conjunto de puestos ocupados
let historial = [];        // array de movimientos { tipo, placa, hora, monto, fecha }
let ingresos  = 0;
let totalHoy  = 0;

// ---- RESERVAS ----
let reservas = [];
let contadorReservaId = 1;

// ---- TURNOS DE OPERADOR (para nómina) ----
let turnoActivo         = false;
let horaInicioTurno     = null;
let operadorTurnoActual = null; // { usuario, nombre }
let turnos = [];                // historial de turnos cerrados
