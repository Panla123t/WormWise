#ifndef WORMWISE_CONFIG_H
#define WORMWISE_CONFIG_H

#include <Arduino.h>

// ============================================================================
// WormWise 🌱 Smart Farm - ESP32 Hardware Configuration
// Milestone 5: ESP32 Telemetry & Autonomous Control Firmware
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Hardware Pin Assignments (ESP32-WROOM-32D)
// ----------------------------------------------------------------------------
// DHT22 (Digital Temp & Humidity)
#define PIN_DHT22               4

// 3x Soil Moisture Sensors (MUST use ADC1 pins because ADC2 conflicts with Wi-Fi)
#define PIN_SOIL_1              32   // ADC1_CH4 (Zone 1 - Shallow / Bed Edge)
#define PIN_SOIL_2              33   // ADC1_CH5 (Zone 2 - Center / Core Feeding)
#define PIN_SOIL_3              34   // ADC1_CH6 (Zone 3 - Deep Castings Layer, Input Only)

// 1x MQ-135 Gas Sensor (Air Quality / CO2 / Ammonia)
#define PIN_MQ135               35   // ADC1_CH7 (Input Only)

// 2x MOSFET Modules (Actuators)
#define PIN_MOSFET_PUMP         25   // Water Misting Pump (12V)
#define PIN_MOSFET_FAN          26   // 120mm Exhaust Ventilation Fan (12V)

// Onboard LED Indicator
#define PIN_STATUS_LED          2

// ----------------------------------------------------------------------------
// 2. Sensor Calibration Values
// ----------------------------------------------------------------------------
// Soil Moisture V1 Calibration (12-bit ADC: 0 - 4095)
// In air (dry): ~3200-3500 | In water (wet): ~1300-1500
#define SOIL_ADC_DRY            3200
#define SOIL_ADC_WET            1400

// ----------------------------------------------------------------------------
// 3. Autonomous Local Safety Limits (Runs on ESP32 even without Wi-Fi)
// ----------------------------------------------------------------------------
#define SAFETY_PUMP_MAX_SECONDS 60     // Absolute cutoff to prevent flooding worm beds
#define SAFETY_MAX_SOIL_MOIST   85.0   // If moisture exceeds 85%, forcefully disallow pump
#define SAFETY_FAN_TEMP_TRIGGER 28.0   // If canopy temp exceeds 28°C, auto-engage fan

// ----------------------------------------------------------------------------
// 4. Timing & Intervals
// ----------------------------------------------------------------------------
#define TELEMETRY_INTERVAL_MS   10000  // Sample and publish telemetry every 10 seconds
#define SENSOR_SAMPLE_RATE_MS   2000   // Read raw sensors every 2 seconds for safety loop
#define WIFI_RECONNECT_BASE_MS  2000   // Exponential backoff base for Wi-Fi reconnect
#define WIFI_RECONNECT_MAX_MS   30000  // Max backoff duration

// ----------------------------------------------------------------------------
// 5. Network & HiveMQ Cloud Credentials
// (Update with your Wi-Fi details and HiveMQ Cloud cluster URL)
// ----------------------------------------------------------------------------
const char* WIFI_SSID           = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD       = "YOUR_WIFI_PASSWORD";

// HiveMQ Cloud TLS Endpoint (Port 8883)
const char* MQTT_BROKER_HOST    = "YOUR_CLUSTER_ID.s1.eu.hivemq.cloud";
const uint16_t MQTT_BROKER_PORT = 8883;

// Dedicated HiveMQ device credential (from Milestone 4)
const char* MQTT_USERNAME       = "wormwise_esp32_dev";
const char* MQTT_PASSWORD       = "YOUR_SECURE_MQTT_PASSWORD";

// Device & Hierarchy Identity
const char* DEVICE_ID           = "esp32-wormwise-gh1-01";
const char* TENANT_ID           = "11111111-1111-1111-1111-111111111111";
const char* FARM_ID             = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const char* GREENHOUSE_ID       = "c1111111-1111-1111-1111-111111111111";

// ----------------------------------------------------------------------------
// 6. MQTT Topics (Pre-formatted according to Milestone 4 topic convention)
// ----------------------------------------------------------------------------
// wormwise/{tenantId}/{farmId}/{greenhouseId}/{deviceId}/{subtopic}
#define TOPIC_TELEMETRY "wormwise/11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/c1111111-1111-1111-1111-111111111111/esp32-wormwise-gh1-01/telemetry"
#define TOPIC_STATUS    "wormwise/11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/c1111111-1111-1111-1111-111111111111/esp32-wormwise-gh1-01/status"
#define TOPIC_CMD       "wormwise/11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/c1111111-1111-1111-1111-111111111111/esp32-wormwise-gh1-01/cmd"
#define TOPIC_ACK       "wormwise/11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/c1111111-1111-1111-1111-111111111111/esp32-wormwise-gh1-01/ack"

#define FIRMWARE_VERSION "v0.3.0-ino"

#endif // WORMWISE_CONFIG_H
