package com.stocky.tradingsimulator.finnhub;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * High-level Finnhub integration with graceful degradation.
 * <p>
 * Used once per symbol at bootstrap (server start / new stock creation), not on every tick.
 */
@Service
public class FinnhubQuoteService {

    private static final Logger log = LoggerFactory.getLogger(FinnhubQuoteService.class);

    private final FinnhubClient finnhubClient;
    private final FinnhubProperties properties;

    public FinnhubQuoteService(FinnhubClient finnhubClient, FinnhubProperties properties) {
        this.finnhubClient = finnhubClient;
        this.properties = properties;
    }

    /**
     * Resolves the initial mark price for a symbol.
     * <ol>
     *   <li>Finnhub live quote (if configured and successful)</li>
     *   <li>{@link FinnhubProperties#getFallbackPrice()} otherwise</li>
     * </ol>
     */
    public double resolveInitialPrice(String symbol) {
        String normalized = symbol == null ? "" : symbol.trim().toUpperCase();

        if (!properties.isConfigured()) {
            log.info(
                    "Finnhub disabled or API key missing — using fallback {} for {}",
                    properties.getFallbackPrice(),
                    normalized
            );
            return properties.getFallbackPrice();
        }

        return finnhubClient.fetchQuotePrice(normalized)
                .map(price -> {
                    log.info("Finnhub initial price for {}: {}", normalized, price);
                    return price;
                })
                .orElseGet(() -> {
                    log.warn(
                            "Finnhub unavailable for {} — using fallback {}",
                            normalized,
                            properties.getFallbackPrice()
                    );
                    return properties.getFallbackPrice();
                });
    }

    /**
     * Throttles consecutive API calls to respect free-tier rate limits on startup.
     */
    public void pauseBetweenRequests() {
        if (properties.getRequestDelayMs() <= 0) {
            return;
        }
        try {
            Thread.sleep(properties.getRequestDelayMs());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Finnhub rate-limit delay interrupted");
        }
    }
}
