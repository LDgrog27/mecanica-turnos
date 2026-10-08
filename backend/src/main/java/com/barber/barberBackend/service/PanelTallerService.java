package com.barber.barberBackend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.barber.barberBackend.dto.MarcaEstadisticaDTO;
import com.barber.barberBackend.dto.PanelTallerDTO;
import com.barber.barberBackend.repository.ITurnoRepository;

@Service
public class PanelTallerService {

    // Zona horaria del taller (Ciudad de México)
    private static final ZoneId ZONA_HORARIA = ZoneId.of("America/Mexico_City");

    private final ITurnoRepository turnoRepository;

    @Value("${turnos.cupo-diario:8}")
    private int cupoDiario = 8;

    public PanelTallerService(ITurnoRepository turnoRepository) {
        this.turnoRepository = turnoRepository;
    }

    public PanelTallerDTO obtener() {
        LocalDate hoy = LocalDate.now(ZONA_HORARIA);
        LocalDateTime desde = hoy.withDayOfMonth(1).atStartOfDay();
        LocalDateTime hasta = desde.plusMonths(1);

        List<LocalDateTime> fechas = turnoRepository.findFechasEntre(desde, hasta);
        Map<LocalDate, Long> turnosPorDia = fechas.stream()
                .collect(Collectors.groupingBy(LocalDateTime::toLocalDate, Collectors.counting()));

        int turnosMes = fechas.size();
        double promedio = turnosPorDia.isEmpty()
                ? 0
                : Math.round((double) turnosMes / turnosPorDia.size() * 10) / 10.0;
        int diasSobrecupo = (int) turnosPorDia.values().stream().filter(n -> n > cupoDiario).count();

        List<MarcaEstadisticaDTO> marcas = unirMarcas(turnoRepository.countTurnosByMarca(desde, hasta));

        return new PanelTallerDTO(turnosMes, promedio, diasSobrecupo, cupoDiario, marcas);
    }

    /** Une marcas escritas con distinta mayúscula ("Audi" y "AUDI") y rotula las vacías como "Sin marca". */
    private List<MarcaEstadisticaDTO> unirMarcas(List<MarcaEstadisticaDTO> marcasCrudas) {
        Map<String, Long> cantidades = new LinkedHashMap<>();
        Map<String, String> nombres = new HashMap<>();
        for (MarcaEstadisticaDTO m : marcasCrudas) {
            String nombre = (m.marca() == null || m.marca().isBlank()) ? "Sin marca" : m.marca().trim();
            String clave = nombre.toLowerCase();
            nombres.putIfAbsent(clave, capitalizar(nombre));
            cantidades.merge(clave, m.cantidad() == null ? 0L : m.cantidad(), Long::sum);
        }
        return cantidades.entrySet().stream()
                .map(e -> new MarcaEstadisticaDTO(nombres.get(e.getKey()), e.getValue()))
                .sorted(Comparator.comparing(MarcaEstadisticaDTO::cantidad, Comparator.reverseOrder())
                        .thenComparing(MarcaEstadisticaDTO::marca))
                .toList();
    }

    private String capitalizar(String texto) {
        return Character.toUpperCase(texto.charAt(0)) + texto.substring(1).toLowerCase();
    }
}