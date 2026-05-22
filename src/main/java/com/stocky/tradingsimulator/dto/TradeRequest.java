package com.stocky.tradingsimulator.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TradeRequest {

    private String symbol;
    private Integer quantity;
    private BigDecimal price;
    private String action;
}
