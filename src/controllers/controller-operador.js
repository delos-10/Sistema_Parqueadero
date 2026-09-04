/* ============================================================
   CONTROLLER-OPERADOR.JS — Funciones exclusivas del Panel Operador
   Archivo: src/controllers/controller-operador.js
============================================================ */

/* ---- Abrir turno ---- */
function abrirTurno() {
  if (!tienePermiso(['operador', 'administrador'])) return;

  if (turnoActivo) {
    const dur = formatDur(new Date() - horaInicioTurno);
    msg(`⚠️ Ya hay un turno activo (<b>${operadorTurnoActual.nombre}</b>). Lleva <b>${dur}</b> abierto.`, 'warn', 'panelOpResult');
    return;
  }

  registrarAperturaTurno(sesionActual.usuario, sesionActual.nombre);
  PZ.guardarTurnoActivo();
  msg(`✅ Turno abierto a las <b>${horaInicioTurno.toLocaleTimeString('es-CO')}</b>. Operador: <b>${sesionActual.nombre}</b>`, 'ok', 'panelOpResult');
}

/* ---- Cerrar turno ---- */
function cerrarTurno() {
  if (!tienePermiso(['operador', 'administrador'])) return;

  if (!turnoActivo) {
    msg('⚠️ No hay ningún turno activo para cerrar.', 'warn', 'panelOpResult');
    return;
  }

  const registro = registrarCierreTurno();
  PZ.guardarTurnos();
  PZ.guardarTurnoActivo();
  msg(`
    🔒 <b>Turno cerrado</b><br>
    Operador: <b>${registro.nombre}</b><br>
    Duración: <b>${formatDur(registro.horas * 3600000)}</b> (${registro.horas.toFixed(2)} h)
  `, 'ok', 'panelOpResult');
}

/* ---- Reporte rápido ---- */
function reporteRapido() {
  if (!tienePermiso(['operador', 'administrador'])) return;

  const dur        = turnoActivo ? formatDur(new Date() - horaInicioTurno) : 'Sin turno activo';
  const pendientes  = reservas.filter(r => r.estado === 'pendiente').length;
  const confirmadas = reservas.filter(r => r.estado === 'confirmada').length;

  msg(`
    📋 <b>Reporte rápido — Turno actual</b><br>
    ⏱ Duración turno: <b>${dur}</b><br>
    🚗 Vehículos dentro: <b>${ocupados.size}</b><br>
    📅 Reservas pendientes: <b>${pendientes}</b><br>
    📌 Reservas confirmadas: <b>${confirmadas}</b><br>
    📊 Atendidos hoy: <b>${totalHoy}</b><br>
    💰 Ingresos hoy: <b>${formatCOP(ingresos)}</b>
  `, 'info', 'panelOpResult');
}

/* ---- Buscar vehículo ---- */
function buscarVehiculo() {
  if (!tienePermiso(['operador', 'administrador'])) return;

  const placa = prompt('Ingresa la placa a buscar (ej: ABC123):');
  if (!placa) return;
  const placaUp = placa.trim().toUpperCase().replace(/\s/g, '');

  if (vehiculos[placaUp]) {
    const { entrada, puesto } = vehiculos[placaUp];
    const { cobro, ms } = calcCobro(entrada);
    msg(`
      🔍 <b>Vehículo encontrado</b><br>
      Placa: <b>${placaUp}</b> — Puesto: <b>${puesto}</b><br>
      ⏱ Tiempo: <b>${formatDur(ms)}</b><br>
      💰 Cobro aprox.: <b>${formatCOP(cobro)}</b><br>
      📅 Entró: <b>${entrada.toLocaleTimeString('es-CO')}</b>
    `, 'ok', 'panelOpResult');
  } else {
    const reservaEncontrada = reservas.find(r => r.placa === placaUp);
    if (reservaEncontrada) {
      msg(`ℹ️ Placa <b>${placaUp}</b> tiene reserva <b>${reservaEncontrada.id}</b> en estado <b>${reservaEncontrada.estado}</b>. No está físicamente dentro.`, 'info', 'panelOpResult');
    } else {
      msg(`⚠️ La placa <b>${placaUp}</b> no está registrada como activa ni tiene reservas.`, 'warn', 'panelOpResult');
    }
  }
}

/* ---- Movimientos del día ---- */
function verMovimientosDia() {
  if (!tienePermiso(['operador', 'administrador'])) return;

  const hoy = new Date().toLocaleDateString('es-CO');
  const movimientosHoy = historial.filter(h => h.fecha === hoy);
  const cont = document.getElementById('panelOpResult');

  if (movimientosHoy.length === 0) {
    msg('📭 No hay movimientos registrados hoy.', 'info', 'panelOpResult');
    return;
  }

  let html = `<div class="msg msg-info msg-anim"><b>📜 Movimientos de hoy (${hoy})</b><div style="margin-top:0.5rem">`;
  movimientosHoy.forEach(h => {
    const monto = h.monto != null ? ` — ${formatCOP(h.monto)}` : '';
    html += `<div style="display:flex;gap:0.5rem;align-items:center;padding:0.2rem 0;border-bottom:1px solid rgba(0,0,0,0.06)">
      <span class="badge badge-${h.tipo === 'Entrada' ? 'e' : 's'}">${h.tipo}</span>
      <b>${h.placa}</b>
      <span style="color:var(--texto-suave);margin-left:auto">${h.hora}${monto}</span>
    </div>`;
  });
  html += `</div></div>`;
  cont.innerHTML = html;
}
