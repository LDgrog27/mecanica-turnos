package com.barber.barberBackend.controller;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.barber.barberBackend.dto.DocumentoTurnoResponseDTO;
import com.barber.barberBackend.model.DocumentoTurno;
import com.barber.barberBackend.service.DocumentoTurnoService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "Documentos", description = "PDF de diagnóstico asociados a un turno")
public class DocumentoTurnoController {

    private final DocumentoTurnoService service;

    public DocumentoTurnoController(DocumentoTurnoService service) {
        this.service = service;
    }

    @Operation(summary = "Adjuntar un PDF de diagnóstico a un turno")
    @PostMapping(value = "/turnos/{turnoId}/documentos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentoTurnoResponseDTO> subir(
            @PathVariable("turnoId") Long turnoId,
            @RequestParam("archivo") MultipartFile archivo,
            Authentication authentication) {
        DocumentoTurno guardado = service.subir(turnoId, archivo, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(DocumentoTurnoResponseDTO.desde(guardado));
    }

    @Operation(summary = "Listar los PDF de un turno")
    @GetMapping("/turnos/{turnoId}/documentos")
    public List<DocumentoTurnoResponseDTO> listar(@PathVariable("turnoId") Long turnoId) {
        return service.listar(turnoId).stream().map(DocumentoTurnoResponseDTO::desde).toList();
    }

    @Operation(summary = "Descargar un PDF")
    @GetMapping("/documentos/{id}/descargar")
    public ResponseEntity<byte[]> descargar(@PathVariable("id") Long id) {
        DocumentoTurno documento = service.obtener(id);
        byte[] bytes = service.descargar(documento);
        ContentDisposition disposicion = ContentDisposition.attachment()
                .filename(documento.getNombreOriginal(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposicion.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(bytes);
    }
}