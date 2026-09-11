/* 
   CONTROLLER-RESERVAS.JS — Reservas de usuario y administración
   Archivo: src/controllers/controller-reservas.js
 */

const ESTADO_RESERVA_INFO = {
  pendiente: {
    texto: "Pendiente",
    style:
      "background:var(--naranja-suave);color:var(--naranja);border:1px solid #FFE0B2",
  },
  confirmada: {
    texto: "Confirmada",
    style:
      "background:var(--azul-suave);color:var(--azul);border:1px solid #BBDEFB",
  },
  activa: {
    texto: "Vehículo dentro",
    style:
      "background:var(--verde-suave);color:var(--verde);border:1px solid #C8E6C9",
  },
  finalizada: {
    texto: "Finalizada",
    style:
      "background:#ECEFF1;color:var(--texto-medio);border:1px solid var(--gris-borde)",
  },
  cancelada: {
    texto: "Cancelada",
    style:
      "background:var(--rojo-suave);color:var(--rojo);border:1px solid #FFCDD2",
  },
};

function badgeReserva(estado) {
  const info = ESTADO_RESERVA_INFO[estado] || ESTADO_RESERVA_INFO.pendiente;
  return `<span class="badge" style="${info.style}">${info.texto}</span>`;
}

/* 
   USUARIO — Crear reserva
 */
function crearReservaUsuario() {
  if (!tienePermiso(["usuario", "administrador"])) return;

  const placa = getPlaca("resPlaca", "resultadoReserva");
  if (!placa) return;

  const marca = document.getElementById("resMarca").value.trim();
  const modelo = document.getElementById("resModelo").value.trim();
  const color = document.getElementById("resColor").value.trim();
  const fecha = document.getElementById("resFecha").value;
  const horaEntrada = document.getElementById("resHoraEntrada").value;
  const horaSalida = document.getElementById("resHoraSalida").value;

  if (!marca || !modelo || !color) {
    msg(
      "⚠️ Completa la marca, modelo y color del vehículo.",
      "warn",
      "resultadoReserva",
    );
    return;
  }
  if (!fecha || !horaEntrada || !horaSalida) {
    msg(
      "⚠️ Selecciona la fecha y las horas de entrada y salida.",
      "warn",
      "resultadoReserva",
    );
    return;
  }
  if (horaEntrada >= horaSalida) {
    msg(
      "⚠️ La hora de salida debe ser posterior a la de entrada.",
      "warn",
      "resultadoReserva",
    );
    return;
  }

  const reserva = crearReserva({
    usuario: sesionActual.usuario,
    nombreUsuario: sesionActual.nombre,
    placa,
    marca,
    modelo,
    color,
    fecha,
    horaEntrada,
    horaSalida,
  });

  PZ.guardarReservas();
  renderMisReservas();
  renderReservasOperador();
  msg(
    `✅ Reserva <b>${reserva.id}</b> creada para la placa <b>${placa}</b>. Costo estimado: <b>${formatCOP(reserva.costoEstimado)}</b>.`,
    "ok",
    "resultadoReserva",
  );
  limpiarFormularioReserva();
}

