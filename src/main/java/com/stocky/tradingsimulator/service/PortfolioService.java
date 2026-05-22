package com.stocky.tradingsimulator.service;

import com.stocky.tradingsimulator.model.Holding;
import com.stocky.tradingsimulator.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PortfolioService {

    private final UserService userService;
    private final HoldingService holdingService;

    public Optional<PortfolioResponse> getPortfolio(Long userId) {
        Optional<User> userOptional = userService.getUserById(userId);
        if (userOptional.isEmpty()) {
            return Optional.empty();
        }

        User user = userOptional.get();
        List<PortfolioHoldingResponse> holdings = holdingService.getHoldingsByUserId(userId)
                .stream()
                .map(this::toPortfolioHoldingResponse)
                .toList();

        return Optional.of(new PortfolioResponse(
                user.getId(),
                user.getEmail(),
                user.getAvailableCash(),
                holdings
        ));
    }

    private PortfolioHoldingResponse toPortfolioHoldingResponse(Holding holding) {
        BigDecimal currentStockPrice = holding.getStock() == null || holding.getStock().getCurrentPrice() == null
                ? null
                : BigDecimal.valueOf(holding.getStock().getCurrentPrice());
        String symbol = holding.getSymbol() != null ? holding.getSymbol()
                : holding.getStock() != null ? holding.getStock().getSymbol() : null;
        Long stockId = holding.getStock() != null ? holding.getStock().getId() : null;

        return new PortfolioHoldingResponse(
                holding.getId(),
                stockId,
                symbol,
                currentStockPrice,
                holding.getQuantity(),
                holding.getAveragePrice()
        );
    }

    public record PortfolioResponse(
            Long userId,
            String username,
            BigDecimal balance,
            List<PortfolioHoldingResponse> holdings
    ) {
    }

    public record PortfolioHoldingResponse(
            Long holdingId,
            Long stockId,
            String symbol,
            BigDecimal currentPrice,
            Integer quantity,
            BigDecimal averagePrice
    ) {
    }
}
