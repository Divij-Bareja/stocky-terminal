package com.stocky.tradingsimulator.market;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Prevents the GBM scheduler from ticking before Finnhub bootstrap completes.
 */
@Component
public class MarketReadyGate {

    private final AtomicBoolean ready = new AtomicBoolean(false);

    public boolean isReady() {
        return ready.get();
    }

    public void markReady() {
        ready.set(true);
    }
}
