import { ENDPOINTS, REGION } from "./config.js";

// ---------- Sesión y permisos ----------
// Esta pantalla es solo para el administrador. Es una comodidad: el backend es el que bloquea a los demás roles.
const token = localStorage.getItem("adminToken");
const rol = localStorage.getItem("adminRol");
const autorizado = Boolean(token) && rol === "ADMIN";

if (!token) {
  window.location.href = "/admin/login.html";
} else if (rol !== "ADMIN") {
  window.location.href = "/admin/panel-turnos.html";
}

function cerrarSesion() {
  ["adminToken", "adminEmail", "adminNombre", "adminRol"].forEach((clave) =>
    localStorage.removeItem(clave)
  );
  window.location.href = "/admin/login.html";
}

// ---------- Llamadas a la API ----------
class ApiError extends Error {
  constructor(status, problema) {
    super((problema && (problema.detail || problema.title)) || `Error ${status}`);
    this.status = status;
    this.problema = problema;
  }
}

async function api(url, opciones = {}) {
  const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
  if (opciones.body) headers["Content-Type"] = "application/json";

  const respuesta = await fetch(url, { ...opciones, headers });

  if (respuesta.status === 401) {
    cerrarSesion();
    throw new ApiError(401, null);
  }
  if (respuesta.status === 403) {
    window.location.href = "/admin/panel-turnos.html";
    throw new ApiError(403, null);
  }

  const texto = await respuesta.text();
  let cuerpo = null;
  if (texto) {
    try {
      cuerpo = JSON.parse(texto);
    } catch (e) {
      cuerpo = null;
    }
  }
  if (!respuesta.ok) throw new ApiError(respuesta.status, cuerpo);
  return cuerpo;
}

// ---------- Utilidades ----------
const valor = (id) => document.getElementById(id)?.value ?? "";

function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatoPesos(numero) {
  const n = Number(numero) || 0;
  return new Intl.NumberFormat(REGION.locale, {
    style: "currency",
    currency: REGION.moneda,
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function avisar(mensaje, tipo = "success") {
  const toast = document.getElementById("notificationToast");
  document.getElementById("toastMessage").textContent = mensaje;
  toast.className = `toast text-white ${tipo === "success" ? "bg-success" : "bg-danger"}`;
  bootstrap.Toast.getOrCreateInstance(toast).show();
}

function abrirModal(id) {
  bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).show();
}

function cerrarModal(id) {
  bootstrap.Modal.getInstance(document.getElementById(id))?.hide();
}

function mensajeDeError(error, porDefecto) {
  if (error instanceof TypeError) return "No se pudo conectar con el servidor. Probá de nuevo en unos segundos.";
  return error.problema?.detail || error.problema?.title || porDefecto;
}

// Ventana de confirmación con el diseño del panel. Devuelve true si el usuario confirma.
function confirmar({ titulo, mensaje, textoBoton, peligro = false }) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById("modalConfirmar");
    const color = peligro ? "danger" : "success";

    modalEl.querySelector(".modal-content").className = `modal-content bg-dark border-${color}`;
    modalEl.querySelector(".modal-header").className = `modal-header border-${color}`;
    modalEl.querySelector(".modal-footer").className = `modal-footer border-${color}`;

    const etiqueta = document.getElementById("modalConfirmarLabel");
    etiqueta.className = `modal-title text-${color}`;
    etiqueta.textContent = titulo;
    document.getElementById("modalConfirmarTexto").textContent = mensaje;

    const boton = document.getElementById("btnConfirmarAccion");
    boton.className = `btn btn-${color}`;
    boton.textContent = textoBoton;

    let confirmado = false;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const alConfirmar = () => {
      confirmado = true;
      modal.hide();
    };
    boton.addEventListener("click", alConfirmar);
    modalEl.addEventListener(
      "hidden.bs.modal",
      () => {
        boton.removeEventListener("click", alConfirmar);
        resolve(confirmado);
      },
      { once: true }
    );
    modal.show();
  });
}

// ---------- Datos y pantalla ----------
let servicios = [];
let servicioEditandoId = null; // null = el formulario está creando un servicio nuevo

function filaServicio(s) {
  const activo = s.activo !== false;
  const botonEstado = activo
    ? `<button type="button" class="btn btn-outline-danger" data-accion="estado" data-id="${s.id}" data-activo="false" title="Desactivar servicio"><i class="bi bi-slash-circle"></i></button>`
    : `<button type="button" class="btn btn-outline-success" data-accion="estado" data-id="${s.id}" data-activo="true" title="Reactivar servicio"><i class="bi bi-check-circle"></i></button>`;

  return `
    <tr class="${activo ? "" : "opacity-50"}">
      <td><strong>${escapar(s.tipo)}</strong></td>
      <td>${escapar(formatoPesos(s.precio))}</td>
      <td>${activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Desactivado</span>'}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-outline-warning" data-accion="editar" data-id="${s.id}" title="Editar nombre y precio"><i class="bi bi-pencil"></i></button>
          ${botonEstado}
        </div>
      </td>
    </tr>`;
}

