#ifndef WORMWISE_MQTT_HANDLER_H
#define WORMWISE_MQTT_HANDLER_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "sensors.h"
#include "actuators.h"

WiFiClientSecure espTlsClient;
PubSubClient mqttClient(espTlsClient);

unsigned long lastWifiAttemptMs = 0;
unsigned long wifiBackoffMs = WIFI_RECONNECT_BASE_MS;
unsigned long lastMqttAttemptMs = 0;
unsigned long messageSeqNumber = 0;

// Forward declaration
void onMqttMessage(char* topic, byte* payload, unsigned int length);

void initNetwork() {
  Serial.printf("[Network] Connecting to Wi-Fi SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Configure TLS client for HiveMQ Cloud (Port 8883)
  // setInsecure() allows TLS encryption without hardcoding volatile CA certs on microcontroller
  espTlsClient.setInsecure();

  mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setBufferSize(1024); // Ensure buffer fits JSON payloads
}

// Check Wi-Fi state with non-blocking exponential backoff
void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiBackoffMs = WIFI_RECONNECT_BASE_MS;
    return;
  }

  unsigned long now = millis();
  if (now - lastWifiAttemptMs >= wifiBackoffMs) {
    lastWifiAttemptMs = now;
    Serial.printf("[Network] Wi-Fi lost. Attempting reconnect (Backoff: %lums)...\n", wifiBackoffMs);
    WiFi.disconnect();
    WiFi.reconnect();

    // Exponential backoff doubling up to 30s
    wifiBackoffMs = min(wifiBackoffMs * 2, (unsigned long)WIFI_RECONNECT_MAX_MS);
  }
}

// Publish Device Online Birth Status
void publishBirthStatus() {
  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["status"] = "online";
  doc["reason"] = "boot";
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["macAddress"] = WiFi.macAddress();
  doc["freeHeapBytes"] = ESP.getFreeHeap();
  doc["uptimeSeconds"] = millis() / 1000UL;
  doc["wifiRssi"] = WiFi.RSSI();

  char buffer[384];
  size_t n = serializeJson(doc, buffer);
  // Publish as Retained with QoS 1
  mqttClient.publish(TOPIC_STATUS, buffer, true);
  Serial.println("[MQTT] Published online birth status (Retained).");
}

// Maintain MQTT broker connection
void maintainMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastMqttAttemptMs < 5000) return; // Try every 5s
  lastMqttAttemptMs = now;

  Serial.printf("[MQTT] Connecting to HiveMQ Cloud %s:%d...\n", MQTT_BROKER_HOST, MQTT_BROKER_PORT);

  // Configure Last Will and Testament (LWT) JSON
  const char* lwtPayload = "{\"deviceId\":\"" DEVICE_ID "\",\"status\":\"offline\",\"reason\":\"lwt\"}";

  // Connect using Client ID, Credentials, LWT topic, QoS 1, Retain = true
  String clientId = String(DEVICE_ID) + "-" + String(random(1000, 9999));
  if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD, TOPIC_STATUS, 1, true, lwtPayload)) {
    Serial.println("[MQTT] Connected successfully to HiveMQ broker!");

    // 1. Publish Online Status (Retained)
    publishBirthStatus();

    // 2. Subscribe to incoming actuator commands (QoS 1)
    mqttClient.subscribe(TOPIC_CMD, 1);
    Serial.println("[MQTT] Subscribed to actuator command channel: " TOPIC_CMD);
  } else {
    Serial.printf("[MQTT] Connection failed! rc=%d. Will retry.\n", mqttClient.state());
  }
}

// Publish command execution feedback ACK
void publishCommandAck(const char* commandId, const char* actuator, const char* status, const char* reason, const char* state) {
  StaticJsonDocument<300> doc;
  doc["commandId"] = commandId;
  doc["deviceId"] = DEVICE_ID;
  doc["targetActuator"] = actuator;
  doc["status"] = status;
  doc["reason"] = reason;
  doc["actuatorState"] = state;
  doc["timestamp"] = millis(); // Millis timestamp since boot

  char buffer[300];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_ACK, buffer, false);
  Serial.printf("[MQTT] Published ACK for %s: %s (%s)\n", commandId, status, reason);
}

