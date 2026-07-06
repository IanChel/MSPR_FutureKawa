package com.futurekawa.central.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient restClient(PaysProperties props) {
        // HttpClient moderne du JDK : gère nativement PATCH (contrairement à SimpleClientHttpRequestFactory)
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(props.getClient().getConnectTimeoutMs()))
                .build();

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofMillis(props.getClient().getReadTimeoutMs()));

        return RestClient.builder()
                .requestFactory(factory)
                .build();
    }
}