package com.barber.barberBackend.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Estadísticas propias del taller para el mes en curso")
public record PanelTallerDTO(
    @Schema(description = "Turnos del mes (incluye los que todavía no ocurrieron)", example = "42")
    int turnosMes,
    @Schema(description = "Promedio de turnos por día, contando solo los días que tuvieron turnos", example = "6.5")
    double promedioTurnosPorDia,
    @Schema(description = "Días del mes con más turnos que el cupo diario", example = "2")
    int diasSobrecupo,
    @Schema(description = "Cupo diario configurado", example = "8")
    int cupoDiario,
    @Schema(description = "Turnos del mes por marca de vehículo")
    List<MarcaEstadisticaDTO> marcas
) {}