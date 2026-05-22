package com.stocky.tradingsimulator.repository;

import com.stocky.tradingsimulator.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Modifying
    @Query("update User u set u.availableCash = :balance")
    int resetAllBalances(@Param("balance") BigDecimal balance);
}
