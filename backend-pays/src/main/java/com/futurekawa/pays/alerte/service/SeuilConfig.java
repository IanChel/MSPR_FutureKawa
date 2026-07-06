package com.futurekawa.pays.alerte.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.seuils")
public class SeuilConfig {

    private double temperatureIdeale;
    private double humiditeIdeale;
    private double toleranceTemperature;
    private double toleranceHumidite;

    public double tempMin() { return temperatureIdeale - toleranceTemperature; }
    public double tempMax() { return temperatureIdeale + toleranceTemperature; }
    public double humMin()  { return humiditeIdeale - toleranceHumidite; }
    public double humMax()  { return humiditeIdeale + toleranceHumidite; }

    public boolean estDansLaBande(double temperature, double humidite) {
        return temperature >= tempMin() && temperature <= tempMax()
                && humidite >= humMin() && humidite <= humMax();
    }

    // getters / setters (requis par Spring pour injecter la config)
    public void setTemperatureIdeale(double v) { this.temperatureIdeale = v; }
    public void setHumiditeIdeale(double v) { this.humiditeIdeale = v; }
    public void setToleranceTemperature(double v) { this.toleranceTemperature = v; }
    public void setToleranceHumidite(double v) { this.toleranceHumidite = v; }    public double getTemperatureIdeale() { return temperatureIdeale; }
    public double getHumiditeIdeale() { return humiditeIdeale; }
    public double getToleranceTemperature() { return toleranceTemperature; }
    public double getToleranceHumidite() { return toleranceHumidite; }
}