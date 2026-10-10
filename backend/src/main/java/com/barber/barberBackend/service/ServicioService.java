package com.barber.barberBackend.service;

import org.springframework.stereotype.Service;

import com.barber.barberBackend.exception.BusinessRuleViolationException;
import com.barber.barberBackend.exception.ResourceAlreadyExistsException;
import com.barber.barberBackend.exception.ResourceNotFoundException;
import com.barber.barberBackend.generics.GenericService;
import com.barber.barberBackend.model.Servicio;
import com.barber.barberBackend.repository.IServicioRepository;

@Service
public class ServicioService extends GenericService<Servicio, Long, IServicioRepository> implements IServicioService {

    public ServicioService(IServicioRepository repository) {
        super(repository);
    }

    public Servicio crear(String tipo, float precio) {
        String nombre = normalizarNombre(tipo);
        validarNombreLibre(nombre, null);
        return repository.save(new Servicio(null, nombre, precio));
    }

    public Servicio actualizar(Long id, String tipo, float precio) {
        Servicio servicio = buscar(id);
        String nombre = normalizarNombre(tipo);
        validarNombreLibre(nombre, id);
        servicio.setTipo(nombre);
        servicio.setPrecio(precio);
        return repository.save(servicio);
    }

    public Servicio cambiarEstado(Long id, boolean activo) {
        Servicio servicio = buscar(id);
        servicio.setActivo(activo);
        return repository.save(servicio);
    }

    private Servicio buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe un servicio con el id " + id));
    }

    private String normalizarNombre(String tipo) {
        String nombre = tipo == null ? "" : tipo.trim().replaceAll("\\s+", " ");
        if (nombre.isEmpty()) {
            throw new BusinessRuleViolationException("El nombre del servicio es obligatorio.");
        }
        return nombre;
    }

    private void validarNombreLibre(String nombre, Long idActual) {
        boolean repetido = repository.findAll().stream()
                .filter(s -> idActual == null || !idActual.equals(s.getId()))
                .anyMatch(s -> s.getTipo() != null && s.getTipo().trim().equalsIgnoreCase(nombre));
        if (repetido) {
            throw new ResourceAlreadyExistsException("Ya existe un servicio llamado \"" + nombre + "\".");
        }
    }
}