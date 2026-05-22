package com.stocky.tradingsimulator.finnhub;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.Optional;

/**
 * Low-level HTTP client for Finnhub market data.
 * <p>
 * After the initial quote fetch the simulator runs locally; this client is not
 * called on every GBM tick.
 */
@Component
public class FinnhubClient {

    private static final Logger log = LoggerFactory.getLogger(FinnhubClient.class);

    private final RestClient restClient;
    private final FinnhubProperties properties;

    public FinnhubClient(RestClient.Builder restClientBuilder, FinnhubProperties properties) {
        this.properties = properties;
        this.restClient = restClientBuilder
                .baseUrl(properties.getBaseUrl())
                .build();
    }

    /**
     * Fetches the latest quote for a ticker symbol (e.g. {@code AAPL}).
     *
     * @return current price if the API responds with a positive {@code c} field
     */
    public Optional<Double> fetchQuotePrice(String symbol) {
        if (!properties.isConfigured()) {
            log.warn("Finnhub API key not configured — skipping live quote for {}", symbol);
            return Optional.empty();
        }

        try {
            FinnhubQuoteResponse body = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/quote")
                            .queryParam("symbol", symbol)
                            .queryParam("token", properties.getApiKey())
                            .build())
                    .retrieve()
                    .body(FinnhubQuoteResponse.class);

            if (body == null || body.currentPrice() == null || body.currentPrice() <= 0) {
                log.warn("Finnhub returned no usable current price for {}", symbol);
                return Optional.empty();
            }

            return Optional.of(body.currentPrice());
        } catch (RestClientResponseException ex) {
            log.warn(
                    "Finnhub HTTP {} for symbol {}: {}",
                    ex.getStatusCode().value(),
                    symbol,
                    ex.getMessage()
            );
            return Optional.empty();
        } catch (RestClientException ex) {
            log.warn("Finnhub request failed for {}: {}", symbol, ex.getMessage());
            return Optional.empty();
        }
    }
}
