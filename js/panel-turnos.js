import { ENDPOINTS, HORARIOS_LABORALES, CUPO_DIARIO, MARCAS, REGION } from "./config.js";

// ---------- Sesión y permisos ----------
// Ocultar botones en pantalla es solo comodidad: los permisos reales los controla el backend.
const token = localStorage.getItem("adminToken");
if (!token) {
  window.location.href = "/admin/login.html";
}
const rol = localStorage.getItem("adminRol") || "VISOR";
const esAdmin = rol === "ADMIN";
const puedeEditar = rol === "ADMIN" || rol === "OPERADOR";
const NOMBRES_ROL = { ADMIN: "Administrador", OPERADOR: "Operador", VISOR: "Visor" };

// Debe coincidir con documentos.max-bytes del backend (5 MB)
const MAX_PDF_BYTES = 5 * 1024 * 1024;

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
  // Con archivos (FormData) el navegador define solo el Content-Type
  if (opciones.body && !(opciones.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const respuesta = await fetch(url, { ...opciones, headers });

  if (respuesta.status === 401) {
    cerrarSesion();
    throw new ApiError(401, null);
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

// Evita que un texto escrito por un cliente se interprete como HTML
function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function formatearFecha(iso) {
  return iso ? iso.split("-").reverse().join("/") : "";
}

function formatearFechaHora(iso) {
  if (!iso) return "";
  const fecha = new Date(String(iso).substring(0, 19));
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleString(REGION.locale, { dateStyle: "short", timeStyle: "short" });
}

function formatoTamanio(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatoPesos(numero) {
  if (numero === null || numero === undefined || Number.isNaN(Number(numero))) return "—";
  return new Intl.NumberFormat(REGION.locale, {
    style: "currency", currency: REGION.moneda, maximumFractionDigits: 0,
  }).format(Number(numero));
}

// Arma el link de WhatsApp para cualquier número cargado: solo devuelve vacío si no hay ningún dígito.
// - Números con "+" o "00" al inicio se toman como internacionales y se respetan.
// - El resto se toma como número de México (código 52 + 10 dígitos), sacando prefijos como 0, 044, 045 o 01.
function linkWhatsApp(telefono) {
  const texto = String(telefono || "").trim();
  let digitos = texto.replace(/\D/g, "");
  if (!digitos) return "";

  if (texto.startsWith("+") || digitos.startsWith("00")) {
    digitos = digitos.replace(/^00/, "");
    if (digitos.length === 13 && digitos.startsWith("521")) digitos = "52" + digitos.slice(3);
    return `https://wa.me/${digitos}`;
  }

  digitos = digitos.replace(/^(044|045|01)/, "").replace(/^0+/, "");
  if (digitos.length === 13 && digitos.startsWith("521")) digitos = digitos.slice(3);
  else if (digitos.length === 12 && digitos.startsWith("52")) digitos = digitos.slice(2);

  return `https://wa.me/${REGION.codigoTelefono}${digitos}`;
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

// ---------- Datos ----------
let todos = [];          // todos los turnos
let resultados = null;   // resultados de la búsqueda del servidor (null = sin búsqueda)
let servicios = [];
let turnoAEliminar = null;
let turnoDetalleId = null;
let turnoEditandoId = null; // null = el formulario está creando un turno nuevo
let temporizadorBusqueda = null;

function normalizar(t) {
  const [fecha, horaCompleta] = (t.fechaHora || "").split("T");
  return {
    id: t.id,
    fecha: fecha || "",
    hora: (horaCompleta || "").substring(0, 5),
    nombre: t.nombreCliente || "",
    apellido: t.apellidoCliente || "",
    cliente: `${t.nombreCliente || ""} ${t.apellidoCliente || ""}`.trim() || "Sin nombre",
    telefono: t.telefonoCliente || "",
    email: t.emailCliente || "",
    idServicio: t.idServicio,
    servicio: t.tipoServicio || "",
    precio: t.precioServicio ?? null,
    patente: t.patente || "",
    marca: t.marca || "",
    modelo: t.modelo || "",
    anio: t.anio ?? null,
    color: t.color || "",
  };
}

async function cargarTurnos() {
  const lista = await api(ENDPOINTS.turnos);
  todos = (lista || []).map(normalizar);
}

async function cargarServicios() {
  servicios = (await api(ENDPOINTS.servicios)) || [];
}

async function buscarEnServidor(texto) {
  const lista = await api(`${ENDPOINTS.turnos}/buscar?q=${encodeURIComponent(texto)}`);
  resultados = (lista || []).map(normalizar);
}

async function refrescar(mostrarAviso = false) {
  try {
    await cargarTurnos();
    const texto = valor("buscar-turno").trim();
    if (texto.length >= 2) await buscarEnServidor(texto);
    else resultados = null;
    mostrarTurnos();
    if (mostrarAviso) avisar("Datos actualizados");
  } catch (error) {
    if (error.status !== 401) avisar("No se pudieron actualizar los datos.", "error");
  }
}

// ---------- Filtros ----------
function rangoFiltro(clave) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  switch (clave) {
    case "hoy":
      return [fechaLocalISO(hoy), fechaLocalISO(hoy)];
    case "manana": {
      const manana = new Date(hoy);
      manana.setDate(hoy.getDate() + 1);
      return [fechaLocalISO(manana), fechaLocalISO(manana)];
    }
    case "semana": {
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      return [fechaLocalISO(lunes), fechaLocalISO(domingo)];
    }
    case "mes": {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      return [fechaLocalISO(inicio), fechaLocalISO(fin)];
    }
    default:
      return [null, null];
  }
}

function turnosVisibles() {
  let lista = resultados ?? todos;

  const [desdeRapido, hastaRapido] = rangoFiltro(valor("filtro-fecha"));
  const desde = valor("filtro-fecha-desde") || desdeRapido;
  const hasta = valor("filtro-fecha-hasta") || hastaRapido;
  if (desde) lista = lista.filter((t) => t.fecha >= desde);
  if (hasta) lista = lista.filter((t) => t.fecha <= hasta);

  const servicio = valor("filtro-servicio");
  if (servicio && servicio !== "todos") {
    lista = lista.filter((t) => String(t.idServicio) === servicio);
  }

  // Fecha más reciente primero; dentro del mismo día, por hora de llegada
  return [...lista].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || a.hora.localeCompare(b.hora) || a.id - b.id
  );
}

function limpiarFiltros() {
  document.getElementById("buscar-turno").value = "";
  document.getElementById("filtro-fecha").value = "todos";
  document.getElementById("filtro-fecha-desde").value = "";
  document.getElementById("filtro-fecha-hasta").value = "";
  document.getElementById("filtro-servicio").value = "todos";
  resultados = null;
  mostrarTurnos();
}

// ---------- Pantalla ----------
function filaTurno(t) {
  const vehiculo = [t.marca, t.modelo].filter(Boolean).join(" ");
  const wa = linkWhatsApp(t.telefono);
  return `
    <tr>
      <td>${escapar(formatearFecha(t.fecha))}</td>
      <td><strong>${escapar(t.hora)}</strong></td>
      <td>
        <div>${escapar(t.cliente)}</div>
        <small class="text-muted">${escapar(t.telefono)}</small>
        ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="ms-1 text-success" title="Abrir WhatsApp"><i class="bi bi-whatsapp"></i></a>` : ""}
      </td>
      <td>
        <div><strong>${escapar(t.patente)}</strong></div>
        <small class="text-muted">${escapar(vehiculo)}</small>
      </td>
      <td>${escapar(t.servicio)}</td>
      ${esAdmin ? `<td><strong>${escapar(formatoPesos(t.precio))}</strong></td>` : ""}
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-outline-info" data-accion="ver" data-id="${t.id}" title="Ver detalle y PDF"><i class="bi bi-eye"></i></button>
          ${puedeEditar ? `<button type="button" class="btn btn-outline-warning" data-accion="editar" data-id="${t.id}" title="Editar"><i class="bi bi-pencil"></i></button>` : ""}
          ${esAdmin ? `<button type="button" class="btn btn-outline-danger" data-accion="eliminar" data-id="${t.id}" title="Eliminar"><i class="bi bi-trash"></i></button>` : ""}
        </div>
      </td>
    </tr>`;
}

function mostrarTurnos() {
  const lista = turnosVisibles();
  const columnas = esAdmin ? 7 : 6;
  document.getElementById("tabla-turnos").innerHTML = lista.length
    ? lista.map(filaTurno).join("")
    : `<tr><td colspan="${columnas}" class="text-center text-muted py-4">No hay turnos para mostrar</td></tr>`;
  document.getElementById("total-turnos").textContent =
    `${lista.length} ${lista.length === 1 ? "turno" : "turnos"}`;
  document.getElementById("stats-total").textContent = lista.length;
  actualizarContadoresHoy();
}

function actualizarContadoresHoy() {
  const deHoy = todos.filter((t) => t.fecha === fechaLocalISO());
  document.getElementById("stats-hoy").textContent = `${deHoy.length}/${CUPO_DIARIO}`;
  if (esAdmin) {
    const total = deHoy.reduce((suma, t) => suma + (Number(t.precio) || 0), 0);
    document.getElementById("stats-ingresos").textContent = formatoPesos(total);
  }
}

function llenarSelectsServicio() {
  const opciones = servicios
    .map((s) => {
      const precio = esAdmin && s.precio != null ? ` - ${formatoPesos(s.precio)}` : "";
      return `<option value="${s.id}">${escapar(s.tipo)}${escapar(precio)}</option>`;
    })
    .join("");
  document.getElementById("nuevoServicio").innerHTML =
    `<option value="">Seleccionar servicio</option>${opciones}`;
  document.getElementById("filtro-servicio").innerHTML =
    `<option value="todos">Todos los servicios</option>` +
    servicios.map((s) => `<option value="${s.id}">${escapar(s.tipo)}</option>`).join("");
}

function buscarTurno(id) {
  return [...todos, ...(resultados || [])].find((x) => x.id === id);
}

// ---------- Detalle ----------
function verDetalle(id) {
  const t = buscarTurno(id);
  if (!t) return;
  const filas = [
    ["Fecha", formatearFecha(t.fecha)],
    ["Llegada", t.hora],
    ["Cliente", t.cliente],
    ["Teléfono", t.telefono || "—"],
    ["Email", t.email || "—"],
    ["Patente", t.patente || "—"],
    ["Vehículo", [t.marca, t.modelo, t.anio].filter(Boolean).join(" ") || "—"],
    ["Color", t.color || "—"],
    ["Servicio", t.servicio || "—"],
  ];
  if (esAdmin) filas.push(["Precio", formatoPesos(t.precio)]);
  document.getElementById("detalle-contenido").innerHTML = filas
    .map(([k, v]) => `<dt class="col-sm-4 text-warning">${escapar(k)}</dt><dd class="col-sm-8">${escapar(v)}</dd>`)
    .join("");

  turnoDetalleId = id;
  abrirModal("modalDetalle");
  cargarDocumentos(id);
}

// ---------- PDF de diagnóstico ----------
function htmlDocumentos(docs) {
  const lista = docs.length
    ? `<ul class="list-group mb-3">${docs
        .map(
          (d) => `
        <li class="list-group-item bg-dark text-white d-flex justify-content-between align-items-center">
          <div>
            <i class="bi bi-file-earmark-pdf text-danger me-2"></i>${escapar(d.nombreArchivo)}
            <small class="text-muted ms-2">${escapar(formatoTamanio(d.tamanioBytes))} · ${escapar(formatearFechaHora(d.fechaSubida))}</small>
          </div>
          <button type="button" class="btn btn-outline-info btn-sm" data-doc-accion="descargar" data-doc-id="${d.id}" data-doc-nombre="${escapar(d.nombreArchivo)}">
            <i class="bi bi-download me-1"></i>Descargar
          </button>
        </li>`
        )
        .join("")}</ul>`
    : `<p class="text-muted">Este turno todavía no tiene PDF adjuntos.</p>`;

  const subida = puedeEditar
    ? `
      <div class="input-group">
        <input type="file" class="form-control" id="archivo-pdf" accept="application/pdf,.pdf">
        <button type="button" class="btn btn-primario" data-doc-accion="subir">
          <i class="bi bi-upload me-1"></i>Subir PDF
        </button>
      </div>
      <div class="form-text">Solo archivos PDF de hasta ${MAX_PDF_BYTES / (1024 * 1024)} MB.</div>
      <div id="alerta-documentos" class="mt-2"></div>`
    : "";

  return `<h6 class="text-warning">PDF de diagnóstico</h6>${lista}${subida}`;
}

async function cargarDocumentos(turnoId) {
  const contenedor = document.getElementById("detalle-documentos");
  contenedor.innerHTML = `<p class="text-muted mb-0">Cargando PDF...</p>`;
  try {
    const docs = (await api(`${ENDPOINTS.turnos}/${turnoId}/documentos`)) || [];
    if (turnoDetalleId !== turnoId) return; // se abrió otro turno mientras tanto
    contenedor.innerHTML = htmlDocumentos(docs);
  } catch (error) {
    if (error.status !== 401 && turnoDetalleId === turnoId) {
      contenedor.innerHTML = `<div class="alert alert-danger mb-0">No se pudieron cargar los PDF.</div>`;
    }
  }
}

async function subirDocumento() {
  const turnoId = turnoDetalleId;
  const input = document.getElementById("archivo-pdf");
  const alerta = document.getElementById("alerta-documentos");
  const boton = document.querySelector('#detalle-documentos button[data-doc-accion="subir"]');
  const archivo = input?.files?.[0];

  const mostrarAlerta = (texto, clase = "danger") => {
    if (alerta) alerta.innerHTML = `<div class="alert alert-${clase} mb-0">${escapar(texto)}</div>`;
  };

  if (!archivo) {
    mostrarAlerta("Elegí un archivo PDF primero.", "warning");
    return;
  }
  if (archivo.size > MAX_PDF_BYTES) {
    mostrarAlerta(`El archivo pesa ${formatoTamanio(archivo.size)} y el máximo es ${MAX_PDF_BYTES / (1024 * 1024)} MB.`);
    return;
  }

  const datos = new FormData();
  datos.append("archivo", archivo);

  if (boton) boton.disabled = true;
  mostrarAlerta("Subiendo...", "info");
  try {
    await api(`${ENDPOINTS.turnos}/${turnoId}/documentos`, { method: "POST", body: datos });
    avisar("PDF guardado");
    await cargarDocumentos(turnoId);
  } catch (error) {
    if (error.status === 401) return;
    const texto =
      error instanceof TypeError
        ? "No se pudo conectar con el servidor."
        : error.problema?.detail || "No se pudo subir el PDF.";
    mostrarAlerta(texto);
    if (boton) boton.disabled = false;
  }
}

async function descargarDocumento(id, nombre) {
  try {
    const respuesta = await fetch(`${ENDPOINTS.documentos}/${id}/descargar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (respuesta.status === 401) {
      cerrarSesion();
      return;
    }
    if (!respuesta.ok) throw new Error("descarga fallida");
    const contenido = await respuesta.blob();
    const direccion = URL.createObjectURL(contenido);
    const enlace = document.createElement("a");
    enlace.href = direccion;
    enlace.download = nombre || "diagnostico.pdf";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(direccion), 10000);
  } catch (error) {
    avisar("No se pudo descargar el PDF.", "error");
  }
}

