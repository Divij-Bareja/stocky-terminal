package com.stocky.tradingsimulator.finnhub;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Subset of Finnhub {@code GET /quote} payload.
 * <p>
 * Field {@code c} is the current (latest) trade price.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FinnhubQuoteResponse(
        @JsonProperty("c") Double currentPrice,
        @JsonProperty("pc") Double previousClose,
        @JsonProperty("t") Long timestamp
) {
}
