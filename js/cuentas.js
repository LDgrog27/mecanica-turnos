import { ENDPOINTS } from "./config.js";

// ---------- Sesión y permisos ----------
// Esta pantalla es solo para el administrador. Es una comodidad: el backend es el que bloquea a los demás roles.
const token = localStorage.getItem("adminToken");
const rol = localStorage.getItem("adminRol");
const miEmail = (localStorage.getItem("adminEmail") || "").toLowerCase();
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

// Contraseña aleatoria sin caracteres que se confunden (0/O, 1/l/I)
function generarClave(largo = 12) {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const valores = new Uint32Array(largo);
  crypto.getRandomValues(valores);
  return Array.from(valores, (v) => letras[v % letras.length]).join("");
}

// ---------- Datos y pantalla ----------
const ROLES = {
  ADMIN: ["Administrador", "bg-danger"],
  OPERADOR: ["Operador", "bg-info text-dark"],
  VISOR: ["Visor", "bg-secondary"],
};

let cuentas = [];
let cuentaClaveId = null;

function nombreCompleto(c) {
  return `${c.nombre || ""} ${c.apellido || ""}`.trim() || c.email || "Sin nombre";
}

function filaCuenta(c) {
  const [nombreRol, claseRol] = ROLES[c.rol] || [c.rol || "—", "bg-secondary"];
  const esMia = (c.email || "").toLowerCase() === miEmail;
  const activa = c.activo !== false;

  const botonEstado = activa
    ? `<button type="button" class="btn btn-outline-danger" data-accion="estado" data-id="${c.id}" data-activo="false" ${
        esMia ? 'disabled title="No podés desactivar tu propia cuenta"' : 'title="Desactivar cuenta"'
      }><i class="bi bi-person-slash"></i></button>`
    : `<button type="button" class="btn btn-outline-success" data-accion="estado" data-id="${c.id}" data-activo="true" title="Reactivar cuenta"><i class="bi bi-person-check"></i></button>`;

  return `
    <tr class="${activa ? "" : "opacity-50"}">
      <td>
        <strong>${escapar(nombreCompleto(c))}</strong>
        ${esMia ? '<span class="badge bg-warning text-dark ms-1">vos</span>' : ""}
      </td>
      <td>${escapar(c.email)}</td>
      <td><span class="badge ${claseRol}">${escapar(nombreRol)}</span></td>
      <td>${activa ? '<span class="badge bg-success">Activa</span>' : '<span class="badge bg-secondary">Desactivada</span>'}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-outline-info" data-accion="clave" data-id="${c.id}" title="Cambiar contraseña"><i class="bi bi-key"></i></button>
          ${botonEstado}
        </div>
      </td>
    </tr>`;
}

function mostrarCuentas() {
  document.getElementById("tabla-cuentas").innerHTML = cuentas.length
    ? cuentas.map(filaCuenta).join("")
    : `<tr><td colspan="5" class="text-center text-white-50 py-4">No hay cuentas para mostrar</td></tr>`;
  document.getElementById("total-cuentas").textContent = cuentas.length;
}

async function cargarCuentas() {
  try {
    const lista = (await api(ENDPOINTS.administradores)) || [];
    cuentas = [...lista].sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b)));
    mostrarCuentas();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) avisar("No se pudieron cargar las cuentas.", "error");
  }
}

// ---------- Nueva cuenta ----------
function abrirNuevaCuenta() {
  document.getElementById("formCuenta").reset();
  document.getElementById("alerta-cuenta").innerHTML = "";
  document.getElementById("cuentaClave").type = "password";
  abrirModal("modalCuenta");
}

async function guardarCuenta() {
  const alerta = document.getElementById("alerta-cuenta");
  const boton = document.getElementById("btn-guardar-cuenta");
  alerta.innerHTML = "";

  const cuerpo = {
    nombre: valor("cuentaNombre").trim(),
    apellido: valor("cuentaApellido").trim(),
    email: valor("cuentaEmail").trim(),
    contrasenia: valor("cuentaClave"),
    rol: valor("cuentaRol"),
  };

  boton.disabled = true;
  try {
    await api(ENDPOINTS.administradores, { method: "POST", body: JSON.stringify(cuerpo) });
    cerrarModal("modalCuenta");
    await cargarCuentas();
    avisar("Cuenta creada");
  } catch (error) {
    if (error.status === 401 || error.status === 403) return;
    alerta.innerHTML = `<div class="alert alert-danger">${escapar(mensajeDeError(error, "No se pudo crear la cuenta."))}</div>`;
  } finally {
    boton.disabled = false;
  }
}

