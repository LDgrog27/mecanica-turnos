package com.barber.barberBackend.auth;

import java.io.IOException;
import java.net.URI;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.barber.barberBackend.model.Administrador;
import com.barber.barberBackend.model.Rol;
import com.barber.barberBackend.repository.IAdministradorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;
    private final IAdministradorRepository administradorRepository;

    public JwtAuthenticationFilter(JwtService jwtService, ObjectMapper objectMapper,
                                   IAdministradorRepository administradorRepository) {
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
        this.administradorRepository = administradorRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader(AUTHORIZATION_HEADER);

        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER_PREFIX.length());
        Claims claims = jwtService.validateToken(token);

        if (claims == null) {
            writeProblemDetail(response, "Token JWT inválido o expirado");
            return;
        }

        Long idCuenta;
        try {
            idCuenta = Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            writeProblemDetail(response, "Token JWT inválido o expirado");
            return;
        }

        Administrador cuenta = administradorRepository.findById(idCuenta).orElse(null);
        if (cuenta == null || !cuenta.estaActivo()) {
            writeProblemDetail(response, "La cuenta no existe o está desactivada");
            return;
        }

        Rol rol = cuenta.getRol() != null ? cuenta.getRol() : Rol.VISOR;
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(claims.getSubject(), null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }

    private void writeProblemDetail(HttpServletResponse response, String detail) throws IOException {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
        pd.setTitle("No autorizado");
        pd.setDetail(detail);
        pd.setType(URI.create("/errors/unauthorized"));

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), pd);
    }
}