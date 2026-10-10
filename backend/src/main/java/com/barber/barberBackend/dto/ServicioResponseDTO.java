package com.barber.barberBackend.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Servicio disponible en el taller")
public record ServicioResponseDTO(
    @Schema(description = "ID único del servicio", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
    Long id,
    @Schema(description = "Nombre o tipo de servicio", example = "Cambio de aceite", requiredMode = Schema.RequiredMode.REQUIRED)
    String tipo,
    @Schema(description = "Precio del servicio (solo lo ve ADMIN, para el resto es null)", example = "1500.0")
    @JsonSerialize(using = PrecioSoloAdminSerializer.class)
    float precio,
    @Schema(description = "Si el servicio está activo (uno desactivado no se puede elegir en turnos nuevos)", example = "true")
    Boolean activo
) {
    public ServicioResponseDTO(Long id, String tipo, float precio) {
        this(id, tipo, precio, null);
    }
}