function alClickDocumentos(evento) {
  const boton = evento.target.closest("button[data-doc-accion]");
  if (!boton) return;
  if (boton.dataset.docAccion === "descargar") {
    descargarDocumento(Number(boton.dataset.docId), boton.dataset.docNombre);
  }
  if (boton.dataset.docAccion === "subir") {
    subirDocumento();
  }
}

// ---------- Crear y editar turno (mismo formulario) ----------
function prepararFormulario() {
  document.getElementById("nuevoHora").innerHTML = HORARIOS_LABORALES
    .map((h) => `<option value="${escapar(h)}">${escapar(h)}</option>`)
    .join("");
  document.getElementById("nuevoMarca").innerHTML =
    `<option value="">Seleccionar marca</option>` +
    MARCAS.map((m) => `<option value="${escapar(m)}">${escapar(m)}</option>`).join("");
  document.getElementById("nuevoFecha").min = fechaLocalISO();
}

function actualizarHintCupo() {
  const fecha = valor("nuevoFecha");
  const hint = document.getElementById("hint-cupo");
  if (!fecha) {
    hint.textContent = "";
    return;
  }
  const n = todos.filter((t) => t.fecha === fecha).length;
  hint.textContent = `${n} de ${CUPO_DIARIO} turnos tomados ese día`;
  hint.className = n >= CUPO_DIARIO ? "form-text text-danger fw-bold" : "form-text";
}

