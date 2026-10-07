package com.barber.barberBackend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.barber.barberBackend.model.DocumentoTurno;

@Repository
public interface IDocumentoTurnoRepository extends JpaRepository<DocumentoTurno, Long> {
    List<DocumentoTurno> findByTurnoIdOrderByFechaSubidaDesc(Long turnoId);
}