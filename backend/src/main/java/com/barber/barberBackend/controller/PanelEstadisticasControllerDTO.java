package com.barber.barberBackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.ProblemDetail;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.barber.barberBackend.dto.PanelEstadisticaDTO;
import com.barber.barberBackend.dto.PanelTallerDTO;
import com.barber.barberBackend.service.PanelEstadisticaDTOService;
import com.barber.barberBackend.service.PanelTallerService;
import org.springframework.web.bind.annotation.GetMapping;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/estadisticas")
@Tag(name = "Estadísticas", description = "Panel de estadísticas del negocio (solo ADMIN)")
@RequiredArgsConstructor
public class PanelEstadisticasControllerDTO {
    private final PanelEstadisticaDTOService panelEstadisticaDTOService;
    private final PanelTallerService panelTallerService;

    @Operation(summary = "Obtener panel de estadísticas", description = "Devuelve turnos hoy, ayer, ingresos del mes, servicios más pedidos y horarios con más actividad")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Panel de estadísticas"),
        @ApiResponse(responseCode = "500", description = "Error interno al generar estadísticas", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @GetMapping("/panel")
    public PanelEstadisticaDTO estadisticas() {
        return panelEstadisticaDTOService.obtenerPanelEstadisticaDTO();
    }

    @Operation(summary = "Estadísticas propias del taller", description = "Turnos del mes, promedio por día, días con sobrecupo y turnos por marca")
    @GetMapping("/taller")
    public PanelTallerDTO taller() {
        return panelTallerService.obtener();
    }
}