function titulosFormulario(editando) {
  document.getElementById("modalNuevoTurnoLabel").innerHTML = editando
    ? `<i class="bi bi-pencil-square me-2"></i>Editar turno`
    : `<i class="bi bi-plus-circle me-2"></i>Nuevo turno`;
  document.getElementById("btn-guardar-turno").innerHTML = editando
    ? `<i class="bi bi-check-lg me-1"></i>Guardar cambios`
    : `<i class="bi bi-check-lg me-1"></i>Guardar turno`;
}

function abrirNuevoTurno() {
  turnoEditandoId = null;
  prepararFormulario();
  document.getElementById("formNuevoTurno").reset();
  document.getElementById("alerta-formulario").innerHTML = "";
  document.getElementById("nuevoFecha").value = fechaLocalISO();
  titulosFormulario(false);
  actualizarHintCupo();
  abrirModal("modalNuevoTurno");
}

function abrirEdicion(id) {
  const t = buscarTurno(id);
  if (!t) return;
  turnoEditandoId = id;
  prepararFormulario();
  document.getElementById("formNuevoTurno").reset();
  document.getElementById("alerta-formulario").innerHTML = "";

  // Al editar se permite una fecha pasada (para corregir datos de turnos viejos);
  // el backend controla las fechas solo si se cambia la fecha u hora.
  document.getElementById("nuevoFecha").removeAttribute("min");

  // Si el turno tiene una hora que ya no está en la lista, se agrega para poder guardarlo sin cambiarla
  const selectHora = document.getElementById("nuevoHora");
  if (t.hora && ![...selectHora.options].some((o) => o.value === t.hora)) {
    selectHora.insertAdjacentHTML(
      "afterbegin",
      `<option value="${escapar(t.hora)}">${escapar(t.hora)} (horario anterior)</option>`
    );
  }

  // Lo mismo con la marca: si es una marca fuera de la lista, se agrega para no perderla
  const selectMarca = document.getElementById("nuevoMarca");
  if (t.marca && ![...selectMarca.options].some((o) => o.value === t.marca)) {
    selectMarca.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapar(t.marca)}">${escapar(t.marca)} (marca anterior)</option>`
    );
  }

  document.getElementById("nuevoFecha").value = t.fecha;
  selectHora.value = t.hora;
  document.getElementById("nuevoServicio").value = String(t.idServicio ?? "");
  document.getElementById("nuevoNombre").value = t.nombre;
  document.getElementById("nuevoApellido").value = t.apellido;
  document.getElementById("nuevoTelefono").value = t.telefono;
  document.getElementById("nuevoEmail").value = t.email;
  document.getElementById("nuevoPatente").value = t.patente;
  selectMarca.value = t.marca;
  document.getElementById("nuevoModelo").value = t.modelo;
  document.getElementById("nuevoAnio").value = t.anio ?? "";
  document.getElementById("nuevoColor").value = t.color;

  titulosFormulario(true);
  actualizarHintCupo();
  abrirModal("modalNuevoTurno");
}

