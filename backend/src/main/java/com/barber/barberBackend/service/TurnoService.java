package com.barber.barberBackend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.barber.barberBackend.exception.BusinessRuleViolationException;
import com.barber.barberBackend.exception.CupoExcedidoException;
import com.barber.barberBackend.generics.GenericService;
import com.barber.barberBackend.model.Cliente;
import com.barber.barberBackend.model.Turno;
import com.barber.barberBackend.repository.IClienteRepository;
import com.barber.barberBackend.repository.ITurnoRepository;

@Service
public class TurnoService extends GenericService<Turno, Long, ITurnoRepository> implements ITurnoService {

    private static final ZoneId ZONA_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");

    private final ITurnoRepository turnoRepository;
    private final IClienteRepository clienteRepository;

    @Value("${turnos.cupo-diario:8}")
    private int cupoDiario = 8;

    public TurnoService(ITurnoRepository repository, IClienteRepository clienteRepository) {
        super(repository);
        this.turnoRepository = repository;
        this.clienteRepository = clienteRepository;
    }

    @Override
    public Turno save(Turno entity) {
        return save(entity, false);
    }

    public Turno save(Turno entity, boolean confirmarExcedente) {
        Cliente cliente = entity.getCliente();

        if (cliente != null && cliente.getTelefono() == null) {
            throw new BusinessRuleViolationException("El cliente debe tener un Teléfono antes de guardar el turno.");
        }

        validateDateTime(entity.getFechaHora());

        LocalDate dia = entity.getFechaHora().toLocalDate();
        long turnosDelDia = turnoRepository.countByFechaHoraBetween(dia.atStartOfDay(), dia.atTime(23, 59, 59));
        if (turnosDelDia >= cupoDiario && !confirmarExcedente) {
            throw new CupoExcedidoException(cupoDiario, turnosDelDia, dia);
        }

        Cliente existingCliente = clienteRepository.findByTelefono(cliente.getTelefono());

        if (existingCliente != null) {
            entity.setCliente(existingCliente);
        } else {
            cliente = clienteRepository.save(cliente);
            entity.setCliente(cliente);
        }

        return repository.save(entity);
    }

    @Override
    public void validateDateTime(LocalDateTime fechaHora) {
        LocalDate hoy = LocalDate.now(ZONA_ARGENTINA);
        if (fechaHora.toLocalDate().isBefore(hoy)) {
            throw new BusinessRuleViolationException("La fecha del turno no puede ser anterior a hoy.");
        }

        LocalTime hora = fechaHora.toLocalTime();
        boolean horaValida = hora.equals(LocalTime.of(8, 0)) || hora.equals(LocalTime.of(9, 0));
        if (!horaValida) {
            throw new BusinessRuleViolationException("La hora de llegada debe ser 08:00 o 09:00.");
        }
    }

    @Override
    public List<LocalDateTime> findDateTimes() {
        LocalDateTime ahora = LocalDateTime.now();
        return turnoRepository.findDateTimes(ahora);
    }

}