// Dirección del backend.
// En tu computadora (localhost o 127.0.0.1) usa el backend local.
// En producción (SnapDeploy), usamos una ruta relativa vacía para que apunte al mismo servidor.
const API_PRODUCCION = "";

const API_BASE_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:8080"
  : API_PRODUCCION;

export const ENDPOINTS = {
  turnos: `${API_BASE_URL}/turnos`,
  clientes: `${API_BASE_URL}/clientes`,
  servicios: `${API_BASE_URL}/servicios`,
  administradores: `${API_BASE_URL}/administradores`,
  estadisticas: `${API_BASE_URL}/estadisticas`,
  documentos: `${API_BASE_URL}/documentos`
};

// Horas de llegada permitidas: el taller recibe los autos a las 8 o a las 9.
export const HORARIOS_LABORALES = ['08:00', '09:00'];

// Cantidad de turnos por día antes de pedir confirmación.
// Solo sirve para mostrar el contador: el límite real lo controla el backend (turnos.cupo-diario).
export const CUPO_DIARIO = 8;

// Marcas con las que trabaja el taller (aparecen como opciones al cargar un turno).
export const MARCAS = ['Audi', 'Seat', 'Volkswagen'];

// Configuración regional del taller (Ciudad de México).
export const REGION = {
  locale: "es-MX",        // formato de números y fechas
  moneda: "MXN",          // pesos mexicanos
  codigoTelefono: "52",   // código de país para los links de WhatsApp
};