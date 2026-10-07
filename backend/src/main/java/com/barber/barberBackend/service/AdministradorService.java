package com.barber.barberBackend.service;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Service;

import com.barber.barberBackend.exception.BusinessRuleViolationException;
import com.barber.barberBackend.exception.InvalidCredentialsException;
import com.barber.barberBackend.exception.ResourceNotFoundException;
import com.barber.barberBackend.generics.GenericService;
import com.barber.barberBackend.model.Administrador;
import com.barber.barberBackend.repository.IAdministradorRepository;

@Service
public class AdministradorService extends GenericService<Administrador, Long, IAdministradorRepository> implements IAdministradorService {

    private final Argon2PasswordEncoder passwordEncoder;
    private final IAdministradorRepository adminRepository;

    public AdministradorService(Argon2PasswordEncoder passwordEncoder, IAdministradorRepository repository) {
        super(repository);
        this.passwordEncoder = passwordEncoder;
        this.adminRepository = repository;
    }

    @Override
    public Administrador save(Administrador admin) {
        admin.setContrasenia(passwordEncoder.encode(admin.getContrasenia()));
        return super.save(admin);
    }

    @Override
    public Administrador login(String email, String contrasenia) {
        if (email == null || contrasenia == null) {
            throw new InvalidCredentialsException("El email y la contraseña no pueden ser nulos");
        }

        Administrador administrador = adminRepository.findByEmail(email);

        if (administrador == null
                || !administrador.estaActivo()
                || !passwordEncoder.matches(contrasenia, administrador.getContrasenia())) {
            throw new InvalidCredentialsException("Credenciales inválidas");
        }

        return administrador;
    }

    public Administrador cambiarContrasenia(Long id, String nuevaContrasenia) {
        if (nuevaContrasenia == null || nuevaContrasenia.length() < 8) {
            throw new BusinessRuleViolationException("La contraseña debe tener al menos 8 caracteres.");
        }
        Administrador admin = buscar(id);
        admin.setContrasenia(passwordEncoder.encode(nuevaContrasenia));
        return adminRepository.save(admin);
    }

    public Administrador cambiarEstado(Long id, boolean activo, String idSolicitante) {
        Administrador admin = buscar(id);
        if (!activo && String.valueOf(id).equals(idSolicitante)) {
            throw new BusinessRuleViolationException("No podés desactivar tu propia cuenta.");
        }
        admin.setActivo(activo);
        return adminRepository.save(admin);
    }

    private Administrador buscar(Long id) {
        return adminRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe una cuenta con el id " + id));
    }

}