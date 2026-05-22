package com.stocky.tradingsimulator.finnhub;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Externalized Finnhub client settings (see {@code application.properties}).
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "finnhub")
public class FinnhubProperties {

    /**
     * Master switch. When {@code false}, all lookups use {@link #fallbackPrice}.
     */
    private boolean enabled = true;

    /**
     * REST base URL (Finnhub v1).
     */
    private String baseUrl = "https://finnhub.io/api/v1";

    /**
     * API token — set via environment variable or properties file.
     */
    private String apiKey;

    /**
     * Price used when Finnhub is disabled, misconfigured, rate-limited, or returns invalid data.
     */
    private double fallbackPrice = 100.0;

    /**
     * Pause between consecutive symbol requests on startup (free tier ≈ 60 calls/min).
     */
    private long requestDelayMs = 1100L;

    /**
     * HTTP connect/read timeout in milliseconds.
     */
    private int timeoutMs = 5000;

    public boolean isConfigured() {
        return enabled
                && apiKey != null
                && !apiKey.isBlank();
    }
}
