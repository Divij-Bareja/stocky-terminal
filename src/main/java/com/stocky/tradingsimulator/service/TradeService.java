package com.stocky.tradingsimulator.service;

import com.stocky.tradingsimulator.dto.TradeExecutionResponse;
import com.stocky.tradingsimulator.dto.TradeRequest;
import com.stocky.tradingsimulator.exception.BusinessValidationException;
import com.stocky.tradingsimulator.model.Holding;
import com.stocky.tradingsimulator.model.Stock;
import com.stocky.tradingsimulator.model.Transaction;
import com.stocky.tradingsimulator.model.TransactionType;
import com.stocky.tradingsimulator.model.User;
import com.stocky.tradingsimulator.repository.HoldingRepository;
import com.stocky.tradingsimulator.repository.StockRepository;
import com.stocky.tradingsimulator.repository.TransactionRepository;
import com.stocky.tradingsimulator.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TradeService {

    private static final int MONEY_SCALE = 4;

    private final UserRepository userRepository;
    private final HoldingRepository holdingRepository;
    private final StockRepository stockRepository;
    private final TransactionRepository transactionRepository;

    @Transactional
    public TradeExecutionResponse execute(TradeRequest request) {
        TradeRequest normalized = normalizeRequest(request);
        User user = getAuthenticatedUser();
        Stock stock = stockRepository.findBySymbol(normalized.getSymbol())
                .orElseThrow(() -> new BusinessValidationException("Symbol not found"));

        BigDecimal totalAmount = normalized.getPrice()
                .multiply(BigDecimal.valueOf(normalized.getQuantity()))
                .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

        return switch (normalized.getAction()) {
            case "BUY" -> executeBuy(user, stock, normalized, totalAmount);
            case "SELL" -> executeSell(user, stock, normalized, totalAmount);
            default -> throw new BusinessValidationException("action must be BUY or SELL");
        };
    }

    private TradeExecutionResponse executeBuy(User user, Stock stock, TradeRequest request, BigDecimal totalAmount) {
        if (user.getAvailableCash().compareTo(totalAmount) < 0) {
            throw new BusinessValidationException("Insufficient funds");
        }

        Holding holding = findHolding(user.getId(), stock.getId(), request.getSymbol())
                .orElseGet(() -> Holding.builder()
                        .user(user)
                        .stock(stock)
                        .symbol(request.getSymbol())
                        .quantity(0)
                        .averagePrice(BigDecimal.ZERO)
                        .build());

        int currentQuantity = holding.getQuantity();
        int boughtQuantity = request.getQuantity();
        int updatedQuantity = currentQuantity + boughtQuantity;

        BigDecimal currentValue = holding.getAveragePrice().multiply(BigDecimal.valueOf(currentQuantity));
        BigDecimal buyValue = request.getPrice().multiply(BigDecimal.valueOf(boughtQuantity));
        BigDecimal updatedAveragePrice = currentValue.add(buyValue)
                .divide(BigDecimal.valueOf(updatedQuantity), MONEY_SCALE, RoundingMode.HALF_UP);

        user.setAvailableCash(user.getAvailableCash().subtract(totalAmount));
        userRepository.save(user);

        holding.setStock(stock);
        holding.setSymbol(request.getSymbol());
        holding.setQuantity(updatedQuantity);
        holding.setAveragePrice(updatedAveragePrice);
        Holding savedHolding = holdingRepository.save(holding);

        saveTransaction(user, stock, request, TransactionType.BUY);
        return toResponse(user, savedHolding);
    }

    private TradeExecutionResponse executeSell(User user, Stock stock, TradeRequest request, BigDecimal totalAmount) {
        Holding holding = findHolding(user.getId(), stock.getId(), request.getSymbol())
                .orElseThrow(() -> new BusinessValidationException("Insufficient shares"));

        int remainingQuantity = holding.getQuantity() - request.getQuantity();
        if (remainingQuantity < 0) {
            throw new BusinessValidationException("Insufficient shares");
        }

        user.setAvailableCash(user.getAvailableCash().add(totalAmount));
        userRepository.save(user);

        TradeExecutionResponse.HoldingData holdingData;
        if (remainingQuantity == 0) {
            holdingData = new TradeExecutionResponse.HoldingData(
                    holding.getId(),
                    holding.getSymbol(),
                    0,
                    BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP)
            );
            holdingRepository.delete(holding);
        } else {
            holding.setQuantity(remainingQuantity);
            Holding updatedHolding = holdingRepository.save(holding);
            holdingData = toHoldingData(updatedHolding);
        }

        saveTransaction(user, stock, request, TransactionType.SELL);
        return new TradeExecutionResponse(user.getAvailableCash(), holdingData);
    }

    private Optional<Holding> findHolding(Long userId, Long stockId, String symbol) {
        return holdingRepository.findByUserIdAndSymbolIgnoreCase(userId, symbol)
                .or(() -> holdingRepository.findByUserIdAndStockId(userId, stockId));
    }

    private void saveTransaction(User user, Stock stock, TradeRequest request, TransactionType type) {
        transactionRepository.save(Transaction.builder()
                .user(user)
                .stock(stock)
                .type(type)
                .quantity(request.getQuantity())
                .price(request.getPrice())
                .timestamp(LocalDateTime.now())
                .build());
    }

    private TradeExecutionResponse toResponse(User user, Holding holding) {
        return new TradeExecutionResponse(user.getAvailableCash(), toHoldingData(holding));
    }

    private TradeExecutionResponse.HoldingData toHoldingData(Holding holding) {
        return new TradeExecutionResponse.HoldingData(
                holding.getId(),
                holding.getSymbol(),
                holding.getQuantity(),
                holding.getAveragePrice()
        );
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw unauthorized();
        }

        String email = extractEmail(authentication);
        if (email.isBlank()) {
            throw unauthorized();
        }

        return userRepository.findByEmail(email)
                .orElseThrow(this::unauthorized);
    }

    private String extractEmail(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return normalizeEmail(userDetails.getUsername());
        }
        if (principal instanceof String username && !"anonymousUser".equals(username)) {
            return normalizeEmail(username);
        }
        return "";
    }

    private TradeRequest normalizeRequest(TradeRequest request) {
        if (request == null) {
            throw new BusinessValidationException("Request body is required");
        }

        String symbol = normalizeSymbol(request.getSymbol());
        if (symbol.isBlank()) {
            throw new BusinessValidationException("symbol is required");
        }

        Integer quantity = request.getQuantity();
        if (quantity == null || quantity <= 0) {
            throw new BusinessValidationException("quantity must be greater than 0");
        }

        BigDecimal price = request.getPrice();
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("price must be greater than 0");
        }

        String action = normalizeAction(request.getAction());
        if (!"BUY".equals(action) && !"SELL".equals(action)) {
            throw new BusinessValidationException("action must be BUY or SELL");
        }

        return new TradeRequest(
                symbol,
                quantity,
                price.setScale(MONEY_SCALE, RoundingMode.HALF_UP),
                action
        );
    }

    private String normalizeSymbol(String symbol) {
        return symbol == null ? "" : symbol.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeAction(String action) {
        return action == null ? "" : action.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
