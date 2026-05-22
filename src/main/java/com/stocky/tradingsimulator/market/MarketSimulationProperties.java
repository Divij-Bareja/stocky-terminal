package com.stocky.tradingsimulator.market;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "market.simulation")
public class MarketSimulationProperties {

    /** Scheduled tick interval in milliseconds (1 second). */
    private long tickIntervalMs = 1000L;

    /** Annualized drift used when a stock row has no drift configured. */
    private double defaultDrift = 0.08;

    /** Annualized volatility used when a stock row has no volatility configured. */
    private double defaultVolatility = 0.25;

    /**
     * Comma-separated tickers bootstrapped on startup (e.g. {@code AAPL,TSLA,MSFT}).
     * Also read via {@code @Value} in {@link StockMarketBootstrap}.
     */
    private String symbols = "AAPL,TSLA";
}
