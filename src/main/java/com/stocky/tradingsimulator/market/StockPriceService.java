package com.stocky.tradingsimulator.market;

import com.stocky.tradingsimulator.exception.BusinessValidationException;
import com.stocky.tradingsimulator.model.Stock;
import org.springframework.stereotype.Service;

/**
 * Resolves the tradeable mark price from the persistent {@link Stock} entity (MySQL).
 * <p>
 * Callers should load the stock with a pessimistic lock ({@code findByIdForUpdate})
 * so the price is consistent with the latest committed GBM tick.
 */
@Service
public class StockPriceService {

    public double requireCurrentPrice(Stock stock) {
        if (stock == null) {
            throw new BusinessValidationException("Stock is invalid");
        }

        Double price = stock.getCurrentPrice();
        if (price == null || price <= 0) {
            throw new BusinessValidationException(
                    "Stock " + stock.getSymbol() + " has an invalid current price");
        }
        return price;
    }
}
