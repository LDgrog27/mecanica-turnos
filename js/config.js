// Dirección del backend.
// En tu computadora (localhost o 127.0.0.1) usa el backend local.
// En producción, reemplazá el texto de abajo por la dirección del servicio de Render del taller.
const API_PRODUCCION = "https://REEMPLAZAR-CON-LA-URL-DE-RENDER";

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