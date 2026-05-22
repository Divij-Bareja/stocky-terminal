package com.stocky.tradingsimulator.repository;

import com.stocky.tradingsimulator.model.Transaction;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    @EntityGraph(attributePaths = "stock")
    List<Transaction> findByUserIdOrderByTimestampDesc(Long userId);
}
