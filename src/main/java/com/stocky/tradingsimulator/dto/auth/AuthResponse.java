package com.stocky.tradingsimulator.dto.auth;

import com.stocky.tradingsimulator.model.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private Long userId;
    private String email;
    private BigDecimal availableCash;

    public static AuthResponse from(User user, String token) {
        return new AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getAvailableCash()
        );
    }
}
