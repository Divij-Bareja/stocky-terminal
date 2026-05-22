package com.stocky.tradingsimulator.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persistent row in the simulated market universe.
 * <p>
 * Prices are seeded once from Finnhub (new symbols only), then advanced every second
 * by the GBM engine and written back to this table — the database is the source of truth.
 */
@Entity
@Table(name = "stocks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Ticker symbol, e.g. {@code AAPL}. Unique across the universe. */
    @Column(nullable = false, unique = true, length = 16)
    private String symbol;

    /** Latest simulated mark price (updated every GBM tick). */
    @Column(nullable = false)
    private Double currentPrice;

    /** Annualized drift μ used in the GBM formula. */
    @Column(nullable = false)
    private Double drift;

    /** Annualized volatility σ used in the GBM formula. */
    @Column(nullable = false)
    private Double volatility;
}
