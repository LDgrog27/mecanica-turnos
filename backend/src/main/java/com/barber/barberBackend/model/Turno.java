package com.barber.barberBackend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Basic;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Entity
@Table(indexes = {
    @Index(name = "idx_turno_fechahora", columnList = "fechaHora"),
    @Index(name = "idx_turno_patente", columnList = "patente")
})
public class Turno {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    @Basic(optional = false)
    private LocalDateTime fechaHora;
    @ManyToOne
    private Cliente cliente;
    @ManyToOne
    private Servicio servicio;

    // Datos del vehículo
    private String patente;
    private String marca;
    private String modelo;
    private Integer anio;
    private String color;

    public Turno(Long id, LocalDateTime fechaHora, Cliente cliente, Servicio servicio) {
        this.id = id;
        this.fechaHora = fechaHora;
        this.cliente = cliente;
        this.servicio = servicio;
    }
}