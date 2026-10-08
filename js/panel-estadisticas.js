import { ENDPOINTS } from "./config.js";

// ---------- Sesión y permisos ----------
// Las estadísticas (con dinero) son solo para el administrador.
// Esto es comodidad: el backend es el que realmente bloquea el acceso a otros roles.
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

// ---------- Utilidades ----------
function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatoPesos(numero) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(Number(numero) || 0);
}

function formatoNumero(numero) {
  return new Intl.NumberFormat("es-AR").format(Number(numero) || 0);
}

function variacion(actual, anterior) {
  if (!anterior) return null; // sin datos del mes anterior no se inventa un porcentaje
  return Math.round(((actual - anterior) / anterior) * 100);
}

async function pedir(url) {
  const respuesta = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (respuesta.status === 401) {
    cerrarSesion();
    throw new Error("sesion");
  }
  if (respuesta.status === 403) {
    window.location.href = "/admin/panel-turnos.html";
    throw new Error("sin permiso");
  }
  if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
  const texto = await respuesta.text();
  return texto ? JSON.parse(texto) : null;
}

// ---------- Datos ----------
function normalizar(panel, taller) {
  return {
    turnosHoy: panel.turnosHoy || 0,
    turnosAyer: panel.turnosAyer || 0,
    ingresosMes: panel.ingresosMes || 0,
    ingresosMesAnterior: panel.ingresosMesAnterior || 0,
    cantClientes: panel.cantClientes || 0,
    ingresosDiarios: Array.isArray(panel.ingresosDiarios) ? panel.ingresosDiarios : [],
    servicios: Array.isArray(panel.servicios) ? panel.servicios : [],
    turnosMes: taller.turnosMes || 0,
    promedio: taller.promedioTurnosPorDia || 0,
    diasSobrecupo: taller.diasSobrecupo || 0,
    cupo: taller.cupoDiario || 8,
    marcas: Array.isArray(taller.marcas) ? taller.marcas : [],
  };
}

// ---------- Tarjetas ----------
function actualizarTarjetas(d) {
  const hoy = document.getElementById("turnos-hoy");
  hoy.textContent = `${d.turnosHoy}/${d.cupo}`;
  hoy.className = d.turnosHoy > d.cupo ? "text-danger" : "text-warning";
  document.getElementById("turnos-ayer").textContent = `Ayer: ${d.turnosAyer}`;

  document.getElementById("ingresos-mes").textContent = formatoPesos(d.ingresosMes);
  const cambio = variacion(d.ingresosMes, d.ingresosMesAnterior);
  const badge = document.getElementById("badge-mes");
  if (cambio === null) {
    badge.textContent = "sin datos previos";
    badge.className = "badge bg-secondary";
  } else {
    badge.textContent = `${cambio >= 0 ? "+" : ""}${cambio}%`;
    badge.className = `badge ${cambio >= 0 ? "bg-success" : "bg-danger"}`;
  }

  document.getElementById("clientes-unicos").textContent = formatoNumero(d.cantClientes);
  document.getElementById("turnos-mes").textContent = formatoNumero(d.turnosMes);
  document.getElementById("promedio-dia").textContent = d.turnosMes
    ? `Promedio: ${d.promedio} por día con turnos`
    : "Todavía no hay turnos este mes";
}

// ---------- Gráficos ----------
const COLORES = ["#ff6600", "#ffc494", "#ff9933", "#ffb366", "#ff8533", "#cc5200", "#ff7f00", "#ffad33"];
let graficos = {};

function destruirGraficos() {
  Object.values(graficos).forEach((g) => g?.destroy?.());
  graficos = {};
}

function graficoIngresos(ingresosDiarios) {
  const ctx = document.getElementById("grafico-ingresos").getContext("2d");
  const ultimos = ingresosDiarios.slice(0, 15).reverse();
  graficos.ingresos = new Chart(ctx, {
    type: "line",
    data: {
      labels: ultimos.map((d) => {
        const f = new Date(d.fecha);
        return `${f.getDate()}/${f.getMonth() + 1}`;
      }),
      datasets: [{
        label: "Ingresos estimados",
        data: ultimos.map((d) => d.ingresoTotal || 0),
        borderColor: "#ff6600",
        backgroundColor: "rgba(255, 102, 0, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "white" } } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "white", callback: (v) => "$" + Number(v).toLocaleString("es-AR") },
          grid: { color: "rgba(255, 255, 255, 0.1)" },
        },
        x: { ticks: { color: "white" }, grid: { color: "rgba(255, 255, 255, 0.1)" } },
      },
    },
  });
}

