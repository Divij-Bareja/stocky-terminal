package com.stocky.tradingsimulator.service;

import com.stocky.tradingsimulator.finnhub.FinnhubQuoteService;
import com.stocky.tradingsimulator.market.MarketSimulationProperties;
import com.stocky.tradingsimulator.model.Stock;
import com.stocky.tradingsimulator.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * API-facing stock operations. All prices live in MySQL.
 */
@Service
@RequiredArgsConstructor
public class StockService {

    private final StockRepository stockRepository;
    private final FinnhubQuoteService finnhubQuoteService;
    private final MarketSimulationProperties simulationProperties;

    @Transactional(readOnly = true)
    public List<Stock> getAllStocks() {
        return stockRepository.findAll();
    }

    /**
     * Creates or updates a stock row. Finnhub is called only when no valid price is supplied
     * and the symbol is not already persisted (same database-first policy as bootstrap).
     */
    @Transactional
    public Stock saveStock(Stock stock) {
        String symbol = stock.getSymbol() == null ? null : stock.getSymbol().trim().toUpperCase();
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol is required");
        }
        stock.setSymbol(symbol);

        Stock toSave = stockRepository.findBySymbol(symbol)
                .map(existing -> mergeIntoExisting(existing, stock))
                .orElseGet(() -> buildNewStock(stock, symbol));

        return stockRepository.save(toSave);
    }

    private Stock mergeIntoExisting(Stock existing, Stock incoming) {
        if (incoming.getDrift() != null) {
            existing.setDrift(incoming.getDrift());
        }
        if (incoming.getVolatility() != null) {
            existing.setVolatility(incoming.getVolatility());
        }
        if (incoming.getCurrentPrice() != null && incoming.getCurrentPrice() > 0) {
            existing.setCurrentPrice(incoming.getCurrentPrice());
        }
        return existing;
    }

    private Stock buildNewStock(Stock incoming, String symbol) {
        double price = (incoming.getCurrentPrice() != null && incoming.getCurrentPrice() > 0)
                ? incoming.getCurrentPrice()
                : finnhubQuoteService.resolveInitialPrice(symbol);

        return Stock.builder()
                .symbol(symbol)
                .currentPrice(price)
                .drift(incoming.getDrift() != null ? incoming.getDrift() : simulationProperties.getDefaultDrift())
                .volatility(incoming.getVolatility() != null
                        ? incoming.getVolatility()
                        : simulationProperties.getDefaultVolatility())
                .build();
    }
}
