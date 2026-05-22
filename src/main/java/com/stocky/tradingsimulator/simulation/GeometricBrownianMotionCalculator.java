package com.stocky.tradingsimulator.simulation;

import org.springframework.stereotype.Component;

import java.util.Random;

/**
 * Pure GBM price step calculator with correctly scaled {@code dt}.
 * <p>
 * Annualized {@code drift} and {@code volatility} are converted to a 1-second increment via
 * {@link GbmTimeStep#DT_ONE_SECOND}. Without this scaling, applying annual parameters every
 * second causes exponential blow-up (prices reaching trillions).
 */
@Component
public class GeometricBrownianMotionCalculator {

    /** Floor price — prevents zero/negative prices after extreme random draws. */
    public static final double MIN_PRICE = 0.01;

    private final Random random;

    public GeometricBrownianMotionCalculator() {
        this(new Random());
    }

    GeometricBrownianMotionCalculator(Random random) {
        this.random = random;
    }

    /**
     * Computes the next price using the standard GBM log-normal step:
     * <pre>
     *   nextPrice = currentPrice * exp(
     *       (drift - volatility²/2) * dt
     *       + volatility * sqrt(dt) * Z
     *   )
     * </pre>
     * where {@code Z ~ N(0,1)} and {@code dt} is the 1-second trading-year fraction.
     *
     * @param currentPrice latest mark price (must be &gt; 0)
     * @param drift        annualized expected log-return (e.g. 0.08 = 8%/year)
     * @param volatility   annualized volatility (e.g. 0.25 = 25%/year)
     * @return next simulated price, never below {@link #MIN_PRICE}
     */
    public double nextPrice(double currentPrice, double drift, double volatility) {
        if (currentPrice <= 0) {
            throw new IllegalArgumentException("currentPrice must be positive");
        }

        double dt = GbmTimeStep.DT_ONE_SECOND;
        double z = random.nextGaussian();

        // Itô correction term: (μ - σ²/2) * dt
        double driftTerm = (drift - (volatility * volatility) / 2.0) * dt;
        // Diffusion term: σ * sqrt(dt) * Z
        double diffusionTerm = volatility * Math.sqrt(dt) * z;
        double exponent = driftTerm + diffusionTerm;

        double next = currentPrice * Math.exp(exponent);
        return Math.max(MIN_PRICE, next);
    }
}
