package com.stocky.tradingsimulator.security;

import com.stocky.tradingsimulator.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        String normalizedEmail = normalizeEmail(email);
        return userRepository.findByEmail(normalizedEmail)
                .map(user -> {
                    String passwordHash = user.getPasswordHash();
                    if (passwordHash == null || passwordHash.isBlank()) {
                        throw new UsernameNotFoundException("Invalid credentials for user: " + normalizedEmail);
                    }
                    return User.builder()
                            .username(user.getEmail())
                            .password(passwordHash)
                            .authorities("ROLE_USER")
                            .build();
                })
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + normalizedEmail));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
