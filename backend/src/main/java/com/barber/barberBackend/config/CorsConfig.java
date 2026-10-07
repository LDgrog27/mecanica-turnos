package com.barber.barberBackend.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

    /*
     * Nombre de bean explícito y compartido entre perfiles para poder
     * inyectarlo con @Qualifier desde SecurityConfig. Es necesario porque
     * Spring MVC ya registra otro CorsConfigurationSource
     * (mvcHandlerMappingIntrospector), lo que causa ambigüedad por tipo.
     */
    public static final String CORS_SOURCE_BEAN = "barberCorsConfigurationSource";

    /*
     * Perfiles de desarrollo (default, h2, test, etc.): solo los puertos que
     * se usan en local. Nunca debe estar activo en producción.
     */
    @Bean(CORS_SOURCE_BEAN)
    @Profile("!prod")
    public CorsConfigurationSource corsConfigurationSourceDev() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:5500",
                "http://localhost:5500"));
        config.setAllowedMethods(List.of("*"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /*
     * Perfil de producción: solo los orígenes indicados en la variable de
     * entorno CORS_ALLOWED_ORIGINS (separados por coma, sin barra final).
     * Si la variable no está definida, no se permite ningún origen.
     */
    @Bean(CORS_SOURCE_BEAN)
    @Profile("prod")
    public CorsConfigurationSource corsConfigurationSourceProd(
            @Value("${app.cors.allowed-origins:}") List<String> origenesPermitidos) {
        CorsConfiguration config = new CorsConfiguration();
        origenesPermitidos.stream()
                .map(String::trim)
                .filter(origen -> !origen.isEmpty())
                .forEach(config::addAllowedOrigin);
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}