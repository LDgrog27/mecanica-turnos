import { ENDPOINTS } from "../js/config.js";
const administradores = ENDPOINTS.administradores;

// Mostrar u ocultar la contraseña
document
  .getElementById("togglePassword")
  .addEventListener("click", function () {
    const password = document.getElementById("password");
    const type =
      password.getAttribute("type") === "password" ? "text" : "password";
    password.setAttribute("type", type);
    this.textContent = type === "password" ? "👁️" : "🙈";
  });

// Avisos dentro del formulario (en lugar de los carteles del navegador).
// Si el contenedor no existe en el HTML, se crea arriba del formulario.
function contenedorAlerta() {
  let contenedor = document.getElementById("alerta-login");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "alerta-login";
    const form = document.getElementById("loginForm");
    form.parentNode.insertBefore(contenedor, form);
  }
  return contenedor;
}

function mostrarAlerta(texto) {
  const contenedor = contenedorAlerta();
  contenedor.innerHTML = '<div class="alert alert-danger" role="alert"></div>';
  contenedor.firstElementChild.textContent = texto;
}

function limpiarAlerta() {
  contenedorAlerta().innerHTML = "";
}

// Validación y envío del formulario
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const form = this;
  const submitBtn = form.querySelector('button[type="submit"]');
  const loginText = submitBtn.querySelector(".login-text");
  const spinner = submitBtn.querySelector(".spinner-border");

  limpiarAlerta();

  if (!form.checkValidity()) {
    e.stopPropagation();
    form.classList.add("was-validated");
    return;
  }

  // Estado de carga
  submitBtn.disabled = true;
  loginText.classList.add("d-none");
  spinner.classList.remove("d-none");

  const formData = {
    email: document.getElementById("email").value.trim(),
    contrasenia: document.getElementById("password").value,
  };

  try {
    const response = await fetch(`${administradores}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.status === 401) {
      mostrarAlerta("Correo o contraseña incorrectos, o la cuenta está desactivada.");
      return;
    }
    if (!response.ok) {
      mostrarAlerta("El servidor respondió con un error. Probá de nuevo en un momento.");
      return;
    }

    const data = await response.json();

    // Guardar la sesión para que la usen los paneles
    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminEmail", data.email);
    localStorage.setItem("adminNombre", `${data.nombre} ${data.apellido}`);
    localStorage.setItem("adminRol", data.rol || "VISOR");

    // Todos los roles entran al panel de turnos
    window.location.href = "/admin/panel-turnos.html";
  } catch (error) {
    console.error("Error:", error);
    mostrarAlerta("No se pudo conectar con el servidor. Esperá unos segundos y probá de nuevo.");
  } finally {
    submitBtn.disabled = false;
    loginText.classList.remove("d-none");
    spinner.classList.add("d-none");
  }
});

// Quitar el aviso de error al escribir
document.querySelectorAll(".form-control").forEach((input) => {
  input.addEventListener("input", function () {
    if (this.classList.contains("is-invalid")) {
      this.classList.remove("is-invalid");
    }
    limpiarAlerta();
  });
});

// Foco automático en el email
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("email").focus();
});