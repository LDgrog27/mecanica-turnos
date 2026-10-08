package com.barber.barberBackend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
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

    private static final ZoneId ZONA_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");

    private final ITurnoRepository turnoRepository;

    @Value("${turnos.cupo-diario:8}")
    private int cupoDiario = 8;

    public PanelTallerService(ITurnoRepository turnoRepository) {
        this.turnoRepository = turnoRepository;
    }

    public PanelTallerDTO obtener() {
        LocalDate hoy = LocalDate.now(ZONA_ARGENTINA);
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

        List<MarcaEstadisticaDTO> marcas = turnoRepository.countTurnosByMarca(desde, hasta);

        return new PanelTallerDTO(turnosMes, promedio, diasSobrecupo, cupoDiario, marcas);
    }
}