// Aviso de cupo completo dentro del formulario (no se abre otra ventana encima)
function mostrarAvisoCupo(actuales, cupo) {
  const alerta = document.getElementById("alerta-formulario");
  alerta.innerHTML = `
    <div class="alert alert-warning">
      <div class="fw-bold mb-1"><i class="bi bi-exclamation-triangle me-1"></i>Cupo del día completo</div>
      Ya hay ${escapar(actuales)} turnos tomados para ese día (cupo: ${escapar(cupo)}).
      ¿Querés tomar este turno igual?
      <div class="mt-2 d-flex gap-2">
        <button type="button" class="btn btn-warning btn-sm" id="btn-confirmar-cupo">Sí, tomar el turno igual</button>
        <button type="button" class="btn btn-secundario btn-sm" id="btn-cancelar-cupo">No, cambiar la fecha</button>
      </div>
    </div>`;
  document.getElementById("btn-confirmar-cupo").addEventListener("click", () => guardarTurno(true));
  document.getElementById("btn-cancelar-cupo").addEventListener("click", () => {
    alerta.innerHTML = "";
  });
  alerta.scrollIntoView({ block: "nearest" });
}

async function guardarTurno(confirmarExcedente = false) {
  const boton = document.getElementById("btn-guardar-turno");
  const alerta = document.getElementById("alerta-formulario");
  alerta.innerHTML = "";

  const editando = turnoEditandoId !== null;
  const fecha = valor("nuevoFecha");
  const anio = valor("nuevoAnio").trim();
  const cuerpo = {
    fechaHora: `${fecha}T${valor("nuevoHora")}:00`,
    idServicio: Number(valor("nuevoServicio")),
    telefonoCliente: valor("nuevoTelefono").trim(),
    nombreCliente: valor("nuevoNombre").trim(),
    apellidoCliente: valor("nuevoApellido").trim(),
    emailCliente: valor("nuevoEmail").trim() || null,
    patente: valor("nuevoPatente").trim(),
    marca: valor("nuevoMarca").trim(),
    modelo: valor("nuevoModelo").trim(),
    anio: anio ? Number(anio) : null,
    color: valor("nuevoColor").trim() || null,
    confirmarExcedente,
  };

  const url = editando ? `${ENDPOINTS.turnos}/${turnoEditandoId}` : ENDPOINTS.turnos;
  const metodo = editando ? "PUT" : "POST";

  boton.disabled = true;
  try {
    await api(url, { method: metodo, body: JSON.stringify(cuerpo) });
    cerrarModal("modalNuevoTurno");
    await refrescar(false);
    if (editando) {
      avisar("Turno actualizado");
    } else {
      const n = todos.filter((t) => t.fecha === fecha).length;
      avisar(`Turno guardado. Ese día hay ${n} ${n === 1 ? "turno" : "turnos"} (cupo: ${CUPO_DIARIO}).`);
    }
  } catch (error) {
    if (error.status === 409 && error.problema?.type === "/errors/cupo-excedido") {
      const actuales = error.problema.turnosActuales ?? "?";
      const cupo = error.problema.cupo ?? CUPO_DIARIO;
      mostrarAvisoCupo(actuales, cupo);
      return;
    }
    const mensaje =
      error instanceof TypeError
        ? "No se pudo conectar con el servidor. Probá de nuevo en unos segundos."
        : error.problema?.detail || error.problema?.title || "No se pudo guardar el turno.";
    alerta.innerHTML = `<div class="alert alert-danger">${escapar(mensaje)}</div>`;
  } finally {
    boton.disabled = false;
  }
}

