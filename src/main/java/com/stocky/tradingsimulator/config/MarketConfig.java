package com.stocky.tradingsimulator.config;

import com.stocky.tradingsimulator.finnhub.FinnhubProperties;
import com.stocky.tradingsimulator.market.MarketSimulationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties({FinnhubProperties.class, MarketSimulationProperties.class})
public class MarketConfig {

    @Bean
    RestClient.Builder restClientBuilder(FinnhubProperties finnhubProperties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(finnhubProperties.getTimeoutMs());
        requestFactory.setReadTimeout(finnhubProperties.getTimeoutMs());

        return RestClient.builder().requestFactory(requestFactory);
    }
}
