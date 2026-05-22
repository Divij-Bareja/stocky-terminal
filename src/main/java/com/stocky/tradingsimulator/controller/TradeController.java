package com.stocky.tradingsimulator.controller;

import com.stocky.tradingsimulator.dto.BuyRequest;
import com.stocky.tradingsimulator.dto.SellRequest;
import com.stocky.tradingsimulator.dto.TradeExecutionResponse;
import com.stocky.tradingsimulator.dto.TradeRequest;
import com.stocky.tradingsimulator.dto.TransactionResponse;
import com.stocky.tradingsimulator.service.TradeService;
import com.stocky.tradingsimulator.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TradeController {

    private final TransactionService transactionService;
    private final TradeService tradeService;

    @PostMapping("/api/trades/execute")
    public ResponseEntity<TradeExecutionResponse> execute(@RequestBody TradeRequest request) {
        return ResponseEntity.ok(tradeService.execute(request));
    }

    @PostMapping("/trade/buy")
    public ResponseEntity<TransactionResponse> buy(@RequestBody BuyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.buy(request));
    }

    @PostMapping("/trade/sell")
    public ResponseEntity<TransactionResponse> sell(@RequestBody SellRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.sell(request));
    }

    @GetMapping("/transactions/{userId}")
    public ResponseEntity<List<TransactionResponse>> getTransactions(@PathVariable Long userId) {
        return ResponseEntity.ok(transactionService.getTransactionsForUser(userId));
    }
}
