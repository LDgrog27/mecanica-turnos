package com.barber.barberBackend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Basic;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@Entity
@Table(indexes = @Index(name = "idx_documento_turno", columnList = "turno_id"))
public class DocumentoTurno {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    @JoinColumn(name = "turno_id")
    private Turno turno;
    @Basic(optional = false)
    private String nombreOriginal;
    @Basic(optional = false)
    private String rutaStorage;
    private long tamanioBytes;
    private LocalDateTime fechaSubida;
    private String subidoPor;
}