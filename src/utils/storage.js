/* 
   STORAGE.JS — Capa de persistencia con localStorage
   Archivo: src/utils/storage.js
   
   Claves usadas en localStorage:
   - pz_config        → { CAPACIDAD, TARIFA_MIN, COBRO_MINIMO, TARIFA_HORA_OPERADOR }
   - pz_vehiculos     → { placa: { entrada(ISO), puesto, reservaId } }
   - pz_historial     → [ { tipo, placa, hora, fecha, monto } ]
   - pz_ingresos      → número
   - pz_totalHoy      → número
   - pz_reservas      → [ ...reservas ] (fechas como ISO strings)
   - pz_contadorRes   → número
   - pz_turnos        → [ { operador, nombre, inicio(ISO), fin(ISO), horas } ]
   - pz_turnoActivo   → { usuario, nombre, inicio(ISO) } | null
 */

const PZ = {

  /* ---- Guardar toda la configuración editable ---- */
  guardarConfig() {
    localStorage.setItem('pz_config', JSON.stringify({
      CAPACIDAD, TARIFA_MIN, COBRO_MINIMO, TARIFA_HORA_OPERADOR
    }));
  },

  /* ---- Cargar configuración ---- */
  cargarConfig() {
    const raw = localStorage.getItem('pz_config');
    if (!raw) return;
    const cfg = JSON.parse(raw);
    CAPACIDAD            = cfg.CAPACIDAD            ?? CAPACIDAD;
    TARIFA_MIN           = cfg.TARIFA_MIN            ?? TARIFA_MIN;
    COBRO_MINIMO         = cfg.COBRO_MINIMO          ?? COBRO_MINIMO;
    TARIFA_HORA_OPERADOR = cfg.TARIFA_HORA_OPERADOR  ?? TARIFA_HORA_OPERADOR;
  },

  /* ---- Vehículos activos ---- */
  guardarVehiculos() {
    const serializable = {};
    Object.entries(vehiculos).forEach(([placa, v]) => {
      serializable[placa] = {
        entrada:   v.entrada instanceof Date ? v.entrada.toISOString() : v.entrada,
        puesto:    v.puesto,
        reservaId: v.reservaId
      };
    });
    localStorage.setItem('pz_vehiculos', JSON.stringify(serializable));
  },

  cargarVehiculos() {
    const raw = localStorage.getItem('pz_vehiculos');
    if (!raw) return;
    const data = JSON.parse(raw);
    vehiculos = {};
    Object.entries(data).forEach(([placa, v]) => {
      vehiculos[placa] = {
        entrada:   new Date(v.entrada),
        puesto:    v.puesto,
        reservaId: v.reservaId
      };
      ocupados.add(v.puesto);
    });
  },

  /* ---- Historial de movimientos ---- */
  guardarHistorial() {
    localStorage.setItem('pz_historial', JSON.stringify(historial));
  },

  cargarHistorial() {
    const raw = localStorage.getItem('pz_historial');
    if (!raw) return;
    historial = JSON.parse(raw);
  },

  /* ---- Ingresos y total atendidos ---- */
  guardarContadores() {
    localStorage.setItem('pz_ingresos',  JSON.stringify(ingresos));
    localStorage.setItem('pz_totalHoy',  JSON.stringify(totalHoy));
  },

  cargarContadores() {
    const ing = localStorage.getItem('pz_ingresos');
    const tot = localStorage.getItem('pz_totalHoy');
    if (ing !== null) ingresos  = JSON.parse(ing);
    if (tot !== null) totalHoy  = JSON.parse(tot);
  },

  /* ---- Reservas ---- */
  guardarReservas() {
    const serializable = reservas.map(r => ({
      ...r,
      horaEntradaReal: r.horaEntradaReal ? r.horaEntradaReal.toISOString() : null,
      horaSalidaReal:  r.horaSalidaReal  ? r.horaSalidaReal.toISOString()  : null,
      creada:          r.creada instanceof Date ? r.creada.toISOString() : r.creada
    }));
    localStorage.setItem('pz_reservas',    JSON.stringify(serializable));
    localStorage.setItem('pz_contadorRes', JSON.stringify(contadorReservaId));
  },

  cargarReservas() {
    const raw = localStorage.getItem('pz_reservas');
    const cnt = localStorage.getItem('pz_contadorRes');
    if (!raw) return;
    reservas = JSON.parse(raw).map(r => ({
      ...r,
      horaEntradaReal: r.horaEntradaReal ? new Date(r.horaEntradaReal) : null,
      horaSalidaReal:  r.horaSalidaReal  ? new Date(r.horaSalidaReal)  : null,
      creada:          r.creada          ? new Date(r.creada)           : new Date()
    }));
    if (cnt !== null) contadorReservaId = JSON.parse(cnt);
  },

  /* ---- Turnos cerrados ---- */
  guardarTurnos() {
    const serializable = turnos.map(t => ({
      ...t,
      inicio: t.inicio instanceof Date ? t.inicio.toISOString() : t.inicio,
      fin:    t.fin    instanceof Date ? t.fin.toISOString()    : t.fin
    }));
    localStorage.setItem('pz_turnos', JSON.stringify(serializable));
  },

  cargarTurnos() {
    const raw = localStorage.getItem('pz_turnos');
    if (!raw) return;
    turnos = JSON.parse(raw).map(t => ({
      ...t,
      inicio: new Date(t.inicio),
      fin:    new Date(t.fin)
    }));
  },

  /* ---- Turno activo actual ---- */
  guardarTurnoActivo() {
    if (turnoActivo && operadorTurnoActual && horaInicioTurno) {
      localStorage.setItem('pz_turnoActivo', JSON.stringify({
        usuario: operadorTurnoActual.usuario,
        nombre:  operadorTurnoActual.nombre,
        inicio:  horaInicioTurno.toISOString()
      }));
    } else {
      localStorage.removeItem('pz_turnoActivo');
    }
  },

  cargarTurnoActivo() {
    const raw = localStorage.getItem('pz_turnoActivo');
    if (!raw) return;
    const data = JSON.parse(raw);
    turnoActivo         = true;
    operadorTurnoActual = { usuario: data.usuario, nombre: data.nombre };
    horaInicioTurno     = new Date(data.inicio);
  },

  /* ---- Cargar TODO al iniciar la app ---- */
  cargarTodo() {
    this.cargarConfig();
    this.cargarVehiculos();
    this.cargarHistorial();
    this.cargarContadores();
    this.cargarReservas();
    this.cargarTurnos();
    this.cargarTurnoActivo();
  },

  /* ---- Borrar TODO (reset sistema) ---- */
  borrarTodo() {
    const claves = [
      'pz_config','pz_vehiculos','pz_historial',
      'pz_ingresos','pz_totalHoy','pz_reservas',
      'pz_contadorRes','pz_turnos','pz_turnoActivo'
    ];
    claves.forEach(k => localStorage.removeItem(k));
  }
};
