/* 
   ALERTS.JS — Renderizador genérico de mensajes en pantalla
   Archivo: src/utils/alerts.js
*/

/* ---- Mostrar mensaje dentro de cualquier contenedor de resultado ---- */
function msg(texto, tipo = 'info', contenedor = 'resultado') {
  const clases = { ok: 'msg-ok', error: 'msg-error', info: 'msg-info', warn: 'msg-warn' };
  const iconos = { ok: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  const el = document.getElementById(contenedor);
  if (!el) return;
  el.innerHTML = `<div class="msg ${clases[tipo] || 'msg-info'} msg-anim">${iconos[tipo] || 'ℹ️'} ${texto}</div>`;
}

/* ---- Limpiar un contenedor de mensajes ---- */
function limpiarMsg(contenedor = 'resultado') {
  const el = document.getElementById(contenedor);
  if (el) el.innerHTML = '';
}
