# WormWise 🌱 ESP32 Firmware Guide
## Milestone 5: ESP32 Telemetry & Local Safety Logic

This folder contains the complete, production-ready Arduino IDE firmware for the **WormWise Smart Earthworm Greenhouse Node**.

---

## 1. Hardware Pinout & Wiring Map

| Sensor / Actuator | ESP32 Pin | Channel / Note |
|---|---|---|
| **DHT22 Data** | `GPIO 4` | Digital I/O (Include 4.7kΩ pull-up to 3.3V) |
| **Soil Moisture #1** (Zone 1) | `GPIO 32` | **ADC1_CH4** (Analog 0–3.3V) |
| **Soil Moisture #2** (Zone 2) | `GPIO 33` | **ADC1_CH5** (Analog 0–3.3V) |
| **Soil Moisture #3** (Zone 3) | `GPIO 34` | **ADC1_CH6** (Input Only, Analog) |
| **MQ-135 Gas Sensor** (AOUT) | `GPIO 35` | **ADC1_CH7** (Input Only, Analog) |
| **Water Pump MOSFET** (Gate) | `GPIO 25` | Digital Out (12V Misting Pump) |
| **120mm Fan MOSFET** (Gate) | `GPIO 26` | Digital Out (12V Ventilation Fan) |
| **Status LED** | `GPIO 2` | Onboard Blue LED (Lights during pumping) |

> ⚠️ **CRITICAL ESP32 HARDWARE NOTE:** All analog sensors (Soil moisture & MQ-135) **MUST be connected to ADC1** (GPIO 32–39). On the ESP32, ADC2 (GPIO 0, 2, 4, 12–15, 25–27) cannot be used for analog reads while Wi-Fi is active. The pinout above is 100% ADC1 compliant.

---

## 2. Required Arduino IDE Libraries

In the Arduino IDE, open **Tools** → **Manage Libraries...** (`Ctrl + Shift + I`), then install:

1. **`PubSubClient`** by Nick O'Leary (Version 2.8+)
2. **`DHT sensor library`** by Adafruit (Version 1.4+)
3. **`Adafruit Unified Sensor`** by Adafruit (Dependency for DHT)
4. **`ArduinoJson`** by Benoit Blanchon (Version 6.x or 7.x)

---

## 3. Configuration & Upload Steps

1. Open [`esp32_wormwise.ino`](file:///c:/Users/Devil/OneDrive/Desktop/WormWise/wormwise/firmware/esp32_wormwise/esp32_wormwise.ino) in Arduino IDE.
2. Open [`config.h`](file:///c:/Users/Devil/OneDrive/Desktop/WormWise/wormwise/firmware/esp32_wormwise/config.h) and set:
   - `WIFI_SSID` & `WIFI_PASSWORD`
   - `MQTT_BROKER_HOST` (e.g. `your-cluster-id.s1.eu.hivemq.cloud`)
   - `MQTT_USERNAME` & `MQTT_PASSWORD`
3. In **Tools** menu:
   - **Board:** `ESP32 Dev Module` (or your ESP32 board model)
   - **Upload Speed:** `921600` (or `115200` if cable is long)
   - **CPU Frequency:** `240MHz`
   - **Port:** Select your ESP32 COM port
4. Click **Upload** (`Ctrl + U`).
5. Open the **Serial Monitor** (`Ctrl + Shift + M`) at **`115200 baud`**.

---

## 4. Key Firmware Features

### 🛡️ Autonomous Local Safety Control (Offline Guarantee)
Per project requirements, earthworms cannot be dependent on cloud uptime. Even if Wi-Fi or HiveMQ drops:
- **Anti-Drowning Hard Cutoff:** If bed moisture reaches `85%`, or if the misting pump runs for more than `60 seconds`, the pump is forcefully cut off immediately.
- **Thermal Canopy Relief:** If air temperature exceeds `28.0°C`, the 120mm exhaust fan automatically turns on to protect the worm population from lethal heat stress.

### 📶 Resilient Connectivity
- **Non-blocking Exponential Backoff:** Reconnection does not pause the sensor reading or actuator control loops.
- **Secure TLS over Port 8883:** Connects securely to HiveMQ Cloud.
- **Retained Last Will and Testament (LWT):** When the ESP32 disconnects abruptly, HiveMQ publishes an `offline` payload automatically.
