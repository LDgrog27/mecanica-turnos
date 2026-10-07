package com.barber.barberBackend.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.NotNull;

@Schema(description = "Activar o desactivar una cuenta")
public record CambiarEstadoRequestDTO(
    @Schema(description = "true para activar la cuenta, false para desactivarla", example = "false")
    @NotNull(message = "Tenés que indicar si la cuenta queda activa o no")
    Boolean activo
) {}