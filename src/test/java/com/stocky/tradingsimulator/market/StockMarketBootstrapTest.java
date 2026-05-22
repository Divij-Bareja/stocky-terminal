package com.stocky.tradingsimulator.market;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StockMarketBootstrapTest {

  @Test
  void parseSymbols_splitsTrimsAndDedupes() {
    assertEquals(
        java.util.List.of("AAPL", "TSLA", "MSFT"),
        StockMarketBootstrap.parseSymbols(" AAPL, TSLA ,MSFT, AAPL "));
  }

  @Test
  void parseSymbols_returnsEmptyForBlank() {
    assertTrue(StockMarketBootstrap.parseSymbols("  ").isEmpty());
    assertTrue(StockMarketBootstrap.parseSymbols(null).isEmpty());
  }
}
