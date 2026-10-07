package com.barber.barberBackend.exception;

import java.time.LocalDate;

public class CupoExcedidoException extends RuntimeException {

    private final int cupo;
    private final long turnosActuales;

    public CupoExcedidoException(int cupo, long turnosActuales, LocalDate dia) {
        super("Ya hay " + turnosActuales + " turnos tomados para el " + dia + " (cupo: " + cupo + ").");
        this.cupo = cupo;
        this.turnosActuales = turnosActuales;
    }

    public int getCupo() {
        return cupo;
    }

    public long getTurnosActuales() {
        return turnosActuales;
    }
}