function mostrarServicios() {
  document.getElementById("tabla-servicios").innerHTML = servicios.length
    ? servicios.map(filaServicio).join("")
    : `<tr><td colspan="4" class="text-center text-white-50 py-4">Todavía no hay servicios. Creá el primero con "Nuevo servicio".</td></tr>`;
  document.getElementById("total-servicios").textContent = servicios.length;
}

async function cargarServicios() {
  try {
    const lista = (await api(ENDPOINTS.servicios)) || [];
    // Primero los activos, y dentro de cada grupo por nombre
    servicios = [...lista].sort(
      (a, b) =>
        (b.activo !== false) - (a.activo !== false) ||
        String(a.tipo).localeCompare(String(b.tipo))
    );
    mostrarServicios();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) avisar("No se pudieron cargar los servicios.", "error");
  }
}

// ---------- Crear y editar ----------
function prepararModal(editando) {
  document.getElementById("alerta-servicio").innerHTML = "";
  document.getElementById("aviso-precio").classList.toggle("d-none", !editando);
  document.getElementById("modalServicioLabel").innerHTML = editando
    ? `<i class="bi bi-pencil-square me-2"></i>Editar servicio`
    : `<i class="bi bi-plus-circle me-2"></i>Nuevo servicio`;
  document.getElementById("btn-guardar-servicio").innerHTML = editando
    ? `<i class="bi bi-check-lg me-1"></i>Guardar cambios`
    : `<i class="bi bi-check-lg me-1"></i>Crear servicio`;
}

function abrirNuevo() {
  servicioEditandoId = null;
  document.getElementById("formServicio").reset();
  prepararModal(false);
  abrirModal("modalServicio");
}

function abrirEditar(id) {
  const s = servicios.find((x) => x.id === id);
  if (!s) return;
  servicioEditandoId = id;
  document.getElementById("formServicio").reset();
  document.getElementById("servicioNombre").value = s.tipo;
  document.getElementById("servicioPrecio").value = s.precio;
  prepararModal(true);
  abrirModal("modalServicio");
}

async function guardarServicio() {
  const alerta = document.getElementById("alerta-servicio");
  const boton = document.getElementById("btn-guardar-servicio");
  alerta.innerHTML = "";

  const editando = servicioEditandoId !== null;
  const cuerpo = {
    tipo: valor("servicioNombre").trim(),
    precio: Number(valor("servicioPrecio")),
  };
  const url = editando ? `${ENDPOINTS.servicios}/${servicioEditandoId}` : ENDPOINTS.servicios;

  boton.disabled = true;
  try {
    await api(url, { method: editando ? "PUT" : "POST", body: JSON.stringify(cuerpo) });
    cerrarModal("modalServicio");
    await cargarServicios();
    avisar(editando ? "Servicio actualizado" : "Servicio creado");
  } catch (error) {
    if (error.status === 401 || error.status === 403) return;
    alerta.innerHTML = `<div class="alert alert-danger">${escapar(mensajeDeError(error, "No se pudo guardar el servicio."))}</div>`;
  } finally {
    boton.disabled = false;
  }
}

// ---------- Activar y desactivar ----------
async function cambiarEstado(id, activo) {
  const s = servicios.find((x) => x.id === id);
  if (!s) return;

  const confirmado = await confirmar(
    activo
      ? {
          titulo: "Reactivar servicio",
          mensaje: `¿Reactivar el servicio "${s.tipo}"?\n\nVolverá a poder elegirse al tomar turnos.`,
          textoBoton: "Reactivar",
          peligro: false,
        }
      : {
          titulo: "Desactivar servicio",
          mensaje: `¿Desactivar el servicio "${s.tipo}"?\n\nYa no se podrá elegir al tomar turnos nuevos. Los turnos anteriores lo seguirán mostrando.`,
          textoBoton: "Desactivar",
          peligro: true,
        }
  );
  if (!confirmado) return;

  try {
    await api(`${ENDPOINTS.servicios}/${id}/activo`, {
      method: "PUT",
      body: JSON.stringify({ activo }),
    });
    await cargarServicios();
    avisar(activo ? "Servicio reactivado" : "Servicio desactivado");
  } catch (error) {
    if (error.status === 401 || error.status === 403) return;
    avisar(mensajeDeError(error, "No se pudo cambiar el estado del servicio."), "error");
  }
}

// ---------- Eventos ----------
function alClickTabla(evento) {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;
  const id = Number(boton.dataset.id);
  if (boton.dataset.accion === "editar") abrirEditar(id);
  if (boton.dataset.accion === "estado") cambiarEstado(id, boton.dataset.activo === "true");
}

if (autorizado) {
  document.getElementById("btn-salir").addEventListener("click", cerrarSesion);
  document.getElementById("btn-nuevo-servicio").addEventListener("click", abrirNuevo);
  document.getElementById("tabla-servicios").addEventListener("click", alClickTabla);
  document.getElementById("formServicio").addEventListener("submit", (e) => {
    e.preventDefault();
    guardarServicio();
  });
  cargarServicios();
}