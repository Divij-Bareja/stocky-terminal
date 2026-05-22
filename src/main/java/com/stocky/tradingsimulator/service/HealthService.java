package com.stocky.tradingsimulator.service;

import org.springframework.stereotype.Service;

@Service
public class HealthService {

    public String getStatusMessage() {
        return "Trading Simulator Running";
    }
}
