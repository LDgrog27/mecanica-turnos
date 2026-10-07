package com.barber.barberBackend.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Nueva contraseña para una cuenta")
public record CambiarContraseniaRequestDTO(
    @Schema(description = "Nueva contraseña en texto plano (se cifra antes de guardar)", example = "unaClaveLarga123")
    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    String contrasenia
) {}