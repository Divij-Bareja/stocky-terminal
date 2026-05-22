package com.stocky.tradingsimulator.repository;

import com.stocky.tradingsimulator.model.Stock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Persistence access for the {@link Stock} universe.
 */
public interface StockRepository extends JpaRepository<Stock, Long> {

    /** Lookup by ticker — used by bootstrap and manual stock creation. */
    Optional<Stock> findBySymbol(String symbol);

    /** Bulk lookup for the configured symbol list. */
    List<Stock> findBySymbolIn(Collection<String> symbols);

    /**
     * Pessimistic write lock on a single row — serializes with the GBM batch tick
     * and concurrent buy/sell transactions on the same stock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Stock s WHERE s.id = :id")
    Optional<Stock> findByIdForUpdate(@Param("id") Long id);

    /**
     * Loads the full universe under pessimistic write locks for one atomic GBM tick.
     * Trades block until the current tick's {@code saveAll} completes.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Stock s ORDER BY s.id")
    List<Stock> findAllForUpdate();
}
