package com.barber.barberBackend.dto;

import java.time.LocalDateTime;

import com.barber.barberBackend.model.DocumentoTurno;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "PDF de diagnóstico asociado a un turno")
public record DocumentoTurnoResponseDTO(
    Long id,
    Long turnoId,
    String nombreArchivo,
    long tamanioBytes,
    LocalDateTime fechaSubida,
    String subidoPor
) {
    public static DocumentoTurnoResponseDTO desde(DocumentoTurno d) {
        return new DocumentoTurnoResponseDTO(
                d.getId(),
                d.getTurno().getId(),
                d.getNombreOriginal(),
                d.getTamanioBytes(),
                d.getFechaSubida(),
                d.getSubidoPor());
    }
}