// MQTT Message Callback (Handles incoming commands from dashboard)
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  Serial.printf("[MQTT] Incoming message on [%s], len: %d\n", topic, length);

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.print("[MQTT] Failed to parse command JSON: ");
    Serial.println(err.c_str());
    return;
  }

  const char* cmdId = doc["commandId"] | "unknown";
  const char* target = doc["targetActuator"] | "";
  const char* action = doc["action"] | "";
  unsigned long duration = doc["durationSeconds"] | 0;

  Serial.printf("[MQTT Command] ID: %s | Target: %s | Action: %s | Dur: %lus\n", cmdId, target, action, duration);

  String resultReason;
  bool success = false;
  const char* finalState = "stopped";

  if (strcmp(target, "misting_pump") == 0) {
    if (strcmp(action, "turn_on") == 0 || strcmp(action, "pulse") == 0) {
      success = commandPump(true, duration, resultReason);
      finalState = actuators.isPumpOn ? "running" : "stopped";
    } else {
      success = commandPump(false, 0, resultReason);
      finalState = "stopped";
    }
  } else if (strcmp(target, "exhaust_fan") == 0) {
    if (strcmp(action, "turn_on") == 0) {
      success = commandFan(true, duration, resultReason);
      finalState = actuators.isFanOn ? "running" : "stopped";
    } else {
      success = commandFan(false, 0, resultReason);
      finalState = "stopped";
    }
  } else {
    resultReason = "INVALID_TARGET_ACTUATOR";
    success = false;
  }

  // Publish immediate acknowledgement
  publishCommandAck(
    cmdId,
    target,
    success ? "acknowledged" : "rejected",
    resultReason.c_str(),
    finalState
  );
}

// Publish Periodic Telemetry (Matches Milestone 4 schema)
void publishTelemetry() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<512> doc;
  messageSeqNumber++;

  doc["deviceId"] = DEVICE_ID;
  doc["messageId"] = "msg-" + String(messageSeqNumber);

  JsonObject readings = doc.createNestedObject("readings");
  readings["soilMoisture"] = serialized(String(currentSensors.soilMoistureAvg, 1));
  readings["soilMoistureZ1"] = serialized(String(currentSensors.soilMoisture1, 1));
  readings["soilMoistureZ2"] = serialized(String(currentSensors.soilMoisture2, 1));
  readings["soilMoistureZ3"] = serialized(String(currentSensors.soilMoisture3, 1));
  readings["airTemp"] = serialized(String(currentSensors.airTemp, 1));
  readings["airHumidity"] = serialized(String(currentSensors.airHumidity, 1));
  readings["co2Ppm"] = (int)currentSensors.co2Ppm;

  JsonObject health = doc.createNestedObject("health");
  health["dhtOk"] = currentSensors.dhtValid;
  health["soilOk"] = currentSensors.soilValid;
  health["pumpActive"] = actuators.isPumpOn;
  health["fanActive"] = actuators.isFanOn;

  doc["wifiRssi"] = currentSensors.wifiRssi;
  doc["freeHeapBytes"] = ESP.getFreeHeap();
  doc["uptimeSeconds"] = millis() / 1000UL;

  char buffer[512];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_TELEMETRY, buffer, false);
  Serial.printf("[MQTT Telemetry] Published #%lu: Moisture=%.1f%%, Temp=%.1fC, CO2=%d ppm\n",
    messageSeqNumber, currentSensors.soilMoistureAvg, currentSensors.airTemp, (int)currentSensors.co2Ppm);
}

#endif // WORMWISE_MQTT_HANDLER_H