// ---------- Eliminar ----------
function pedirEliminar(id) {
  const t = todos.find((x) => x.id === id);
  if (!t) return;
  turnoAEliminar = t;
  document.getElementById("textoEliminar").textContent =
    `¿Eliminar el turno de ${t.cliente} (${t.patente}) del ${formatearFecha(t.fecha)}? Esta acción no se puede deshacer.`;
  abrirModal("modalEliminar");
}

async function confirmarEliminar() {
  if (!turnoAEliminar) return;
  try {
    await api(`${ENDPOINTS.turnos}/${turnoAEliminar.id}`, { method: "DELETE" });
    cerrarModal("modalEliminar");
    turnoAEliminar = null;
    await refrescar(false);
    avisar("Turno eliminado");
  } catch (error) {
    if (error.status === 401) return;
    cerrarModal("modalEliminar");
    avisar("No se pudo eliminar el turno. Si tiene un PDF de diagnóstico adjunto, no se puede borrar.", "error");
  }
}

// ---------- Búsqueda ----------
async function ejecutarBusqueda() {
  const texto = valor("buscar-turno").trim();
  try {
    if (texto.length >= 2) await buscarEnServidor(texto);
    else resultados = null;
    mostrarTurnos();
  } catch (error) {
    if (error.status !== 401) avisar("No se pudo realizar la búsqueda.", "error");
  }
}

