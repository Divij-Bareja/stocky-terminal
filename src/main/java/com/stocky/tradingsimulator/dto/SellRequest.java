package com.stocky.tradingsimulator.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SellRequest {

    private Long userId;
    private Long stockId;
    private Integer quantity;
}
