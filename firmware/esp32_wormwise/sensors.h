#ifndef WORMWISE_SENSORS_H
#define WORMWISE_SENSORS_H

#include <Arduino.h>
#include <DHT.h>
#include "config.h"

// Instantiate DHT22 sensor
DHT dht(PIN_DHT22, DHT22);

struct SensorData {
  float airTemp;            // °C
  float airHumidity;        // % RH
  float soilMoisture1;      // % Zone 1
  float soilMoisture2;      // % Zone 2
  float soilMoisture3;      // % Zone 3
  float soilMoistureAvg;    // % Average across bed
  float co2Ppm;             // Estimated PPM
  int   rawMq135;           // Raw ADC
  int   wifiRssi;           // dBm
  bool  dhtValid;
  bool  soilValid;
  bool  mqValid;
};

// Global sensor readings cache
SensorData currentSensors;

void initSensors() {
  dht.begin();
  pinMode(PIN_SOIL_1, INPUT);
  pinMode(PIN_SOIL_2, INPUT);
  pinMode(PIN_SOIL_3, INPUT);
  pinMode(PIN_MQ135, INPUT);

  // Configure 12-bit ADC attenuation (0 - 3.3V range)
  analogSetAttenuation(ADC_11db);
  analogReadResolution(12);

  currentSensors.airTemp = 22.0;
  currentSensors.airHumidity = 70.0;
  currentSensors.soilMoistureAvg = 72.0;
  currentSensors.co2Ppm = 600.0;
  currentSensors.dhtValid = false;
  currentSensors.soilValid = false;
  currentSensors.mqValid = false;

  Serial.println("[Sensors] Peripherals initialized on ADC1 and GPIO 4.");
}

// Multi-sample smoothing filter to eliminate ADC spikes
int readAnalogSmoothed(int pin, int samples = 8) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delayMicroseconds(100);
  }
  return (int)(sum / samples);
}

// Convert raw analog reading to 0-100% soil moisture
float rawToMoisturePercent(int raw) {
  // Check for disconnected probe (floating high or shorted to ground)
  if (raw > 4050 || raw < 50) {
    return -1.0; // Invalid / disconnected
  }

  // Constrain between wet and dry bounds
  int clamped = constrain(raw, SOIL_ADC_WET, SOIL_ADC_DRY);
  // Invert because higher voltage = drier soil on standard capacitive probes
  float percent = (float)(SOIL_ADC_DRY - clamped) / (float)(SOIL_ADC_DRY - SOIL_ADC_WET) * 100.0;
  return constrain(percent, 0.0, 100.0);
}

// Read MQ-135 and estimate CO2 concentration
float readMq135Co2(int rawAdc) {
  if (rawAdc < 50 || rawAdc > 4050) return 400.0; // Default baseline on fault

  // MQ-135 standard power curve approximation for clean/vermicompost canopy
  // Baseline resistance ratio mapped to 400 - 2500 ppm
  float voltage = (rawAdc / 4095.0) * 3.3;
  float ppm = 400.0 + (voltage / 3.3) * 1200.0;
  return constrain(ppm, 350.0, 3000.0);
}

// Main sensor sampling routine
void readAllSensors() {
  // 1. Read DHT22
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h) || t < -20.0 || t > 70.0 || h < 0.0 || h > 100.0) {
    currentSensors.dhtValid = false;
    Serial.println("[Sensors] WARNING: DHT22 read failure or invalid bounds!");
  } else {
    currentSensors.airTemp = t;
    currentSensors.airHumidity = h;
    currentSensors.dhtValid = true;
  }

  // 2. Read 3x Soil Moisture Probes
  int raw1 = readAnalogSmoothed(PIN_SOIL_1);
  int raw2 = readAnalogSmoothed(PIN_SOIL_2);
  int raw3 = readAnalogSmoothed(PIN_SOIL_3);

  currentSensors.soilMoisture1 = rawToMoisturePercent(raw1);
  currentSensors.soilMoisture2 = rawToMoisturePercent(raw2);
  currentSensors.soilMoisture3 = rawToMoisturePercent(raw3);

  // Compute average of valid probes across the worm bed
  float moistSum = 0.0;
  int validCount = 0;

  if (currentSensors.soilMoisture1 >= 0) { moistSum += currentSensors.soilMoisture1; validCount++; }
  if (currentSensors.soilMoisture2 >= 0) { moistSum += currentSensors.soilMoisture2; validCount++; }
  if (currentSensors.soilMoisture3 >= 0) { moistSum += currentSensors.soilMoisture3; validCount++; }

  if (validCount > 0) {
    currentSensors.soilMoistureAvg = moistSum / validCount;
    currentSensors.soilValid = true;
  } else {
    currentSensors.soilValid = false;
    Serial.println("[Sensors] WARNING: All 3 Soil Moisture probes reporting disconnected!");
  }

  // 3. Read MQ-135 Gas Sensor
  currentSensors.rawMq135 = readAnalogSmoothed(PIN_MQ135);
  currentSensors.co2Ppm = readMq135Co2(currentSensors.rawMq135);
  currentSensors.mqValid = (currentSensors.rawMq135 >= 50 && currentSensors.rawMq135 <= 4050);

  // 4. Update Wi-Fi RSSI
  if (WiFi.status() == WL_CONNECTED) {
    currentSensors.wifiRssi = WiFi.RSSI();
  } else {
    currentSensors.wifiRssi = -99;
  }
}

#endif // WORMWISE_SENSORS_H
