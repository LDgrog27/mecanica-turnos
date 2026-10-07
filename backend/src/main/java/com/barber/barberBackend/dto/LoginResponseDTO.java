package com.barber.barberBackend.dto;

import com.barber.barberBackend.model.Rol;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Respuesta de inicio de sesión con JWT")
public record LoginResponseDTO(
    @Schema(description = "ID único de la cuenta", example = "1")
    Long id,
    @Schema(description = "Nombre", example = "Carlos")
    String nombre,
    @Schema(description = "Apellido", example = "López")
    String apellido,
    @Schema(description = "Email de la cuenta", example = "carlos@taller.com")
    String email,
    @Schema(description = "Token JWT para autenticación", example = "eyJhbGciOiJIUzI1NiJ9...")
    String token,
    @Schema(description = "Rol de la cuenta: ADMIN, OPERADOR o VISOR", example = "OPERADOR")
    Rol rol
) {
    public LoginResponseDTO(Long id, String nombre, String apellido, String email, String token) {
        this(id, nombre, apellido, email, token, null);
    }
}