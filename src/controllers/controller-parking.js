/* 
   CONTROLLER-PARKING.JS — Núcleo operativo del parqueadero
   Archivo: src/controllers/controller-parking.js
 */

/* ---- RELOJ Y FECHA ---- */
function tick() {
  const n = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  document.getElementById("reloj").textContent =
    `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;

  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  document.getElementById("fecha").textContent =
    `${dias[n.getDay()]}, ${n.getDate()} ${meses[n.getMonth()]} ${n.getFullYear()}`;
}

/* ---- MAPA DE PUESTOS ---- */
function initMapa() {
  const mapa = document.getElementById("mapa");
  mapa.innerHTML = "";
  for (let i = 1; i <= CAPACIDAD; i++) {
    const d = document.createElement("div");
    d.className = "spot spot-libre";
    d.id = `p${i}`;
    d.title = `Puesto ${i} — Libre`;
    d.textContent = i;
    d.addEventListener("mouseenter", (e) => mostrarTooltipPuesto(i, e));
    d.addEventListener("mouseleave", () => ocultarTooltip());
    mapa.appendChild(d);
  }
  Object.entries(vehiculos).forEach(([placa, { puesto }]) =>
    setPuesto(puesto, true, placa),
  );
}

function setPuesto(n, ocup, placa = null) {
  const el = document.getElementById(`p${n}`);
  if (!el) return;
  if (ocup) {
    el.className = "spot spot-ocup spot-entrada-anim";
    el.textContent = "🚗";
    el.title = `Puesto ${n} — ${placa || "Ocupado"}`;
    setTimeout(() => el.classList.remove("spot-entrada-anim"), 600);
  } else {
    el.className = "spot spot-libre spot-salida-anim";
    el.textContent = n;
    el.title = `Puesto ${n} — Libre`;
    setTimeout(() => el.classList.remove("spot-salida-anim"), 600);
  }
}

/* ---- TOOLTIP ---- */
function mostrarTooltipPuesto(numPuesto, e) {
  const entrada = Object.entries(vehiculos).find(
    ([, v]) => v.puesto === numPuesto,
  );
  if (!entrada) return;
  const [placa, datos] = entrada;
  const { cobro, ms } = calcCobro(datos.entrada);
  const tooltip = document.getElementById("spotTooltip");
  tooltip.innerHTML = `
    <div class="tt-title">Puesto ${numPuesto}</div>
    <div class="tt-row"><span>🚗 Placa:</span><b>${placa}</b></div>
    <div class="tt-row"><span>⏱ Tiempo:</span><b>${formatDur(ms)}</b></div>
    <div class="tt-row"><span>💰 Cobro aprox:</span><b>${formatCOP(cobro)}</b></div>
    <div class="tt-row"><span>📅 Entró:</span><b>${datos.entrada.toLocaleTimeString("es-CO")}</b></div>
  `;
  tooltip.style.display = "block";
  tooltip.style.left = e.pageX + 12 + "px";
  tooltip.style.top = e.pageY - 10 + "px";
}

function ocultarTooltip() {
  document.getElementById("spotTooltip").style.display = "none";
}

/* ---- STATS ---- */
function actualizarStats() {
  const ocup = ocupados.size;
  const lib = CAPACIDAD - ocup;
  const pct = Math.round((ocup / CAPACIDAD) * 100);

  document.getElementById("s-ocup").textContent = ocup;
  document.getElementById("s-lib").textContent = lib;
  document.getElementById("s-ing").textContent = formatCOP(ingresos);
  document.getElementById("s-tot").textContent = totalHoy;
  document.getElementById("ocu-bar").style.width = pct + "%";
  document.getElementById("bar-pct-txt").textContent =
    `${ocup} / ${CAPACIDAD} puestos`;
  document.getElementById("bar-pct-lbl").textContent = `${pct}% ocupado`;
}

/* ---- LISTA DE ACTIVOS ---- */
function actualizarListaActivos() {
  const cont = document.getElementById("lista-activos");
  if (!cont) return;
  if (Object.keys(vehiculos).length === 0) {
    cont.innerHTML = '<div class="hist-empty">🅿️ No hay vehículos dentro</div>';
    return;
  }
  cont.innerHTML = "";
  Object.entries(vehiculos).forEach(([placa, { entrada, puesto }]) => {
    const { cobro, ms } = calcCobro(entrada);
    const d = document.createElement("div");
    d.className = "hist-item hist-activo";
    d.innerHTML = `
      <span class="activo-car">🚗</span>
      <span class="hist-placa">${placa}</span>
      <span class="hist-puesto">Puesto ${puesto}</span>
      <span class="hist-hora tiempo-live" data-entrada="${entrada.getTime()}">⏱ ${formatDur(ms)}</span>
      <span class="hist-monto">≈${formatCOP(cobro)}</span>
    `;
    cont.appendChild(d);
  });
}

/* ---- TIEMPOS EN VIVO ---- */
function actualizarTiemposVivos() {
  document.querySelectorAll(".tiempo-live").forEach((el) => {
    const ms = new Date() - new Date(parseInt(el.dataset.entrada));
    el.textContent = "⏱ " + formatDur(ms);
  });
}

/* ---- HISTORIAL ---- */
function pushHistorial(tipo, placa, monto) {
  const ahora = new Date();
  const hora = ahora.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const fecha = ahora.toLocaleDateString("es-CO");
  historial.unshift({ tipo, placa, hora, fecha, monto });
  PZ.guardarHistorial();
  renderHistorial();
}

function renderHistorial() {
  const cont = document.getElementById("historial");
  if (!cont) return;
  cont.innerHTML = "";
  if (historial.length === 0) {
    cont.innerHTML =
      '<div class="hist-empty">Sin movimientos registrados aún</div>';
    return;
  }
  historial.slice(0, 30).forEach((h) => {
    const d = document.createElement("div");
    d.className = "hist-item hist-item-anim";
    d.innerHTML = `
      <span class="badge badge-${h.tipo === "Entrada" ? "e" : "s"}">${h.tipo}</span>
      <span class="hist-placa">${h.placa}</span>
      <span class="hist-hora">${h.hora}</span>
      ${h.monto != null ? `<span class="hist-monto">${formatCOP(h.monto)}</span>` : ""}
    `;
    cont.appendChild(d);
  });
}

/* ---- REGISTRO DE ENTRADA ---- */
function registrarEntrada() {
  if (!tienePermiso(["operador", "administrador"])) {
    msg("⛔ Sin permiso para registrar entradas.", "error");
    return;
  }
  if (!turnoActivo && sesionActual.rol === "operador") {
    msg("⚠️ Debes <b>abrir tu turno</b> antes de registrar entradas.", "warn");
    return;
  }

  const placa = getPlaca();
  if (!placa) return;

  if (vehiculos[placa]) {
    msg(
      `El vehículo <b>${placa}</b> ya está en el Puesto <b>${vehiculos[placa].puesto}</b>.`,
      "error",
    );
    return;
  }

  const puesto = puestoLibre();
  if (!puesto) {
    msg("🔴 <b>Parqueadero lleno.</b> No hay puestos disponibles.", "error");
    return;
  }

  const reservaVinculada = buscarReservaActivablePorPlaca(placa);
  vehiculos[placa] = {
    entrada: new Date(),
    puesto,
    reservaId: reservaVinculada ? reservaVinculada.id : null,
  };
  ocupados.add(puesto);
  totalHoy++;

  if (reservaVinculada) {
    activarReservaModel(reservaVinculada, puesto);
    PZ.guardarReservas();
    renderMisReservas();
    renderReservasOperador();
  }

  PZ.guardarVehiculos();
  PZ.guardarContadores();

  setPuesto(puesto, true, placa);
  actualizarStats();
  actualizarListaActivos();
  pushHistorial("Entrada", placa, null);

  const hora = new Date().toLocaleTimeString("es-CO");
  const notaReserva = reservaVinculada
    ? ` (Reserva <b>${reservaVinculada.id}</b> vinculada)`
    : "";
  msg(
    `Vehículo <b>${placa}</b> ingresado en Puesto <b>${puesto}</b> a las ${hora}.${notaReserva}`,
    "ok",
  );
  limpiarInputPlaca();
}

/* ---- REGISTRO DE SALIDA ---- */
function registrarSalida() {
  if (!tienePermiso(["operador", "administrador"])) {
    msg("⛔ Sin permiso para registrar salidas.", "error");
    return;
  }

  const placa = getPlaca();
  if (!placa) return;

  if (!vehiculos[placa]) {
    msg(`El vehículo <b>${placa}</b> no está registrado como activo.`, "error");
    return;
  }

  const { entrada, puesto, reservaId } = vehiculos[placa];
  const { cobro, ms, minutos } = calcCobro(entrada);
  const horaE = entrada.toLocaleTimeString("es-CO");
  const horaS = new Date().toLocaleTimeString("es-CO");

  document.getElementById("modal-body").innerHTML = `
    <div class="modal-row"><span class="modal-key">🚗 Placa</span><span class="modal-val">${placa}</span></div>
    <div class="modal-row"><span class="modal-key">🅿️ Puesto</span><span class="modal-val">N° ${puesto}</span></div>
    <div class="modal-row"><span class="modal-key">⏬ Hora de entrada</span><span class="modal-val">${horaE}</span></div>
    <div class="modal-row"><span class="modal-key">⏫ Hora de salida</span><span class="modal-val">${horaS}</span></div>
    <div class="modal-row"><span class="modal-key">⏱ Duración</span><span class="modal-val">${formatDur(ms)}</span></div>
    <div class="modal-row"><span class="modal-key">⏳ Minutos cobrados</span><span class="modal-val">${minutos} min</span></div>
    <div class="modal-row"><span class="modal-key">💲 Tarifa</span><span class="modal-val">${formatCOP(TARIFA_MIN)}/minuto</span></div>
    <div class="modal-total">
      <span>💰 TOTAL A PAGAR</span>
      <span>${formatCOP(cobro)}</span>
    </div>
  `;
  document.getElementById("overlay").classList.add("show");

  if (reservaId) {
    const r = buscarReservaPorId(reservaId);
    if (r) finalizarReservaModel(r, cobro);
    PZ.guardarReservas();
    renderMisReservas();
    renderHistorialUsuario();
    renderReservasOperador();
  }

  delete vehiculos[placa];
  ocupados.delete(puesto);
  ingresos += cobro;

  PZ.guardarVehiculos();
  PZ.guardarContadores();

  setPuesto(puesto, false);
  actualizarStats();
  actualizarListaActivos();
  pushHistorial("Salida", placa, cobro);

  msg(
    `Vehículo <b>${placa}</b> salió del Puesto <b>${puesto}</b>. Total: <b>${formatCOP(cobro)}</b>`,
    "ok",
  );
  limpiarInputPlaca();
}

/* ---- VER ESTADO ---- */
function verEstado() {
  const ocup = ocupados.size;
  const lib = CAPACIDAD - ocup;
  const pct = Math.round((ocup / CAPACIDAD) * 100);
  let estado = "🟢 Disponible";
  if (pct >= 90) estado = "🔴 Casi lleno";
  else if (pct >= 70) estado = "🟡 Llenándose";
  msg(
    `${estado} — <b>${ocup}</b> ocupados · <b>${lib}</b> disponibles · <b>${pct}%</b> de ocupación`,
    "info",
  );
}

/* ---- CERRAR MODAL COBRO ---- */
function cerrarModal() {
  document.getElementById("overlay").classList.remove("show");
}

/* ---- Limpiar input placa ---- */
function limpiarInputPlaca() {
  const inp = document.getElementById("placa");
  const hint = document.getElementById("placaHint");
  if (inp) inp.value = "";
  if (hint) {
    hint.textContent = "Solo letras y números (ej: ABC123)";
    hint.className = "placa-hint";
  }
}

/* 
   INICIO DEL APP
 */
function initApp() {
  // Cargar datos persistidos antes de pintar la UI
  PZ.cargarTodo();

  // Actualizar footer con config cargada
  const ft = document.getElementById("footerTarifa");
  const fc = document.getElementById("footerCapacidad");
  if (ft) ft.textContent = TARIFA_MIN;
  if (fc) fc.textContent = CAPACIDAD;

  initMapa();
  actualizarStats();
  actualizarListaActivos();
  renderHistorial();
  tick();

  if (!window.__parkzoneIntervalsStarted) {
    setInterval(tick, 1000);
    setInterval(actualizarListaActivos, 10000);
    setInterval(actualizarTiemposVivos, 1000);
    window.__parkzoneIntervalsStarted = true;
  }
}

document.getElementById("overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("overlay")) cerrarModal();
});
