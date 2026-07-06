package com.futurekawa.central.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "app")
public class PaysProperties {

    private List<Pays> pays = new ArrayList<>();
    private Client client = new Client();

    public List<Pays> getPays() { return pays; }
    public void setPays(List<Pays> pays) { this.pays = pays; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }

    public static class Pays {
        private String code;
        private String url;
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
    }

    public static class Client {
        private int connectTimeoutMs = 2000;
        private int readTimeoutMs = 3000;
        public int getConnectTimeoutMs() { return connectTimeoutMs; }
        public void setConnectTimeoutMs(int v) { this.connectTimeoutMs = v; }
        public int getReadTimeoutMs() { return readTimeoutMs; }
        public void setReadTimeoutMs(int v) { this.readTimeoutMs = v; }
    }
}
