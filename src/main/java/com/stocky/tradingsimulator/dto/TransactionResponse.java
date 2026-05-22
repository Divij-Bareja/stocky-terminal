package com.stocky.tradingsimulator.dto;

import com.stocky.tradingsimulator.model.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class TransactionResponse {

    private Long id;
    private Long userId;
    private Long stockId;
    private String symbol;
    private TransactionType type;
    private Integer quantity;
    private BigDecimal price;
    private LocalDateTime timestamp;
}
