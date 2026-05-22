package com.stocky.tradingsimulator.repository;

import com.stocky.tradingsimulator.model.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {
}
