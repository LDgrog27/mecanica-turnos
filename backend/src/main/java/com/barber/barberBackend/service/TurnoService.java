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
import com.barber.barberBackend.exception.ResourceNotFoundException;
import com.barber.barberBackend.generics.GenericService;
import com.barber.barberBackend.model.Cliente;
import com.barber.barberBackend.model.Turno;
import com.barber.barberBackend.repository.IClienteRepository;
import com.barber.barberBackend.repository.ITurnoRepository;

@Service
public class TurnoService extends GenericService<Turno, Long, ITurnoRepository> implements ITurnoService {

    private static final ZoneId ZONA_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final int MAXIMO_RESULTADOS_BUSQUEDA = 100;

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
        controlarCupo(entity.getFechaHora().toLocalDate(), confirmarExcedente);

        Cliente existingCliente = clienteRepository.findByTelefono(cliente.getTelefono());

        if (existingCliente != null) {
            entity.setCliente(existingCliente);
        } else {
            cliente = clienteRepository.save(cliente);
            entity.setCliente(cliente);
        }

        return repository.save(entity);
    }

    /**
     * Edita un turno existente. "nuevo" trae los datos nuevos (servicio ya resuelto,
     * cliente sin guardar). La fecha y el cupo solo se controlan si cambió la fecha u hora,
     * así se pueden corregir datos de turnos viejos sin que los rechace la regla de "no antes de hoy".
     */
    public Turno actualizar(Long id, Turno nuevo, boolean confirmarExcedente) {
        Turno existente = turnoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe un turno con el id " + id));

        Cliente datosCliente = nuevo.getCliente();
        if (datosCliente == null || datosCliente.getTelefono() == null || datosCliente.getTelefono().isBlank()) {
            throw new BusinessRuleViolationException("El cliente debe tener un Teléfono antes de guardar el turno.");
        }

        boolean cambioFechaHora = !nuevo.getFechaHora().equals(existente.getFechaHora());
        if (cambioFechaHora) {
            validateDateTime(nuevo.getFechaHora());
            if (!nuevo.getFechaHora().toLocalDate().equals(existente.getFechaHora().toLocalDate())) {
                controlarCupo(nuevo.getFechaHora().toLocalDate(), confirmarExcedente);
            }
        }

        Cliente cliente = clienteRepository.findByTelefono(datosCliente.getTelefono());
        if (cliente == null) {
            cliente = new Cliente();
            cliente.setTelefono(datosCliente.getTelefono());
        }
        cliente.setNombre(datosCliente.getNombre());
        cliente.setApellido(datosCliente.getApellido());
        cliente.setEmail(datosCliente.getEmail());
        cliente = clienteRepository.save(cliente);

        existente.setFechaHora(nuevo.getFechaHora());
        existente.setServicio(nuevo.getServicio());
        existente.setCliente(cliente);
        existente.setPatente(nuevo.getPatente());
        existente.setMarca(nuevo.getMarca());
        existente.setModelo(nuevo.getModelo());
        existente.setAnio(nuevo.getAnio());
        existente.setColor(nuevo.getColor());
        return turnoRepository.save(existente);
    }

    private void controlarCupo(LocalDate dia, boolean confirmarExcedente) {
        long turnosDelDia = turnoRepository.countByFechaHoraBetween(dia.atStartOfDay(), dia.atTime(23, 59, 59));
        if (turnosDelDia >= cupoDiario && !confirmarExcedente) {
            throw new CupoExcedidoException(cupoDiario, turnosDelDia, dia);
        }
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

    public List<Turno> buscar(String q) {
        if (q == null || q.isBlank()) {
            return List.of();
        }
        String texto = q.trim().toLowerCase();
        String patente = q.replaceAll("[\\s-]", "").toUpperCase();
        if (patente.isEmpty()) {
            return List.of();
        }
        return turnoRepository.buscar("%" + patente + "%", "%" + texto + "%")
                .stream()
                .limit(MAXIMO_RESULTADOS_BUSQUEDA)
                .toList();
    }

}