function alEscribirBusqueda() {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(ejecutarBusqueda, 300);
}

function alClickTabla(evento) {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;
  const id = Number(boton.dataset.id);
  if (boton.dataset.accion === "ver") verDetalle(id);
  if (boton.dataset.accion === "editar") abrirEdicion(id);
  if (boton.dataset.accion === "eliminar") pedirEliminar(id);
}

// ---------- Inicio ----------
function conectarEventos() {
  document.getElementById("btn-salir").addEventListener("click", cerrarSesion);
  document.getElementById("btn-refrescar").addEventListener("click", () => refrescar(true));
  document.getElementById("btn-limpiar").addEventListener("click", limpiarFiltros);
  document.getElementById("btn-nuevo-turno").addEventListener("click", abrirNuevoTurno);
  ["filtro-fecha", "filtro-fecha-desde", "filtro-fecha-hasta", "filtro-servicio"].forEach((id) =>
    document.getElementById(id).addEventListener("change", mostrarTurnos)
  );
  document.getElementById("buscar-turno").addEventListener("input", alEscribirBusqueda);
  document.getElementById("nuevoFecha").addEventListener("change", actualizarHintCupo);
  document.getElementById("formNuevoTurno").addEventListener("submit", (e) => {
    e.preventDefault();
    guardarTurno(false);
  });
  document.getElementById("tabla-turnos").addEventListener("click", alClickTabla);
  document.getElementById("btnConfirmarEliminar").addEventListener("click", confirmarEliminar);
  document.getElementById("detalle-documentos").addEventListener("click", alClickDocumentos);
  document.getElementById("modalDetalle").addEventListener("hidden.bs.modal", () => {
    turnoDetalleId = null;
  });
}

async function iniciar() {
  const nombre = localStorage.getItem("adminNombre") || "";
  document.getElementById("usuario-info").textContent =
    `${nombre} · ${NOMBRES_ROL[rol] || rol}`;
  if (esAdmin) {
    document.querySelectorAll(".solo-admin").forEach((el) => el.classList.remove("d-none"));
  }
  if (puedeEditar) {
    document.querySelectorAll(".solo-editar").forEach((el) => el.classList.remove("d-none"));
  }

  prepararFormulario();
  conectarEventos();

  try {
    await Promise.all([cargarServicios(), cargarTurnos()]);
  } catch (error) {
    if (error.status !== 401) {
      avisar("No se pudieron cargar los datos. Verificá que el servidor esté en marcha.", "error");
    }
  }
  llenarSelectsServicio();
  mostrarTurnos();
}

if (token) {
  iniciar();
}