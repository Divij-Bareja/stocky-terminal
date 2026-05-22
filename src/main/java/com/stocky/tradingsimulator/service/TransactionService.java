package com.stocky.tradingsimulator.service;

import com.stocky.tradingsimulator.dto.BuyRequest;
import com.stocky.tradingsimulator.dto.SellRequest;
import com.stocky.tradingsimulator.dto.TransactionResponse;
import com.stocky.tradingsimulator.exception.BusinessValidationException;
import com.stocky.tradingsimulator.exception.ResourceNotFoundException;
import com.stocky.tradingsimulator.model.Holding;
import com.stocky.tradingsimulator.model.Stock;
import com.stocky.tradingsimulator.model.Transaction;
import com.stocky.tradingsimulator.model.TransactionType;
import com.stocky.tradingsimulator.model.User;
import com.stocky.tradingsimulator.market.StockPriceService;
import com.stocky.tradingsimulator.repository.HoldingRepository;
import com.stocky.tradingsimulator.repository.StockRepository;
import com.stocky.tradingsimulator.repository.TransactionRepository;
import com.stocky.tradingsimulator.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private static final int MONEY_SCALE = 4;

    private final UserRepository userRepository;
    private final StockRepository stockRepository;
    private final HoldingRepository holdingRepository;
    private final TransactionRepository transactionRepository;
    private final StockPriceService stockPriceService;

    @Transactional
    public TransactionResponse buy(BuyRequest request) {
        validateTradeRequest(request.getUserId(), request.getStockId(), request.getQuantity());

        User user = getUserOrThrow(request.getUserId());
        Stock stock = getStockForTradeOrThrow(request.getStockId());
        BigDecimal tradePrice = toTradePrice(stock);
        BigDecimal totalCost = tradePrice.multiply(BigDecimal.valueOf(request.getQuantity()));

        if (user.getAvailableCash().compareTo(totalCost) < 0) {
            throw new BusinessValidationException("Insufficient available cash for this purchase");
        }

        user.setAvailableCash(user.getAvailableCash().subtract(totalCost));
        userRepository.save(user);

        Holding holding = findHolding(user.getId(), stock.getId(), stock.getSymbol())
                .orElseGet(() -> Holding.builder()
                        .user(user)
                        .stock(stock)
                        .symbol(stock.getSymbol())
                        .quantity(0)
                        .averagePrice(BigDecimal.ZERO)
                        .build());

        int currentQuantity = holding.getQuantity();
        int purchasedQuantity = request.getQuantity();
        int newTotalQuantity = currentQuantity + purchasedQuantity;

        BigDecimal currentCostBasis = holding.getAveragePrice().multiply(BigDecimal.valueOf(currentQuantity));
        BigDecimal purchaseCostBasis = tradePrice.multiply(BigDecimal.valueOf(purchasedQuantity));
        BigDecimal newAverageBuyPrice = currentCostBasis.add(purchaseCostBasis)
                .divide(BigDecimal.valueOf(newTotalQuantity), MONEY_SCALE, RoundingMode.HALF_UP);

        holding.setQuantity(newTotalQuantity);
        holding.setAveragePrice(newAverageBuyPrice);
        holding.setSymbol(stock.getSymbol());
        holding.setStock(stock);
        holdingRepository.save(holding);

        Transaction transaction = transactionRepository.save(Transaction.builder()
                .user(user)
                .stock(stock)
                .type(TransactionType.BUY)
                .quantity(purchasedQuantity)
                .price(tradePrice)
                .timestamp(LocalDateTime.now())
                .build());

        return toResponse(transaction);
    }

    @Transactional
    public TransactionResponse sell(SellRequest request) {
        validateTradeRequest(request.getUserId(), request.getStockId(), request.getQuantity());

        User user = getUserOrThrow(request.getUserId());
        Stock stock = getStockForTradeOrThrow(request.getStockId());
        BigDecimal tradePrice = toTradePrice(stock);

        Holding holding = findHolding(user.getId(), stock.getId(), stock.getSymbol())
                .orElseThrow(() -> new BusinessValidationException("Holding not found for this user and stock"));

        int currentQuantity = holding.getQuantity();
        int sellingQuantity = request.getQuantity();
        if (currentQuantity < sellingQuantity) {
            throw new BusinessValidationException("Insufficient holding quantity for this sale");
        }

        BigDecimal saleProceeds = tradePrice.multiply(BigDecimal.valueOf(sellingQuantity));
        user.setAvailableCash(user.getAvailableCash().add(saleProceeds));
        userRepository.save(user);

        int remainingQuantity = currentQuantity - sellingQuantity;
        if (remainingQuantity == 0) {
            holdingRepository.delete(holding);
        } else {
            holding.setQuantity(remainingQuantity);
            holdingRepository.save(holding);
        }

        Transaction transaction = transactionRepository.save(Transaction.builder()
                .user(user)
                .stock(stock)
                .type(TransactionType.SELL)
                .quantity(sellingQuantity)
                .price(tradePrice)
                .timestamp(LocalDateTime.now())
                .build());

        return toResponse(transaction);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsForUser(Long userId) {
        getUserOrThrow(userId);
        return transactionRepository.findByUserIdOrderByTimestampDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private User getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }

    /**
     * Pessimistic row lock — serializes with the GBM tick persister on the same stock row.
     */
    private Stock getStockForTradeOrThrow(Long stockId) {
        return stockRepository.findByIdForUpdate(stockId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found with id: " + stockId));
    }

    /**
     * Uses the in-memory mark from {@link StockPriceService} (GBM engine) for trade execution.
     */
    private BigDecimal toTradePrice(Stock stock) {
        return BigDecimal.valueOf(stockPriceService.requireCurrentPrice(stock))
                .setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private void validateTradeRequest(Long userId, Long stockId, Integer quantity) {
        if (userId == null) {
            throw new BusinessValidationException("userId is required");
        }
        if (stockId == null) {
            throw new BusinessValidationException("stockId is required");
        }
        if (quantity == null || quantity <= 0) {
            throw new BusinessValidationException("quantity must be greater than 0");
        }
    }

    private Optional<Holding> findHolding(Long userId, Long stockId, String symbol) {
        String normalizedSymbol = symbol == null ? "" : symbol.trim().toUpperCase(Locale.ROOT);
        return holdingRepository.findByUserIdAndSymbolIgnoreCase(userId, normalizedSymbol)
                .or(() -> holdingRepository.findByUserIdAndStockId(userId, stockId));
    }

    private TransactionResponse toResponse(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getUser().getId(),
                transaction.getStock().getId(),
                transaction.getStock().getSymbol(),
                transaction.getType(),
                transaction.getQuantity(),
                transaction.getPrice(),
                transaction.getTimestamp()
        );
    }
}
