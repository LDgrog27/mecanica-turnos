package com.barber.barberBackend.dto;

import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Datos para crear un nuevo turno (incluye datos del cliente y del vehículo)")
public record TurnoRequestDTO(
    @Schema(description = "Fecha y hora de llegada del turno", example = "2026-12-15T08:00:00")
    @NotNull(message = "La fecha y hora es obligatoria")
    LocalDateTime fechaHora,
    @Schema(description = "ID del servicio solicitado", example = "1")
    @NotNull(message = "El servicio es obligatorio")
    Long idServicio,
    @Schema(description = "Teléfono del cliente (si no existe, se crea)", example = "1155551234")
    @NotBlank(message = "El teléfono del cliente es obligatorio")
    String telefonoCliente,
    @Schema(description = "Nombre del cliente", example = "Juan")
    @NotBlank(message = "El nombre del cliente es obligatorio")
    String nombreCliente,
    @Schema(description = "Apellido del cliente", example = "Pérez")
    @NotBlank(message = "El apellido del cliente es obligatorio")
    String apellidoCliente,
    @Schema(description = "Email del cliente (opcional)", example = "juan.perez@email.com")
    @Email(message = "El email del cliente no tiene un formato válido")
    String emailCliente,
    @Schema(description = "Patente del vehículo", example = "AB123CD")
    @NotBlank(message = "La patente es obligatoria")
    String patente,
    @Schema(description = "Marca del vehículo", example = "Ford")
    @NotBlank(message = "La marca es obligatoria")
    String marca,
    @Schema(description = "Modelo del vehículo", example = "Fiesta")
    @NotBlank(message = "El modelo es obligatorio")
    String modelo,
    @Schema(description = "Año del vehículo (opcional)", example = "2015")
    Integer anio,
    @Schema(description = "Color del vehículo (opcional)", example = "Rojo")
    String color,
    @Schema(description = "Confirmar un turno aunque el cupo del día esté completo")
    Boolean confirmarExcedente
) {
    public TurnoRequestDTO(LocalDateTime fechaHora, Long idServicio, String telefonoCliente,
            String nombreCliente, String apellidoCliente, String emailCliente) {
        this(fechaHora, idServicio, telefonoCliente, nombreCliente, apellidoCliente, emailCliente,
                null, null, null, null, null, null);
    }
}