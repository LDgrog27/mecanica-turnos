import { ENDPOINTS, HORARIOS_LABORALES } from "./config.js";

//<-- Constantes globales -->
let pasoActual = 0;
const secciones = document.querySelectorAll(".seccion");
const regexTelefono = /^[0-9]{7,15}$/;
const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let turnosOcupadosPorFecha = {};
let semanaOffset = 0;
const NOMBRES_DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// <-- API -->
const API = {
  async fetchConReintento(url, opciones = {}, intentos = 5, esperaMs = 3000) {
    for (let i = 0; i < intentos; i++) {
      try {
        const response = await fetch(url, opciones);
        if (response.ok) return response;
        if (response.status >= 500 && i < intentos - 1) {
          await new Promise(r => setTimeout(r, esperaMs));
          continue;
        }
        return response;
      } catch (error) {
        if (i === intentos - 1) throw error;
        await new Promise(r => setTimeout(r, esperaMs));
      }
    }
  },

  async obtenerServicios() {
    try {
      const response = await this.fetchConReintento(ENDPOINTS.servicios);
      if (!response.ok) throw new Error("API: Error al obtener los servicios");
      return await response.json();
    } catch (error) {
      console.error(error);
      mostrarError("Hubo un error al cargar los servicios.");
      return [];
    }
  },
  async obtenerTurnosOcupados() {
    try {
      const response = await this.fetchConReintento(ENDPOINTS.turnos + "/findDateTimes");
      if (!response.ok) throw new Error("API: Error al obtener los turnos ocupados");
      return await response.json();
    } catch (error) {
      console.error(error);
      mostrarError("Hubo un error al cargar los turnos ocupados.");
      return [];
    }
  },
  async reservarTurno(data) {
    try {
      const res = await this.fetchConReintento(ENDPOINTS.turnos, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const textoError = await res.text();
        console.error("Respuesta del servidor:", textoError);
        throw new Error("Error al reservar turno: " + textoError);
      }
      const text = await res.text();
      if (text) {
        console.log("✅ JSON recibido:", JSON.parse(text));
      } else {
        console.log("✅ Turno reservado.");
        document.getElementById("form-turno").reset();
      }
    } catch (err) {
      console.error(err);
      mostrarError("Hubo un error al reservar el turno.");
      throw err;
    }
  }
};

//<-- Utilidades -->
const mostrarServicios = (servicios) => {
  const selectServicio = document.getElementById("servicio");
  servicios.forEach((servicio) => {
    const option = document.createElement("option");
    option.value = servicio.id;
    option.textContent = servicio.tipo;
    selectServicio.appendChild(option);
  });
};

function mapearTurnosOcupados(arr) {
  const mapa = {};
  arr.forEach((item) => {
    const [fecha, hora] = item.split("T");
    if (!mapa[fecha]) mapa[fecha] = [];
    mapa[fecha].push(hora);
  });
  return mapa;
}

const tieneValor = (input) => {
  if (input.offsetParent === null) return true;
  if (input.hasAttribute("required") && !input.value) {
    input.classList.add("is-invalid");
    return false;
  } else {
    input.classList.remove("is-invalid");
    return true;
  }
};
const validarTelefono = (telefono) => {
  if (!regexTelefono.test(telefono)) {
    mostrarError("Por favor, ingresá un teléfono válido (solo números, 7 a 15 dígitos).");
    return false;
  }
  return true;
};
const validarEmail = (email) => {
  if (!regexEmail.test(email)) {
    mostrarError("Por favor, ingresá un correo electrónico válido.");
    return false;
  }
  return true;
};
const mostrarError = (mensaje) => {
  const modalMensaje = document.getElementById("modalErrorMensaje");
  modalMensaje.textContent = mensaje;
  const modal = new bootstrap.Modal(document.getElementById("modalError"));
  modal.show();
};

function obtenerLunesDeSemana(fecha, offsetSemanas = 0) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
  const lunes = new Date(d.setDate(diff));
  lunes.setDate(lunes.getDate() + offsetSemanas * 7);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

