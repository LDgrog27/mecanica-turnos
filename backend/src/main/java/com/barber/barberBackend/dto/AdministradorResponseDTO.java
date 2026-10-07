package com.barber.barberBackend.dto;

import com.barber.barberBackend.model.Rol;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Cuenta registrada en el sistema")
public record AdministradorResponseDTO(
    @Schema(description = "ID único de la cuenta", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
    Long id,
    @Schema(description = "Nombre", example = "Carlos", requiredMode = Schema.RequiredMode.REQUIRED)
    String nombre,
    @Schema(description = "Apellido", example = "López", requiredMode = Schema.RequiredMode.REQUIRED)
    String apellido,
    @Schema(description = "Email de la cuenta", example = "carlos.lopez@taller.com", requiredMode = Schema.RequiredMode.REQUIRED)
    String email,
    @Schema(description = "Rol de la cuenta: ADMIN, OPERADOR o VISOR", example = "OPERADOR")
    Rol rol
) {
    public AdministradorResponseDTO(Long id, String nombre, String apellido, String email) {
        this(id, nombre, apellido, email, null);
    }
}