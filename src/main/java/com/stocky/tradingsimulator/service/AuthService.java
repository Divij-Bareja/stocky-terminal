package com.stocky.tradingsimulator.service;

import com.stocky.tradingsimulator.dto.auth.AuthResponse;
import com.stocky.tradingsimulator.dto.auth.LoginRequest;
import com.stocky.tradingsimulator.dto.auth.RegisterRequest;
import com.stocky.tradingsimulator.exception.BusinessValidationException;
import com.stocky.tradingsimulator.model.User;
import com.stocky.tradingsimulator.repository.UserRepository;
import com.stocky.tradingsimulator.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        RegisterRequest normalized = normalizeRegisterRequest(request);
        validateCredentials(normalized.getEmail(), normalized.getPassword());

        if (userRepository.existsByEmail(normalized.getEmail())) {
            throw new BusinessValidationException("Email is already registered");
        }

        User createdUser;
        try {
            createdUser = userRepository.save(User.builder()
                    .email(normalized.getEmail())
                    .passwordHash(passwordEncoder.encode(normalized.getPassword()))
                    .build());
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessValidationException("Email is already registered");
        }

        String token = jwtService.generateToken(createdUser);
        return AuthResponse.from(createdUser, token);
    }

    public AuthResponse login(LoginRequest request) {
        LoginRequest normalized = normalizeLoginRequest(request);
        validateCredentials(normalized.getEmail(), normalized.getPassword());

        User user = userRepository.findByEmail(normalized.getEmail())
                .orElseThrow(() -> unauthorized());

        String storedPassword = user.getPasswordHash();
        if (storedPassword == null || storedPassword.isBlank()) {
            throw unauthorized();
        }

        if (isBcryptHash(storedPassword)) {
            authenticate(normalized.getEmail(), normalized.getPassword());
        } else if (normalized.getPassword().equals(storedPassword)) {
            user.setPasswordHash(passwordEncoder.encode(normalized.getPassword()));
            user = userRepository.save(user);
        } else {
            throw unauthorized();
        }

        return AuthResponse.from(user, jwtService.generateToken(user));
    }

    private void authenticate(String email, String password) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );
        } catch (AuthenticationException | IllegalArgumentException ex) {
            throw unauthorized();
        }
    }

    private RegisterRequest normalizeRegisterRequest(RegisterRequest request) {
        if (request == null) {
            throw new BusinessValidationException("Request body is required");
        }
        return new RegisterRequest(
                normalizeEmail(request.getEmail()),
                normalizePassword(request.getPassword())
        );
    }

    private LoginRequest normalizeLoginRequest(LoginRequest request) {
        if (request == null) {
            throw new BusinessValidationException("Request body is required");
        }
        return new LoginRequest(
                normalizeEmail(request.getEmail()),
                normalizePassword(request.getPassword())
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePassword(String password) {
        return password == null ? "" : password;
    }

    private void validateCredentials(String email, String password) {
        if (email.isBlank()) {
            throw new BusinessValidationException("Email is required");
        }
        if (password.isBlank()) {
            throw new BusinessValidationException("Password is required");
        }
    }

    private boolean isBcryptHash(String value) {
        return value.startsWith("$2a$")
                || value.startsWith("$2b$")
                || value.startsWith("$2y$");
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }
}
