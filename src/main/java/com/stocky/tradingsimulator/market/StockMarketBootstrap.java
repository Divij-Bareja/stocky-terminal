package com.stocky.tradingsimulator.market;

import com.stocky.tradingsimulator.finnhub.FinnhubQuoteService;
import com.stocky.tradingsimulator.model.Stock;
import com.stocky.tradingsimulator.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Builds the persistent market universe on startup — <strong>database first, Finnhub second</strong>.
 * <ol>
 *   <li>Read {@code market.simulation.symbols} from configuration.</li>
 *   <li>For each symbol already in MySQL: load price and GBM parameters as-is (no API call).</li>
 *   <li>For each new symbol: fetch one Finnhub quote, apply default drift/volatility, {@code save()}.</li>
 * </ol>
 * After this completes, {@link com.stocky.tradingsimulator.simulation.MarketSimulationService}
 * advances prices locally and persists every tick back to MySQL.
 */
@Component
@RequiredArgsConstructor
public class StockMarketBootstrap {

    private static final Logger log = LoggerFactory.getLogger(StockMarketBootstrap.class);

    private final StockRepository stockRepository;
    private final FinnhubQuoteService finnhubQuoteService;
    private final MarketSimulationProperties simulationProperties;
    private final MarketReadyGate marketReadyGate;

    @Value("${market.simulation.symbols}")
    private String configuredSymbols;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initializePersistentUniverse() {
        List<String> symbols = parseSymbols(configuredSymbols);
        if (symbols.isEmpty()) {
            log.warn("market.simulation.symbols is empty — universe bootstrap skipped");
            marketReadyGate.markReady();
            return;
        }

        log.info("Initializing persistent universe for {} symbol(s)", symbols.size());

        // When two consecutive symbols both need Finnhub, pause between API calls.
        boolean delayBeforeNextFinnhubCall = false;

        for (String symbol : symbols) {
            Optional<Stock> existing = stockRepository.findBySymbol(symbol);

            if (existing.isPresent()) {
                Stock stock = existing.get();
                if (backfillMissingGbmParameters(stock)) {
                    stockRepository.save(stock);
                }
                log.info(
                        "Loaded {} from database (id={}, price={}, drift={}, volatility={})",
                        symbol,
                        stock.getId(),
                        stock.getCurrentPrice(),
                        stock.getDrift(),
                        stock.getVolatility()
                );
                delayBeforeNextFinnhubCall = false;
            } else {
                if (delayBeforeNextFinnhubCall) {
                    finnhubQuoteService.pauseBetweenRequests();
                }
                createStockFromFinnhub(symbol);
                delayBeforeNextFinnhubCall = true;
            }
        }

        marketReadyGate.markReady();
        log.info("Persistent universe ready — GBM simulation will write ticks to MySQL");
    }

    /**
     * New symbol path: Finnhub seeds the first price; defaults fill GBM parameters.
     */
    private void createStockFromFinnhub(String symbol) {
        double initialPrice = finnhubQuoteService.resolveInitialPrice(symbol);

        Stock stock = Stock.builder()
                .symbol(symbol)
                .currentPrice(initialPrice)
                .drift(simulationProperties.getDefaultDrift())
                .volatility(simulationProperties.getDefaultVolatility())
                .build();

        Stock saved = stockRepository.save(stock);
        log.info(
                "Created {} in database (id={}) with Finnhub seed price {}",
                symbol,
                saved.getId(),
                initialPrice
        );
    }

    /** Ensures legacy rows remain simulatable after schema tightening. */
    private boolean backfillMissingGbmParameters(Stock stock) {
        boolean changed = false;
        if (stock.getDrift() == null) {
            stock.setDrift(simulationProperties.getDefaultDrift());
            changed = true;
        }
        if (stock.getVolatility() == null) {
            stock.setVolatility(simulationProperties.getDefaultVolatility());
            changed = true;
        }
        return changed;
    }

    static List<String> parseSymbols(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toUpperCase)
                .distinct()
                .toList();
    }
}
