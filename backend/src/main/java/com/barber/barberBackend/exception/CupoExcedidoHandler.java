package com.barber.barberBackend.exception;

import java.net.URI;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CupoExcedidoHandler {

    @ExceptionHandler(CupoExcedidoException.class)
    public ResponseEntity<ProblemDetail> handle(CupoExcedidoException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        pd.setTitle("Cupo diario completo");
        pd.setType(URI.create("/errors/cupo-excedido"));
        pd.setProperty("cupo", ex.getCupo());
        pd.setProperty("turnosActuales", ex.getTurnosActuales());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(pd);
    }
}