package com.stocky.tradingsimulator.service;

import com.stocky.tradingsimulator.model.Holding;
import com.stocky.tradingsimulator.repository.HoldingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HoldingService {

    private final HoldingRepository holdingRepository;

    public List<Holding> getHoldingsByUserId(Long userId) {
        return holdingRepository.findByUserId(userId);
    }
}
