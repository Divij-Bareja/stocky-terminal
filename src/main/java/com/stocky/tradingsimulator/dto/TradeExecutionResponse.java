package com.stocky.tradingsimulator.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class TradeExecutionResponse {

    private BigDecimal availableCash;
    private HoldingData holding;

    @Getter
    @AllArgsConstructor
    public static class HoldingData {
        private Long id;
        private String symbol;
        private Integer quantity;
        private BigDecimal averagePrice;
    }
}
