package com.stocky.tradingsimulator.market;

import com.stocky.tradingsimulator.model.Stock;
import com.stocky.tradingsimulator.repository.StockRepository;
import com.stocky.tradingsimulator.simulation.GeometricBrownianMotionCalculator;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Executes one GBM tick inside a single database transaction.
 * <p>
 * Isolated from the {@code @Scheduled} method so Spring AOP applies {@code @Transactional}
 * correctly (no self-invocation). Loads all stocks with pessimistic locks, advances prices
 * in memory, then batch-writes via {@link StockRepository#saveAll(Iterable)}.
 */
@Service
@RequiredArgsConstructor
public class MarketTickService {

    private static final Logger log = LoggerFactory.getLogger(MarketTickService.class);

    private final StockRepository stockRepository;
    private final GeometricBrownianMotionCalculator gbmCalculator;
    private final MarketSimulationProperties simulationProperties;

    /**
     * One-second GBM step for the entire universe, persisted in a single batch.
     */
    @Transactional
    public void executeTick() {
        List<Stock> stocks = stockRepository.findAllForUpdate();
        if (stocks.isEmpty()) {
            return;
        }

        int advanced = 0;
        for (Stock stock : stocks) {
            Double currentPrice = stock.getCurrentPrice();
            if (currentPrice == null || currentPrice <= 0) {
                log.warn("Skipping GBM tick for {} — invalid currentPrice={}", stock.getSymbol(), currentPrice);
                continue;
            }

            double drift = resolveDrift(stock);
            double volatility = resolveVolatility(stock);
            double nextPrice = gbmCalculator.nextPrice(currentPrice, drift, volatility);
            stock.setCurrentPrice(nextPrice);
            advanced++;
        }

        if (advanced > 0) {
            stockRepository.saveAll(stocks);
        }
    }

    private double resolveDrift(Stock stock) {
        return stock.getDrift() != null
                ? stock.getDrift()
                : simulationProperties.getDefaultDrift();
    }

    private double resolveVolatility(Stock stock) {
        return stock.getVolatility() != null
                ? stock.getVolatility()
                : simulationProperties.getDefaultVolatility();
    }
}
