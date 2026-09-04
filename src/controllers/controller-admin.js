/* ============================================================
   CONTROLLER-ADMIN.JS — Funciones exclusivas del Panel Administrador
   Archivo: src/controllers/controller-admin.js
============================================================ */

/* ====================================================
   CONFIGURAR TARIFA
==================================================== */
function configurarTarifa() {
  if (!tienePermiso(['administrador'])) return;
  document.getElementById('tarifaActualShow').textContent = `${formatCOP(TARIFA_MIN)}/min`;
  document.getElementById('nuevaTarifa').value = TARIFA_MIN;
  document.getElementById('nuevoCobMin').value = COBRO_MINIMO;
  document.getElementById('overlayTarifa').classList.add('show');
}

function guardarTarifa() {
  const nueva   = parseInt(document.getElementById('nuevaTarifa').value);
  const nuevMin = parseInt(document.getElementById('nuevoCobMin').value);
  if (isNaN(nueva) || nueva < 10) {
    alert('Tarifa inválida. Mínimo $10/minuto.');
    return;
  }
  TARIFA_MIN   = nueva;
  COBRO_MINIMO = isNaN(nuevMin) ? nueva : nuevMin;
  document.getElementById('footerTarifa').textContent = nueva;
  PZ.guardarConfig();
  msg(`✅ Tarifa actualizada a <b>${formatCOP(TARIFA_MIN)}/min</b>. Cobro mínimo: <b>${formatCOP(COBRO_MINIMO)}</b>`, 'ok', 'panelAdmResult');
  cerrarTarifa();
}

function cerrarTarifa() {
  document.getElementById('overlayTarifa').classList.remove('show');
}

/* ====================================================
   CONFIGURAR CAPACIDAD
==================================================== */
function configurarCapacidad() {
  if (!tienePermiso(['administrador'])) return;
  const nueva = parseInt(prompt(`Capacidad actual: ${CAPACIDAD} puestos.\nIngresa la nueva capacidad (1-500):`));
  if (isNaN(nueva) || nueva < 1 || nueva > 500) {
    msg('⚠️ Capacidad inválida. Debe ser entre 1 y 500.', 'warn', 'panelAdmResult');
    return;
  }
  CAPACIDAD = nueva;
  PZ.guardarConfig();
  const fc = document.getElementById('footerCapacidad');
  if (fc) fc.textContent = CAPACIDAD;
  initMapa();
  actualizarStats();
  msg(`✅ Capacidad actualizada a <b>${CAPACIDAD} puestos</b>.`, 'ok', 'panelAdmResult');
}

/* ====================================================
   INFORME COMPLETO
==================================================== */
function verInformeCompleto() {
  if (!tienePermiso(['administrador'])) return;
  const ocup = ocupados.size;
  const pct  = Math.round((ocup / CAPACIDAD) * 100);
  msg(`
    📊 <b>Informe Completo del Sistema</b><br>
    Capacidad total: <b>${CAPACIDAD} puestos</b><br>
    Ocupación actual: <b>${ocup} (${pct}%)</b><br>
    Ingresos totales hoy: <b>${formatCOP(ingresos)}</b><br>
    Vehículos atendidos: <b>${totalHoy}</b><br>
    Tarifa vigente: <b>${formatCOP(TARIFA_MIN)}/min</b><br>
    Cobro mínimo: <b>${formatCOP(COBRO_MINIMO)}</b><br>
    Reservas totales: <b>${reservas.length}</b><br>
    Movimientos registrados: <b>${historial.length}</b>
  `, 'info', 'panelAdmResult');
}

