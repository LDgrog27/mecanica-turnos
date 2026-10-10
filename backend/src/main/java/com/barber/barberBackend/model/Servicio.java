package com.barber.barberBackend.model;

import jakarta.persistence.Basic;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Entity
public class Servicio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Basic
    private String tipo;
    private float precio;
    private Boolean activo = true;

    public Servicio(Long id, String tipo, float precio) {
        this.id = id;
        this.tipo = tipo;
        this.precio = precio;
    }

    /** Los servicios anteriores a este cambio no tienen valor guardado: se consideran activos. */
    public boolean estaActivo() {
        return !Boolean.FALSE.equals(activo);
    }
}