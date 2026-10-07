package com.barber.barberBackend.dto;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

/** Muestra el precio solo si quien consulta es ADMIN; para los demás roles devuelve null. */
public class PrecioSoloAdminSerializer extends JsonSerializer<Float> {

    @Override
    public void serialize(Float valor, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean esAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (esAdmin && valor != null) {
            gen.writeNumber(valor.floatValue());
        } else {
            gen.writeNull();
        }
    }
}