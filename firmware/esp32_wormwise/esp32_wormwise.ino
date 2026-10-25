/**
 * ============================================================================
 * WormWise 🌱 Smart Farm - ESP32 Perception & Actuator Firmware
 * Milestone 5: ESP32 Telemetry & Local Safety Logic
 * ============================================================================
 *
 * Microcontroller: ESP32-WROOM-32D / DevKit V1
 * Peripherals:
 *   - 1x DHT22 Temperature & Humidity (GPIO 4)
 *   - 3x Capacitive Soil Moisture Sensors V1 (GPIO 32, 33, 34 on ADC1)
 *   - 1x MQ-135 Air Quality / Gas Sensor (GPIO 35 on ADC1)
 *   - 2x MOSFET Modules:
 *       - Misting Pump 12V (GPIO 25)
 *       - 120mm Exhaust Fan 12V (GPIO 26)
 *
 * Cloud Integration:
 *   - Broker: HiveMQ Cloud (TLS Port 8883)
 *   - Retained LWT (Last Will & Testament)
 *   - Autonomous local safety interlocks (active even without internet)
 *
 * Required Arduino Libraries:
 *   - "PubSubClient" by Nick O'Leary
 *   - "DHT sensor library" by Adafruit
 *   - "Adafruit Unified Sensor" by Adafruit
 *   - "ArduinoJson" by Benoit Blanchon (v6 or v7)
 * ============================================================================
 */

#include <Arduino.h>
#include "config.h"
#include "sensors.h"
#include "actuators.h"
#include "mqtt_handler.h"

unsigned long lastSensorSampleTime = 0;
unsigned long lastTelemetryPublishTime = 0;

void printBanner() {
  Serial.println("\n=======================================================");
  Serial.println("  🌱 WormWise Smart Farm - ESP32 Perception Node       ");
  Serial.println("  Firmware: " FIRMWARE_VERSION);
  Serial.printf ("  Device ID: %s\n", DEVICE_ID);
  Serial.printf ("  Hardware:  ESP32-WROOM-32D | Dual Core LX6 @ 240MHz\n");
  Serial.println("=======================================================\n");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  printBanner();

  // 1. Initialize local hardware drivers
  initSensors();
  initActuators();

  // 2. Perform initial local sensor sample
  Serial.println("[Boot] Performing baseline sensor sample...");
  readAllSensors();

  // 3. Connect to Wi-Fi and configure HiveMQ Cloud TLS
  initNetwork();

  Serial.println("[Boot] Setup complete. Entering autonomous loop.\n");
}

void loop() {
  unsigned long now = millis();

  // 1. Network & Broker Maintenance (Non-blocking)
  maintainWiFi();
  maintainMqtt();

  if (mqttClient.connected()) {
    mqttClient.loop();
  }

  // 2. Periodic Sensor Sampling (Every 2 seconds)
  if (now - lastSensorSampleTime >= SENSOR_SAMPLE_RATE_MS) {
    lastSensorSampleTime = now;
    readAllSensors();
  }

  // 3. CRITICAL: Autonomous Local Safety Loop
  // Evaluates every loop cycle. Runs anti-drowning and thermal relief rules
  // even if network, broker, or cloud is completely disconnected!
  runLocalSafetyLoop();

  // 4. Periodic MQTT Telemetry Publish (Every 10 seconds)
  if (now - lastTelemetryPublishTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryPublishTime = now;
    if (mqttClient.connected()) {
      publishTelemetry();
    } else {
      Serial.println("[Loop] Telemetry held: Waiting for MQTT connection...");
    }
  }

  // 5. Yield to FreeRTOS background tasks (Wi-Fi stack & Watchdog)
  delay(10);
}
