package com.stocky.tradingsimulator.service;

import com.stocky.tradingsimulator.exception.BusinessValidationException;
import com.stocky.tradingsimulator.model.User;
import com.stocky.tradingsimulator.model.UserDefaults;
import com.stocky.tradingsimulator.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User createUser(User user) {
        String email = normalizeEmail(user.getEmail());
        String password = normalizePassword(user.getPasswordHash());

        if (email.isBlank()) {
            throw new BusinessValidationException("Email is required");
        }

        user.setEmail(email);
        user.setPasswordHash(encodePasswordIfNeeded(password));
        if (user.getAvailableCash() == null) {
            user.setAvailableCash(UserDefaults.DEFAULT_AVAILABLE_CASH);
        }

        return userRepository.save(user);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long userId) {
        return userRepository.findById(userId);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePassword(String password) {
        return password == null ? "" : password.trim();
    }

    private String encodePasswordIfNeeded(String password) {
        if (password.isBlank()) {
            throw new BusinessValidationException("Password is required");
        }
        if (isBcryptHash(password)) {
            return password;
        }
        return passwordEncoder.encode(password);
    }

    private boolean isBcryptHash(String value) {
        return value.startsWith("$2a$")
                || value.startsWith("$2b$")
                || value.startsWith("$2y$");
    }
}
