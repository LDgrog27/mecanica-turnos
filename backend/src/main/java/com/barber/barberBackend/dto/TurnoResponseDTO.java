package com.barber.barberBackend.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Turno registrado con datos del cliente, servicio y vehículo")
public record TurnoResponseDTO(
    @Schema(description = "ID único del turno", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
    Long id,
    @Schema(description = "Fecha y hora del turno", example = "2026-12-15T08:00:00", requiredMode = Schema.RequiredMode.REQUIRED)
    LocalDateTime fechaHora,
    @Schema(description = "Teléfono del cliente", example = "1155551234", requiredMode = Schema.RequiredMode.REQUIRED)
    String telefonoCliente,
    @Schema(description = "Nombre del cliente", example = "Juan", requiredMode = Schema.RequiredMode.REQUIRED)
    String nombreCliente,
    @Schema(description = "Apellido del cliente", example = "Pérez", requiredMode = Schema.RequiredMode.REQUIRED)
    String apellidoCliente,
    @Schema(description = "Email del cliente", example = "juan.perez@email.com")
    String emailCliente,
    @Schema(description = "ID del servicio reservado", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
    Long idServicio,
    @Schema(description = "Nombre del servicio", example = "Cambio de aceite", requiredMode = Schema.RequiredMode.REQUIRED)
    String tipoServicio,
    @Schema(description = "Precio del servicio (solo lo ve ADMIN, para el resto es null)", example = "1500.0")
    @JsonSerialize(using = PrecioSoloAdminSerializer.class)
    float precioServicio,
    @Schema(description = "Patente del vehículo", example = "AB123CD")
    String patente,
    @Schema(description = "Marca del vehículo", example = "Ford")
    String marca,
    @Schema(description = "Modelo del vehículo", example = "Fiesta")
    String modelo,
    @Schema(description = "Año del vehículo", example = "2015")
    Integer anio,
    @Schema(description = "Color del vehículo", example = "Rojo")
    String color
) {
    public TurnoResponseDTO(Long id, LocalDateTime fechaHora, String telefonoCliente, String nombreCliente,
            String apellidoCliente, String emailCliente, Long idServicio, String tipoServicio, float precioServicio) {
        this(id, fechaHora, telefonoCliente, nombreCliente, apellidoCliente, emailCliente,
                idServicio, tipoServicio, precioServicio, null, null, null, null, null);
    }
}