/* ====================================================
   RESETEAR SISTEMA
==================================================== */
function resetearSistema() {
  if (!tienePermiso(['administrador'])) return;
  if (!confirm('⚠️ ¿Seguro que deseas resetear el sistema?\nSe borrará TODO el registro, incluyendo reservas, turnos e historial.')) return;

  vehiculos = {};
  ocupados  = new Set();
  historial = [];
  ingresos  = 0;
  totalHoy  = 0;
  reservas  = [];
  contadorReservaId = 1;
  turnos = [];
  turnoActivo = false;
  horaInicioTurno = null;
  operadorTurnoActual = null;

  // Borrar localStorage pero conservar configuración (tarifas y capacidad)
  PZ.borrarTodo();
  PZ.guardarConfig(); // Mantener config actual

  initMapa();
  actualizarStats();
  actualizarListaActivos();
  renderMisReservas();
  renderHistorialUsuario();
  renderReservasOperador();
  renderHistorial();

  msg(`🔄 Sistema reseteado correctamente a las <b>${new Date().toLocaleTimeString('es-CO')}</b>.`, 'warn', 'panelAdmResult');
}

/* ====================================================
   EXPORTAR DATOS
==================================================== */
function exportarDatos() {
  if (!tienePermiso(['administrador'])) return;
  const data = {
    fecha:            new Date().toLocaleDateString('es-CO'),
    ingresos,
    totalHoy,
    capacidad:        CAPACIDAD,
    tarifaMin:        TARIFA_MIN,
    cobMin:           COBRO_MINIMO,
    vehiculosActivos: Object.keys(vehiculos).length,
    historial:        historial.slice(0, 100),
    reservas:         reservas.slice(0, 200),
    turnos
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `parkzone_reporte_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  msg('📤 Datos exportados correctamente.', 'ok', 'panelAdmResult');
}

/* ====================================================
   DASHBOARD ADMINISTRATIVO
==================================================== */
function abrirDashboard() {
  if (!tienePermiso(['administrador'])) return;

  const ocup        = ocupados.size;
  const lib         = CAPACIDAD - ocup;
  const pct         = Math.round((ocup / CAPACIDAD) * 100);
  const pendientes  = reservas.filter(r => r.estado === 'pendiente').length;
  const confirmadas = reservas.filter(r => r.estado === 'confirmada').length;
  const activas     = reservas.filter(r => r.estado === 'activa').length;
  const finalizadas = reservas.filter(r => r.estado === 'finalizada').length;
  const canceladas  = reservas.filter(r => r.estado === 'cancelada').length;
  const operadoresActivos = new Set(turnos.map(t => t.operador));
  if (turnoActivo && operadorTurnoActual) operadoresActivos.add(operadorTurnoActual.usuario);

  document.getElementById('dashboardBody').innerHTML = `
    <div class="stats-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:1rem">
      <div class="stat stat-ocupados"><div class="stat-icon">🔴</div><div class="stat-num">${ocup}</div><div class="stat-lbl">Ocupados</div></div>
      <div class="stat stat-libres"><div class="stat-icon">🟢</div><div class="stat-num">${lib}</div><div class="stat-lbl">Disponibles</div></div>
      <div class="stat stat-ingresos"><div class="stat-icon">💰</div><div class="stat-num" style="font-size:1rem">${formatCOP(ingresos)}</div><div class="stat-lbl">Ingresos Hoy</div></div>
      <div class="stat stat-total"><div class="stat-icon">📋</div><div class="stat-num">${totalHoy}</div><div class="stat-lbl">Atendidos Hoy</div></div>
    </div>
    <div class="hist-list" style="max-height:none">
      <div class="modal-row"><span class="modal-key">📊 Ocupación</span><span class="modal-val">${pct}% (${ocup}/${CAPACIDAD})</span></div>
      <div class="modal-row"><span class="modal-key">🚗 Vehículos activos</span><span class="modal-val">${ocup}</span></div>
      <div class="modal-row"><span class="modal-key">📥 Reservas pendientes</span><span class="modal-val">${pendientes}</span></div>
      <div class="modal-row"><span class="modal-key">📌 Reservas confirmadas</span><span class="modal-val">${confirmadas}</span></div>
      <div class="modal-row"><span class="modal-key">🚗 Reservas activas (dentro)</span><span class="modal-val">${activas}</span></div>
      <div class="modal-row"><span class="modal-key">🏁 Reservas finalizadas</span><span class="modal-val">${finalizadas}</span></div>
      <div class="modal-row"><span class="modal-key">🚫 Reservas canceladas</span><span class="modal-val">${canceladas}</span></div>
      <div class="modal-row"><span class="modal-key">🛂 Operadores activos hoy</span><span class="modal-val">${operadoresActivos.size}</span></div>
      <div class="modal-row"><span class="modal-key">⏱ Turno abierto ahora</span><span class="modal-val">${turnoActivo ? operadorTurnoActual.nombre : 'Ninguno'}</span></div>
      <div class="modal-row"><span class="modal-key">📜 Movimientos registrados</span><span class="modal-val">${historial.length}</span></div>
    </div>
  `;
  document.getElementById('overlayDashboard').classList.add('show');
}

function cerrarDashboard() {
  document.getElementById('overlayDashboard').classList.remove('show');
}

/* ====================================================
   NÓMINA
==================================================== */
function abrirNomina() {
  if (!tienePermiso(['administrador'])) return;
  document.getElementById('nominaTarifaInput').value = TARIFA_HORA_OPERADOR;
  calcularYRenderNomina();
  document.getElementById('overlayNomina').classList.add('show');
}

function cerrarNomina() {
  document.getElementById('overlayNomina').classList.remove('show');
}

function calcularYRenderNomina() {
  const tarifaInput = parseInt(document.getElementById('nominaTarifaInput').value);
  if (!isNaN(tarifaInput) && tarifaInput > 0) {
    TARIFA_HORA_OPERADOR = tarifaInput;
    PZ.guardarConfig();
  }

  const filas = calcularNomina(TARIFA_HORA_OPERADOR);
  const cont  = document.getElementById('nominaBody');

  if (filas.length === 0) {
    cont.innerHTML = '<div class="hist-empty">Aún no hay turnos registrados para calcular la nómina.</div>';
    document.getElementById('nominaTotalGeneral').textContent = formatCOP(0);
    return;
  }

  cont.innerHTML = '';
  let totalGeneral = 0;
  filas.forEach(f => {
    totalGeneral += f.pago;
    const horaInicio = turnoActivo && operadorTurnoActual && operadorTurnoActual.usuario === f.operador
      ? horaInicioTurno.toLocaleTimeString('es-CO')
      : '—';

    const d = document.createElement('div');
    d.className = 'hist-item hist-item-anim';
    d.style.cssText = 'flex-direction:column;align-items:stretch;gap:0.3rem';
    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="hist-placa">👤 ${f.nombre}</span>
        ${f.enCurso
          ? '<span class="badge badge-e">Turno en curso</span>'
          : '<span class="badge" style="background:#ECEFF1;color:var(--texto-medio)">Finalizado</span>'}
      </div>
      <div class="modal-row"><span class="modal-key">⏰ Hora de inicio</span><span class="modal-val">${horaInicio}</span></div>
      <div class="modal-row"><span class="modal-key">⏱ Horas trabajadas</span><span class="modal-val">${f.horas.toFixed(2)} h</span></div>
      <div class="modal-row"><span class="modal-key">💲 Tarifa por hora</span><span class="modal-val">${formatCOP(TARIFA_HORA_OPERADOR)}</span></div>
      <div class="modal-total"><span>💰 Total a pagar</span><span>${formatCOP(f.pago)}</span></div>
    `;
    cont.appendChild(d);
  });
  document.getElementById('nominaTotalGeneral').textContent = formatCOP(totalGeneral);
}

/* ---- Cerrar modales al hacer clic fuera ---- */
document.getElementById('overlayTarifa').addEventListener('click', e => {
  if (e.target === document.getElementById('overlayTarifa')) cerrarTarifa();
});
document.getElementById('overlayDashboard').addEventListener('click', e => {
  if (e.target === document.getElementById('overlayDashboard')) cerrarDashboard();
});
document.getElementById('overlayNomina').addEventListener('click', e => {
  if (e.target === document.getElementById('overlayNomina')) cerrarNomina();
});
document.getElementById('overlayEditReserva').addEventListener('click', e => {
  if (e.target === document.getElementById('overlayEditReserva')) cerrarEdicionReserva();
});
