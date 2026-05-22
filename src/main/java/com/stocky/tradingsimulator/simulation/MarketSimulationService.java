package com.stocky.tradingsimulator.simulation;

import com.stocky.tradingsimulator.market.MarketReadyGate;
import com.stocky.tradingsimulator.market.MarketTickService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Scheduler facade for the local GBM engine.
 * <p>
 * Delegates each tick to {@link MarketTickService}, which reads prices from MySQL,
 * applies time-scaled Geometric Brownian Motion, and batch-writes results back.
 * The in-memory cache has been removed — <strong>MySQL is the source of truth</strong>.
 */
@Service
@RequiredArgsConstructor
public class MarketSimulationService {

    private final MarketTickService marketTickService;
    private final MarketReadyGate marketReadyGate;

    /**
     * Fires every {@code market.simulation.tick-interval-ms} (default 1000 ms).
     * No-ops until {@link com.stocky.tradingsimulator.market.StockMarketBootstrap} finishes.
     */
    @Scheduled(fixedRateString = "${market.simulation.tick-interval-ms:1000}")
    public void simulateMarketStep() {
        if (!marketReadyGate.isReady()) {
            return;
        }
        marketTickService.executeTick();
    }
}
