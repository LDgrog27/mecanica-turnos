package com.barber.barberBackend.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SupabaseStorageService {

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${supabase.url:}")
    private String url;

    @Value("${supabase.secret-key:}")
    private String secretKey;

    @Value("${supabase.bucket:diagnosticos}")
    private String bucket;

    public void subir(String ruta, byte[] contenido, String contentType) {
        HttpRequest request = builder("/storage/v1/object/" + bucket + "/" + ruta)
                .header("Content-Type", contentType)
                .header("x-upsert", "false")
                .POST(BodyPublishers.ofByteArray(contenido))
                .build();
        HttpResponse<Void> response = enviar(request, BodyHandlers.discarding());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException(
                    "No se pudo guardar el archivo en el almacenamiento (código " + response.statusCode() + ")");
        }
    }

    public byte[] descargar(String ruta) {
        HttpRequest request = builder("/storage/v1/object/authenticated/" + bucket + "/" + ruta)
                .GET()
                .build();
        HttpResponse<byte[]> response = enviar(request, BodyHandlers.ofByteArray());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException(
                    "No se pudo leer el archivo del almacenamiento (código " + response.statusCode() + ")");
        }
        return response.body();
    }

    private HttpRequest.Builder builder(String path) {
        if (url.isBlank() || secretKey.isBlank()) {
            throw new IllegalStateException(
                    "El almacenamiento de archivos no está configurado (faltan SUPABASE_URL o SUPABASE_SECRET_KEY)");
        }
        return HttpRequest.newBuilder(URI.create(url + path))
                .timeout(Duration.ofSeconds(30))
                .header("apikey", secretKey)
                .header("Authorization", "Bearer " + secretKey);
    }

    private <T> HttpResponse<T> enviar(HttpRequest request, HttpResponse.BodyHandler<T> handler) {
        try {
            return http.send(request, handler);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo conectar con el almacenamiento de archivos", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("La conexión con el almacenamiento fue interrumpida", e);
        }
    }
}