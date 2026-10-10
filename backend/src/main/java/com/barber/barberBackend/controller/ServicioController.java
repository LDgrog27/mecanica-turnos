package com.barber.barberBackend.controller;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.barber.barberBackend.dto.CambiarEstadoRequestDTO;
import com.barber.barberBackend.dto.ServicioRequestDTO;
import com.barber.barberBackend.dto.ServicioResponseDTO;
import com.barber.barberBackend.generics.GenericController;
import com.barber.barberBackend.model.Servicio;
import com.barber.barberBackend.service.ServicioMapper;
import com.barber.barberBackend.service.ServicioService;

@RestController
@RequestMapping("/servicios")
@Tag(name = "Servicios", description = "Gestión de servicios ofrecidos (crear, editar y desactivar: solo ADMIN)")
public class ServicioController extends GenericController<Servicio, ServicioResponseDTO, Long, ServicioService> {

    private final ServicioService service;
    private final ServicioMapper mapper;

    public ServicioController(ServicioService service, ServicioMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @Override
    protected ServicioResponseDTO toDTO(Servicio entity) {
        return mapper.toResponseDTO(entity);
    }

    @Operation(summary = "Crear un nuevo servicio")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Servicio creado"),
        @ApiResponse(responseCode = "400", description = "Datos inválidos", content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
        @ApiResponse(responseCode = "409", description = "Ya existe un servicio con ese nombre", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PostMapping
    public ResponseEntity<ServicioResponseDTO> create(@RequestBody @Valid ServicioRequestDTO request) {
        Servicio saved = service.crear(request.tipo(), request.precio());
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponseDTO(saved));
    }

    @Operation(summary = "Editar el nombre y el precio de un servicio")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Servicio actualizado"),
        @ApiResponse(responseCode = "400", description = "Datos inválidos", content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
        @ApiResponse(responseCode = "404", description = "Servicio no encontrado", content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
        @ApiResponse(responseCode = "409", description = "Ya existe otro servicio con ese nombre", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PutMapping("/{id}")
    public ResponseEntity<ServicioResponseDTO> actualizar(@PathVariable("id") Long id,
            @RequestBody @Valid ServicioRequestDTO request) {
        Servicio actualizado = service.actualizar(id, request.tipo(), request.precio());
        return ResponseEntity.ok(mapper.toResponseDTO(actualizado));
    }

    @Operation(summary = "Activar o desactivar un servicio",
               description = "Un servicio desactivado no se puede elegir en turnos nuevos, pero los turnos anteriores lo siguen mostrando.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Estado actualizado"),
        @ApiResponse(responseCode = "404", description = "Servicio no encontrado", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PutMapping("/{id}/activo")
    public ResponseEntity<ServicioResponseDTO> cambiarEstado(@PathVariable("id") Long id,
            @RequestBody @Valid CambiarEstadoRequestDTO request) {
        Servicio actualizado = service.cambiarEstado(id, request.activo());
        return ResponseEntity.ok(mapper.toResponseDTO(actualizado));
    }

    @Operation(summary = "Crear múltiples servicios")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Servicios creados"),
        @ApiResponse(responseCode = "400", description = "Datos inválidos", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PostMapping("/all")
    public ResponseEntity<List<ServicioResponseDTO>> createMultiple(@RequestBody @Valid List<ServicioRequestDTO> requests) {
        List<Servicio> entities = requests.stream().map(mapper::toEntity).toList();
        List<Servicio> saved = service.saveAll(entities);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            saved.stream().map(mapper::toResponseDTO).toList()
        );
    }
}