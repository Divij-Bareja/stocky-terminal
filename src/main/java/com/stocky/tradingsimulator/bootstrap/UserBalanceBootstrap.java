package com.stocky.tradingsimulator.bootstrap;

import com.stocky.tradingsimulator.model.AppSetting;
import com.stocky.tradingsimulator.model.UserDefaults;
import com.stocky.tradingsimulator.repository.AppSettingRepository;
import com.stocky.tradingsimulator.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class UserBalanceBootstrap {

    private static final Logger log = LoggerFactory.getLogger(UserBalanceBootstrap.class);
    private static final String BALANCE_RESET_FLAG = "balances_reset_v1";

    private final UserRepository userRepository;
    private final AppSettingRepository appSettingRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void resetBalances() {
        if (appSettingRepository.existsById(BALANCE_RESET_FLAG)) {
            log.info("User balance reset already applied — skipping");
            return;
        }
        int updated = userRepository.resetAllBalances(UserDefaults.DEFAULT_AVAILABLE_CASH);
        appSettingRepository.save(AppSetting.builder()
                .key(BALANCE_RESET_FLAG)
                .value(UserDefaults.DEFAULT_AVAILABLE_CASH.toPlainString())
                .build());
        log.info("Reset {} user balance(s) to {} (one-time)", updated, UserDefaults.DEFAULT_AVAILABLE_CASH);
    }
}