function formatearFechaLocal(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

//<-- Handlers de botones: definidos YA, sin esperar a la API -->
window.cargarHorariosDisponibles = function () {
  const inputFecha = document.getElementById("fecha");
  const contenedor = document.getElementById("horarios");
  const fecha = inputFecha.value;
  contenedor.innerHTML = "";
  if (!fecha) return;

  const ocupados = turnosOcupadosPorFecha[fecha] || [];
  const libres = HORARIOS_LABORALES.filter(h => !ocupados.includes(h));

  if (libres.length === 0) {
    contenedor.innerHTML = `<p class="text-warning mt-3">No quedan turnos disponibles para esta fecha, seleccione otra</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  libres.forEach(hora => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "input-opcion";
    btn.textContent = hora;
    btn.onclick = () => {
      document.querySelectorAll("#horarios .input-opcion").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      btn.dataset.selected = true;
    };
    fragment.appendChild(btn);
  });
  contenedor.appendChild(fragment);
};

function renderizarDiasSemana() {
  const contenedor = document.getElementById("dias-semana");
  const rangoLabel = document.getElementById("rango-semana");
  const inputFecha = document.getElementById("fecha");
  contenedor.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const lunes = obtenerLunesDeSemana(hoy, semanaOffset);

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 7; i++) {
    const fechaDia = new Date(lunes);
    fechaDia.setDate(lunes.getDate() + i);
    const fechaStr = formatearFechaLocal(fechaDia);
    const esPasado = fechaDia < hoy;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "input-opcion dia-opcion";
    btn.innerHTML = `${NOMBRES_DIAS[fechaDia.getDay()]}<br>${fechaDia.getDate()}`;
    btn.disabled = esPasado;
    if (fechaStr === inputFecha.value) btn.classList.add("selected");

    btn.onclick = () => {
      document.querySelectorAll(".dia-opcion").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      inputFecha.value = fechaStr;
      cargarHorariosDisponibles();
    };
    fragment.appendChild(btn);
  }
  contenedor.appendChild(fragment);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const mismoMes = lunes.getMonth() === domingo.getMonth();
  const mesCorto = domingo.toLocaleDateString("es-AR", { month: "short" });
  rangoLabel.textContent = mismoMes
    ? `${lunes.getDate()} - ${domingo.getDate()} ${mesCorto}`
    : `${lunes.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} - ${domingo.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
}

window.cambiarSemana = function (direccion) {
  semanaOffset += direccion;
  if (semanaOffset < 0) semanaOffset = 0;
  renderizarDiasSemana();
};

window.siguientePaso = function (paso) {
  const seccionActiva = document.querySelector(".seccion.activa");
  const inputs = seccionActiva.querySelectorAll("input, select");

  for (let input of inputs) {
    if (!tieneValor(input)) {
      mostrarError("Por favor, completá todos los campos obligatorios.");
      return;
    }
  }

  if (seccionActiva.id === "paso-2") {
    const horarioSeleccionado = document.querySelector("#horarios .input-opcion.selected");
    if (!horarioSeleccionado) {
      mostrarError("Por favor, seleccioná un horario.");
      return;
    }
  }

  secciones[paso - 1].classList.remove("activa");
  secciones[paso].classList.add("activa");
  pasoActual = paso;
};

window.volverPaso = function (paso) {
  secciones[pasoActual].classList.remove("activa");
  secciones[paso - 1].classList.add("activa");
  pasoActual = paso - 1;
};

window.volverPasoOInicio = function () {
  if (pasoActual === 0) {
    window.location.href = "index.html";
  } else {
    volverPaso(pasoActual);
  }
};

window.enviarForm = async function () {
  const telefono = document.getElementById("telefono").value.trim();
  const email = document.getElementById("email").value.trim();
  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const servicioId = parseInt(document.getElementById("servicio").value);
  const fecha = document.getElementById("fecha").value;
  const hora = document.querySelector("#horarios .selected")?.textContent || "";

  if (!nombre || !apellido || !telefono || !email || !fecha || !hora || !servicioId) {
    mostrarError("Por favor, completá todos los campos obligatorios.");
    return;
  }

  if (!validarTelefono(telefono) || !validarEmail(email)) return;

  const turnoData = {
    fechaHora: `${fecha}T${hora}`,
    idServicio: servicioId,
    telefonoCliente: telefono,
    nombreCliente: nombre,
    apellidoCliente: apellido,
    emailCliente: email,
  };

  try {
    await API.reservarTurno(turnoData);
    window.location.href = "reserva-confirmada.html";
  } catch (err) {
    // El error ya se mostró en el modal desde reservarTurno
  }
};

// Dibujar la grilla de días apenas carga (no depende de la API)
renderizarDiasSemana();

//<-- Carga de datos: esto sí puede tardar, pero ya no bloquea los botones -->
document.addEventListener("DOMContentLoaded", async function () {
  const servicios = await API.obtenerServicios();
  mostrarServicios(servicios);

  const turnosOcupadosRaw = await API.obtenerTurnosOcupados();
  turnosOcupadosPorFecha = mapearTurnosOcupados(turnosOcupadosRaw);
});