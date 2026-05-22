package com.stocky.tradingsimulator.repository;

import com.stocky.tradingsimulator.model.Holding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends JpaRepository<Holding, Long> {

    @EntityGraph(attributePaths = "stock")
    List<Holding> findByUserId(Long userId);

    Optional<Holding> findByUserIdAndSymbolIgnoreCase(Long userId, String symbol);

    Optional<Holding> findByUserIdAndStockId(Long userId, Long stockId);
}