function graficoServicios(servicios) {
  const ctx = document.getElementById("grafico-servicios").getContext("2d");
  const datos = servicios.length ? servicios : [{ nombre: "Sin datos", cantidadRealizado: 1 }];
  graficos.servicios = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: datos.map((s) => s.nombre || "Sin nombre"),
      datasets: [{
        data: datos.map((s) => s.cantidadRealizado || 0),
        backgroundColor: datos.map((_, i) => COLORES[i % COLORES.length]),
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: "white", padding: 15 } } },
    },
  });
}

function graficoMarcas(marcas) {
  const ctx = document.getElementById("grafico-marcas").getContext("2d");
  const datos = marcas.length ? marcas : [{ marca: "Sin datos", cantidad: 0 }];
  graficos.marcas = new Chart(ctx, {
    type: "bar",
    data: {
      labels: datos.map((m) => m.marca || "Sin marca"),
      datasets: [{
        label: "Turnos",
        data: datos.map((m) => m.cantidad || 0),
        backgroundColor: datos.map((_, i) => COLORES[i % COLORES.length]),
        borderRadius: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "white", stepSize: 1 },
          grid: { color: "rgba(255, 255, 255, 0.1)" },
        },
        x: { ticks: { color: "white" }, grid: { display: false } },
      },
    },
  });
}

// ---------- Resumen ----------
function llenarResumen(d) {
  const servicioTop = d.servicios.length
    ? d.servicios.reduce((max, s) => ((s.cantidadRealizado || 0) > (max.cantidadRealizado || 0) ? s : max))
    : null;
  const marcaTop = d.marcas.length ? d.marcas[0] : null;

  const filas = [
    ["Turnos del mes", formatoNumero(d.turnosMes), "incluye los que todavía no ocurrieron"],
    ["Promedio por día", String(d.promedio), "solo cuenta los días que tuvieron turnos"],
    ["Días con sobrecupo", String(d.diasSobrecupo), `más de ${d.cupo} turnos en el día`],
    ["Servicio más pedido", servicioTop ? String(servicioTop.cantidadRealizado) : "—", servicioTop ? servicioTop.nombre : "Sin datos"],
    ["Marca más frecuente", marcaTop ? String(marcaTop.cantidad) : "—", marcaTop ? marcaTop.marca || "Sin marca" : "Sin datos"],
  ];

  document.getElementById("tabla-resumen").innerHTML = filas
    .map(([metrica, valor, detalle]) => `
      <tr>
        <td>${escapar(metrica)}</td>
        <td><span class="badge" style="background-color: #ff6600;">${escapar(valor)}</span></td>
        <td>${escapar(detalle)}</td>
      </tr>`)
    .join("");
}

// ---------- Carga ----------
async function cargar() {
  const aviso = document.getElementById("error-estadisticas");
  aviso.classList.add("d-none");
  try {
    if (typeof Chart === "undefined") throw new Error("No se pudo cargar la librería de gráficos.");
    const [panel, taller] = await Promise.all([
      pedir(`${ENDPOINTS.estadisticas}/panel`),
      pedir(`${ENDPOINTS.estadisticas}/taller`),
    ]);
    if (!panel || !taller) throw new Error("El servidor no pudo calcular las estadísticas.");

    const datos = normalizar(panel, taller);
    actualizarTarjetas(datos);
    destruirGraficos();
    graficoIngresos(datos.ingresosDiarios);
    graficoServicios(datos.servicios);
    graficoMarcas(datos.marcas);
    llenarResumen(datos);
  } catch (error) {
    if (error.message === "sesion" || error.message === "sin permiso") return;
    console.error(error);
    aviso.textContent =
      "No se pudieron cargar las estadísticas. Verificá que el servidor esté en marcha y probá de nuevo.";
    aviso.classList.remove("d-none");
  }
}

if (autorizado) {
  document.getElementById("btn-salir").addEventListener("click", cerrarSesion);
  document.getElementById("btn-actualizar").addEventListener("click", cargar);
  cargar();
}