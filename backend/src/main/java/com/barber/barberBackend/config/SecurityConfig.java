package com.barber.barberBackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.net.URI;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

import com.barber.barberBackend.auth.JwtAuthenticationFilter;
import com.barber.barberBackend.auth.JwtService;
import com.barber.barberBackend.repository.IAdministradorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
public class SecurityConfig {

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;
    private final CorsConfigurationSource corsConfigurationSource;
    private final IAdministradorRepository administradorRepository;

    public SecurityConfig(JwtService jwtService, ObjectMapper objectMapper,
            @Qualifier(CorsConfig.CORS_SOURCE_BEAN) CorsConfigurationSource corsConfigurationSource,
            IAdministradorRepository administradorRepository) {
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
        this.corsConfigurationSource = corsConfigurationSource;
        this.administradorRepository = administradorRepository;
    }

    @Bean
    public Argon2PasswordEncoder passwordEncoder() {
        return new Argon2PasswordEncoder(16, 32, 1, 19456, 2);
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthFilter() {
        return new JwtAuthenticationFilter(jwtService, objectMapper, administradorRepository);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Abierto sin sesión
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/ping").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.POST, "/administradores/login").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()
                // Solo ADMIN
                .requestMatchers("/estadisticas/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/administradores/**").denyAll()
                .requestMatchers(HttpMethod.DELETE, "/administradores/**").denyAll()
                .requestMatchers("/administradores/**").hasRole("ADMIN")
                // Consultas: los tres roles
                .requestMatchers(HttpMethod.GET, "/**").authenticated()
                // Turnos y clientes: borrar y cargar en masa, solo ADMIN
                .requestMatchers(HttpMethod.DELETE, "/turnos/**", "/clientes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/turnos/all").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/turnos/**", "/clientes/**", "/servicios/**").denyAll()
                .requestMatchers(HttpMethod.DELETE, "/servicios/**").denyAll()
                // Turnos y clientes: crear y editar, ADMIN y OPERADOR
                .requestMatchers("/turnos/**", "/clientes/**").hasAnyRole("ADMIN", "OPERADOR")
                // Todo lo demás (servicios, etc.): solo ADMIN
                .anyRequest().hasRole("ADMIN")
            )
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
                    pd.setTitle("No autorizado");
                    pd.setDetail("Se requiere autenticaci\u00f3n para acceder a este recurso");
                    pd.setType(URI.create("/errors/unauthorized"));
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
                    objectMapper.writeValue(response.getWriter(), pd);
                })
            )
            .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}