// ---------- Cambiar contraseña ----------
function abrirClave(id) {
  const c = cuentas.find((x) => x.id === id);
  if (!c) return;
  cuentaClaveId = id;
  document.getElementById("formClave").reset();
  document.getElementById("alerta-clave").innerHTML = "";
  document.getElementById("claveNueva").type = "password";
  document.getElementById("clave-cuenta").textContent = `${nombreCompleto(c)} (${c.email})`;
  abrirModal("modalClave");
}

async function guardarClave() {
  const alerta = document.getElementById("alerta-clave");
  const boton = document.getElementById("btn-guardar-clave");
  alerta.innerHTML = "";

  boton.disabled = true;
  try {
    await api(`${ENDPOINTS.administradores}/${cuentaClaveId}/contrasenia`, {
      method: "PUT",
      body: JSON.stringify({ contrasenia: valor("claveNueva") }),
    });
    cerrarModal("modalClave");
    avisar("Contraseña actualizada");
  } catch (error) {
    if (error.status === 401 || error.status === 403) return;
    alerta.innerHTML = `<div class="alert alert-danger">${escapar(mensajeDeError(error, "No se pudo cambiar la contraseña."))}</div>`;
  } finally {
    boton.disabled = false;
  }
}

// ---------- Activar y desactivar ----------
async function cambiarEstado(id, activo) {
  const c = cuentas.find((x) => x.id === id);
  if (!c) return;
  const pregunta = activo
    ? `¿Reactivar la cuenta de ${nombreCompleto(c)}?`
    : `¿Desactivar la cuenta de ${nombreCompleto(c)}?\n\nNo podrá iniciar sesión y, si ya tenía una sesión abierta, dejará de funcionar de inmediato.`;
  if (!window.confirm(pregunta)) return;

  try {
    await api(`${ENDPOINTS.administradores}/${id}/activo`, {
      method: "PUT",
      body: JSON.stringify({ activo }),
    });
    await cargarCuentas();
    avisar(activo ? "Cuenta reactivada" : "Cuenta desactivada");
  } catch (error) {
    if (error.status === 401 || error.status === 403) return;
    avisar(mensajeDeError(error, "No se pudo cambiar el estado de la cuenta."), "error");
  }
}

// ---------- Eventos ----------
function alClickTabla(evento) {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton || boton.disabled) return;
  const id = Number(boton.dataset.id);
  if (boton.dataset.accion === "clave") abrirClave(id);
  if (boton.dataset.accion === "estado") cambiarEstado(id, boton.dataset.activo === "true");
}

function alClickClave(evento) {
  const boton = evento.target.closest("button[data-clave-accion]");
  if (!boton) return;
  const campo = document.getElementById(boton.dataset.claveCampo);
  const accion = boton.dataset.claveAccion;

  if (accion === "ver") {
    campo.type = campo.type === "password" ? "text" : "password";
  }
  if (accion === "generar") {
    campo.value = generarClave();
    campo.type = "text"; // se muestra para que se pueda copiar o anotar
  }
  if (accion === "copiar") {
    if (!campo.value) return;
    navigator.clipboard
      ?.writeText(campo.value)
      .then(() => avisar("Contraseña copiada"))
      .catch(() => avisar("No se pudo copiar. Seleccionala y copiala a mano.", "error"));
  }
}

if (autorizado) {
  document.getElementById("btn-salir").addEventListener("click", cerrarSesion);
  document.getElementById("btn-nueva-cuenta").addEventListener("click", abrirNuevaCuenta);
  document.getElementById("tabla-cuentas").addEventListener("click", alClickTabla);
  document.addEventListener("click", alClickClave);
  document.getElementById("formCuenta").addEventListener("submit", (e) => {
    e.preventDefault();
    guardarCuenta();
  });
  document.getElementById("formClave").addEventListener("submit", (e) => {
    e.preventDefault();
    guardarClave();
  });
  cargarCuentas();
}