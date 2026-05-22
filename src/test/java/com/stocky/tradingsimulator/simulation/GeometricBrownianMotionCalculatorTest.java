package com.stocky.tradingsimulator.simulation;

import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertTrue;

class GeometricBrownianMotionCalculatorTest {

  @Test
  void oneSecondStepsDoNotExplodeOverSimulatedTradingDay() {
    GeometricBrownianMotionCalculator calculator =
        new GeometricBrownianMotionCalculator(new Random(42));

    double price = 150.0;
    double drift = 0.10;
    double volatility = 0.30;

    // One trading day ≈ 6.5 * 3600 one-second ticks
    int oneDayTicks = (int) (GbmTimeStep.TRADING_HOURS_PER_DAY * GbmTimeStep.SECONDS_PER_HOUR);

    for (int i = 0; i < oneDayTicks; i++) {
      price = calculator.nextPrice(price, drift, volatility);
    }

    // With correct dt, price should remain in a realistic band (not trillions).
    assertTrue(price > 50.0 && price < 500.0,
        "Expected stable daily move, got price=" + price);
  }

  @Test
  void dtMatchesOneSecondTradingYearFraction() {
    double expected = 1.0 / (252.0 * 6.5 * 3600.0);
    assertTrue(Math.abs(GbmTimeStep.DT_ONE_SECOND - expected) < 1e-15);
  }
}