function limpiarFormularioReserva() {
  [
    "resPlaca",
    "resMarca",
    "resModelo",
    "resColor",
    "resHoraEntrada",
    "resHoraSalida",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const hint = document.getElementById("placaHint2");
  if (hint) {
    hint.textContent = "Solo letras y números (ej: ABC123)";
    hint.className = "placa-hint";
  }
}

/* 
   USUARIO — Mis reservas activas/pendientes
*/
function renderMisReservas() {
  const cont = document.getElementById("lista-mis-reservas");
  if (!cont || !sesionActual) return;

  const propias = reservasDeUsuario(sesionActual.usuario).filter((r) =>
    ["pendiente", "confirmada", "activa"].includes(r.estado),
  );

  if (propias.length === 0) {
    cont.innerHTML =
      '<div class="hist-empty">📭 No tienes reservas activas o pendientes</div>';
    return;
  }
  cont.innerHTML = "";
  propias.forEach((r) => renderTarjetaReservaUsuario(r, cont));
}

/* 
   USUARIO — Historial de reservas
 */
function renderHistorialUsuario() {
  const cont = document.getElementById("lista-historial-usuario");
  if (!cont || !sesionActual) return;

  const hist = historialReservasUsuario(sesionActual.usuario);
  if (hist.length === 0) {
    cont.innerHTML =
      '<div class="hist-empty">📭 Aún no tienes reservas finalizadas o canceladas</div>';
    return;
  }
  cont.innerHTML = "";
  hist.forEach((r) => renderTarjetaReservaUsuario(r, cont));
}

/* 
   Tarjeta de reserva reutilizable
*/
function renderTarjetaReservaUsuario(r, contenedor) {
  const horaEntradaTxt = r.horaEntradaReal
    ? formatHora(r.horaEntradaReal) + " (real)"
    : r.horaEntradaPlan + " (planeada)";
  const horaSalidaTxt = r.horaSalidaReal
    ? formatHora(r.horaSalidaReal) + " (real)"
    : r.horaSalidaPlan + " (planeada)";
  const costoTxt =
    r.costoFinal != null
      ? `${formatCOP(r.costoFinal)} <span style="color:var(--texto-suave);font-size:0.8em">(final)</span>`
      : `≈${formatCOP(r.costoEstimado)} <span style="color:var(--texto-suave);font-size:0.8em">(estimado)</span>`;

  let tiempoPermanencia = "—";
  if (r.estado === "activa" && r.horaEntradaReal) {
    tiempoPermanencia = formatDur(new Date() - r.horaEntradaReal);
  } else if (r.horaEntradaReal && r.horaSalidaReal) {
    tiempoPermanencia = formatDur(r.horaSalidaReal - r.horaEntradaReal);
  }

  const d = document.createElement("div");
  d.className = "hist-item hist-item-anim";
  d.style.cssText = "flex-direction:column;align-items:stretch;gap:0.3rem";
  d.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span class="hist-placa">🚗 ${r.placa} &nbsp;<span style="font-size:0.8em;color:var(--texto-suave)">${r.id}</span></span>
      ${badgeReserva(r.estado)}
    </div>
    <div class="modal-row"><span class="modal-key">🚙 Vehículo</span><span class="modal-val">${r.marca} ${r.modelo} — ${r.color}</span></div>
    <div class="modal-row"><span class="modal-key">📅 Fecha de reserva</span><span class="modal-val">${r.fechaReserva}</span></div>
    <div class="modal-row"><span class="modal-key">⏬ Hora de entrada</span><span class="modal-val">${horaEntradaTxt}</span></div>
    <div class="modal-row"><span class="modal-key">⏫ Hora de salida</span><span class="modal-val">${horaSalidaTxt}</span></div>
    <div class="modal-row"><span class="modal-key">⏱ Tiempo permanencia</span><span class="modal-val">${tiempoPermanencia}</span></div>
    <div class="modal-row"><span class="modal-key">💰 Costo</span><span class="modal-val">${costoTxt}</span></div>
    ${
      r.estado === "pendiente"
        ? `
    <div style="display:flex;gap:0.5rem;margin-top:0.4rem">
      <button class="btn btn-op" style="flex:1;font-size:0.8em;padding:0.4rem" onclick="abrirEdicionReserva('${r.id}')">✏️ Editar</button>
      <button class="btn btn-salida" style="flex:1;font-size:0.8em;padding:0.4rem" onclick="cancelarMiReserva('${r.id}')">🚫 Cancelar</button>
    </div>`
        : ""
    }
  `;
  contenedor.appendChild(d);
}

/* 
   USUARIO — Cancelar reserva
*/
function cancelarMiReserva(id) {
  if (!tienePermiso(["usuario", "administrador"])) return;
  const r = buscarReservaPorId(id);
  if (!r || r.usuario !== sesionActual.usuario) return;
  if (!confirm(`¿Cancelar la reserva ${id}?`)) return;
  cancelarReservaModel(id);
  PZ.guardarReservas();
  renderMisReservas();
  renderHistorialUsuario();
  renderReservasOperador();
  msg(`Reserva <b>${id}</b> cancelada.`, "ok", "resultadoReserva");
}

/* 
   USUARIO — Editar reserva pendiente
*/
function abrirEdicionReserva(id) {
  if (!tienePermiso(["usuario", "administrador"])) return;
  const r = buscarReservaPorId(id);
  if (!r || r.estado !== "pendiente" || r.usuario !== sesionActual.usuario)
    return;

  document.getElementById("editResId").value = r.id;
  document.getElementById("editResPlaca").value = r.placa;
  document.getElementById("editResMarca").value = r.marca;
  document.getElementById("editResModelo").value = r.modelo;
  document.getElementById("editResColor").value = r.color;
  document.getElementById("editResFecha").value = r.fechaReserva;
  document.getElementById("editResHoraEntrada").value = r.horaEntradaPlan;
  document.getElementById("editResHoraSalida").value = r.horaSalidaPlan;
  limpiarMsg("editResMsg");
  document.getElementById("overlayEditReserva").classList.add("show");
}

function guardarEdicionReserva() {
  const id = document.getElementById("editResId").value;
  const placa = document
    .getElementById("editResPlaca")
    .value.trim()
    .toUpperCase()
    .replace(/\s/g, "");
  const marca = document.getElementById("editResMarca").value.trim();
  const modelo = document.getElementById("editResModelo").value.trim();
  const color = document.getElementById("editResColor").value.trim();
  const fecha = document.getElementById("editResFecha").value;
  const horaEntrada = document.getElementById("editResHoraEntrada").value;
  const horaSalida = document.getElementById("editResHoraSalida").value;

  if (
    !placa ||
    !marca ||
    !modelo ||
    !color ||
    !fecha ||
    !horaEntrada ||
    !horaSalida
  ) {
    msg("⚠️ Completa todos los campos.", "warn", "editResMsg");
    return;
  }
  const regexPlaca = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]$/;
  if (!regexPlaca.test(placa)) {
    msg('⚠️ Formato de placa inválido. Usa letras y números (ej: ABC123).', 'warn', 'editResMsg');
    return;
  }
  if (horaEntrada >= horaSalida) {
    msg(
      "⚠️ La hora de salida debe ser posterior a la de entrada.",
      "warn",
      "editResMsg",
    );
    return;
  }

  editarReserva(id, {
    placa,
    marca,
    modelo,
    color,
    fecha,
    horaEntrada,
    horaSalida,
  });
  PZ.guardarReservas();
  cerrarEdicionReserva();
  renderMisReservas();
  renderReservasOperador();
  msg(
    `✅ Reserva <b>${id}</b> actualizada correctamente.`,
    "ok",
    "resultadoReserva",
  );
}

function cerrarEdicionReserva() {
  document.getElementById("overlayEditReserva").classList.remove("show");
}

/* 
   USUARIO — Consultar mi vehículo
 */
function consultarMiVehiculo() {
  const placa = getPlaca("placaConsulta", "resultadoMiVehiculo");
  if (!placa) return;

  if (vehiculos[placa]) {
    const { entrada, puesto } = vehiculos[placa];
    const { cobro, ms } = calcCobro(entrada);
    msg(
      `
      🟢 <b>${placa}</b> está dentro del parqueadero.<br>
      🅿️ Puesto: <b>${puesto}</b> &nbsp;|&nbsp;
      ⏱ Tiempo: <b>${formatDur(ms)}</b> &nbsp;|&nbsp;
      💰 Cobro aprox.: <b>${formatCOP(cobro)}</b>
    `,
      "ok",
      "resultadoMiVehiculo",
    );
  } else {
    const reservaPendiente = reservas.find(
      (r) =>
        r.placa === placa &&
        ["pendiente", "confirmada"].includes(r.estado) &&
        r.usuario === sesionActual.usuario,
    );
    if (reservaPendiente) {
      msg(
        `⏳ <b>${placa}</b> tiene una reserva <b>${reservaPendiente.estado}</b> para el ${reservaPendiente.fechaReserva}. Aún no ha ingresado.`,
        "info",
        "resultadoMiVehiculo",
      );
    } else {
      msg(
        `⚪ <b>${placa}</b> no está registrada dentro del parqueadero en este momento.`,
        "warn",
        "resultadoMiVehiculo",
      );
    }
  }
}

/* 
   OPERADOR/ADMIN — Lista de reservas
*/
function renderReservasOperador() {
  const cont = document.getElementById("lista-reservas-operador");
  if (!cont) return;

  const activas = reservasPendientesYActivas();
  if (activas.length === 0) {
    cont.innerHTML =
      '<div class="hist-empty">No hay reservas pendientes o activas</div>';
    return;
  }
  cont.innerHTML = "";
  activas.forEach((r) => {
    const d = document.createElement("div");
    d.className = "hist-item hist-item-anim";
    d.style.cssText = "flex-direction:column;align-items:stretch;gap:0.3rem";
    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="hist-placa">🚗 ${r.placa} &nbsp;<span style="font-size:0.8em;color:var(--texto-suave)">${r.id}</span></span>
        ${badgeReserva(r.estado)}
      </div>
      <div class="modal-row"><span class="modal-key">👤 Usuario</span><span class="modal-val">${r.nombreUsuario}</span></div>
      <div class="modal-row"><span class="modal-key">🚙 Vehículo</span><span class="modal-val">${r.marca} ${r.modelo} — ${r.color}</span></div>
      <div class="modal-row"><span class="modal-key">📅 Fecha</span><span class="modal-val">${r.fechaReserva}</span></div>
      <div class="modal-row"><span class="modal-key">🕐 Horario</span><span class="modal-val">${r.horaEntradaPlan} → ${r.horaSalidaPlan}</span></div>
      <div class="modal-row"><span class="modal-key">💰 Costo estimado</span><span class="modal-val">${formatCOP(r.costoEstimado)}</span></div>
      ${
        r.estado === "pendiente"
          ? `
      <div style="display:flex;gap:0.5rem;margin-top:0.4rem">
        <button class="btn btn-entrada" style="flex:1;font-size:0.8em;padding:0.4rem" onclick="confirmarReservaOp('${r.id}')">✅ Confirmar</button>
        <button class="btn btn-salida"  style="flex:1;font-size:0.8em;padding:0.4rem" onclick="cancelarReservaOp('${r.id}')">🚫 Cancelar</button>
      </div>`
          : ""
      }
    `;
    cont.appendChild(d);
  });
}

function confirmarReservaOp(id) {
  if (!tienePermiso(["operador", "administrador"])) return;
  const r = confirmarReservaModel(id);
  if (r) {
    PZ.guardarReservas();
    renderReservasOperador();
    renderMisReservas();
    msg(`✅ Reserva <b>${id}</b> confirmada.`, "ok", "panelOpResult");
  }
}

function cancelarReservaOp(id) {
  if (!tienePermiso(["operador", "administrador"])) return;
  if (!confirm(`¿Cancelar la reserva ${id}?`)) return;
  const r = cancelarReservaModel(id);
  if (r) {
    PZ.guardarReservas();
    renderReservasOperador();
    renderMisReservas();
    renderHistorialUsuario();
    msg(`Reserva <b>${id}</b> cancelada.`, "ok", "panelOpResult");
  }
}
