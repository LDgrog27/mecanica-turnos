package com.barber.barberBackend.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.barber.barberBackend.exception.BusinessRuleViolationException;
import com.barber.barberBackend.exception.ResourceNotFoundException;
import com.barber.barberBackend.model.DocumentoTurno;
import com.barber.barberBackend.model.Turno;
import com.barber.barberBackend.repository.IDocumentoTurnoRepository;
import com.barber.barberBackend.repository.ITurnoRepository;

@Service
public class DocumentoTurnoService {

    private static final byte[] FIRMA_PDF = "%PDF-".getBytes(StandardCharsets.US_ASCII);
    private static final ZoneId ZONA_ARGENTINA = ZoneId.of("America/Mexico_City");

    @Value("${documentos.max-bytes:5242880}")
    private long maxBytes;

    private final IDocumentoTurnoRepository documentoRepository;
    private final ITurnoRepository turnoRepository;
    private final SupabaseStorageService storage;

    public DocumentoTurnoService(IDocumentoTurnoRepository documentoRepository,
            ITurnoRepository turnoRepository, SupabaseStorageService storage) {
        this.documentoRepository = documentoRepository;
        this.turnoRepository = turnoRepository;
        this.storage = storage;
    }

    public DocumentoTurno subir(Long turnoId, MultipartFile archivo, String subidoPor) {
        Turno turno = turnoRepository.findById(turnoId)
                .orElseThrow(() -> new ResourceNotFoundException("No existe un turno con el id " + turnoId));

        if (archivo == null || archivo.isEmpty()) {
            throw new BusinessRuleViolationException("Tenés que adjuntar un archivo PDF.");
        }
        if (archivo.getSize() > maxBytes) {
            throw new BusinessRuleViolationException(
                    "El archivo supera el máximo de " + (maxBytes / 1024 / 1024) + " MB.");
        }

        byte[] contenido;
        try {
            contenido = archivo.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo leer el archivo recibido", e);
        }
        if (!esPdf(contenido)) {
            throw new BusinessRuleViolationException("El archivo no es un PDF válido.");
        }

        String ruta = "turno-" + turnoId + "/" + UUID.randomUUID() + ".pdf";
        storage.subir(ruta, contenido, "application/pdf");

        DocumentoTurno documento = new DocumentoTurno();
        documento.setTurno(turno);
        documento.setNombreOriginal(limpiarNombre(archivo.getOriginalFilename()));
        documento.setRutaStorage(ruta);
        documento.setTamanioBytes(contenido.length);
        documento.setFechaSubida(LocalDateTime.now(ZONA_ARGENTINA));
        documento.setSubidoPor(subidoPor);
        return documentoRepository.save(documento);
    }

    public List<DocumentoTurno> listar(Long turnoId) {
        if (!turnoRepository.existsById(turnoId)) {
            throw new ResourceNotFoundException("No existe un turno con el id " + turnoId);
        }
        return documentoRepository.findByTurnoIdOrderByFechaSubidaDesc(turnoId);
    }

    public DocumentoTurno obtener(Long id) {
        return documentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe un documento con el id " + id));
    }

    public byte[] descargar(DocumentoTurno documento) {
        return storage.descargar(documento.getRutaStorage());
    }

    private boolean esPdf(byte[] contenido) {
        if (contenido.length < FIRMA_PDF.length) {
            return false;
        }
        for (int i = 0; i < FIRMA_PDF.length; i++) {
            if (contenido[i] != FIRMA_PDF[i]) {
                return false;
            }
        }
        return true;
    }

    private String limpiarNombre(String original) {
        String nombre = original == null ? "" : original;
        int barra = Math.max(nombre.lastIndexOf('/'), nombre.lastIndexOf('\\'));
        if (barra >= 0) {
            nombre = nombre.substring(barra + 1);
        }
        nombre = nombre.replaceAll("[^\\p{L}\\p{N}._ ()-]", "_").trim();
        if (nombre.isEmpty()) {
            nombre = "diagnostico";
        }
        if (!nombre.toLowerCase().endsWith(".pdf")) {
            nombre = nombre + ".pdf";
        }
        if (nombre.length() > 120) {
            nombre = nombre.substring(nombre.length() - 120);
        }
        return nombre;
    }
}