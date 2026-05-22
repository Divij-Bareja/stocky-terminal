package com.stocky.tradingsimulator.simulation;

/**
 * Trading-calendar constants for scaling annualized GBM parameters to a 1-second tick.
 * <p>
 * We assume US equity markets: 252 trading days/year, 6.5 open hours/day.
 * One second of simulated time is therefore a tiny fraction of a trading year.
 */
public final class GbmTimeStep {

    /** Trading days per year (US equities convention). */
    public static final double TRADING_DAYS_PER_YEAR = 252.0;

    /** Regular session length in hours (9:30 AM – 4:00 PM ET). */
    public static final double TRADING_HOURS_PER_DAY = 6.5;

    public static final double SECONDS_PER_HOUR = 3600.0;

    /** Total trading seconds in one calendar year of simulated clock time. */
    public static final double TRADING_SECONDS_PER_YEAR =
            TRADING_DAYS_PER_YEAR * TRADING_HOURS_PER_DAY * SECONDS_PER_HOUR;

    /**
     * Time step {@code dt} for a single 1-second tick, expressed as a fraction of one trading year.
     * <p>
     * Formula: {@code dt = 1.0 / (252 * 6.5 * 3600)}.
     */
    public static final double DT_ONE_SECOND =
            1.0 / TRADING_SECONDS_PER_YEAR;

    private GbmTimeStep() {
    }
}
