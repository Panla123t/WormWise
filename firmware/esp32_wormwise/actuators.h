#ifndef WORMWISE_ACTUATORS_H
#define WORMWISE_ACTUATORS_H

#include <Arduino.h>
#include "config.h"
#include "sensors.h"

struct ActuatorStateTracker {
  bool isPumpOn;
  bool isFanOn;
  unsigned long pumpStartTime;
  unsigned long fanStartTime;
  unsigned long pumpDurationLimitMs;
  unsigned long fanDurationLimitMs;
  bool pumpBlockedBySafety;
};

ActuatorStateTracker actuators = {false, false, 0, 0, 0, 0, false};

void initActuators() {
  pinMode(PIN_MOSFET_PUMP, OUTPUT);
  pinMode(PIN_MOSFET_FAN, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);

  // Guarantee all actuators start in safe DE-ENERGIZED state
  digitalWrite(PIN_MOSFET_PUMP, LOW);
  digitalWrite(PIN_MOSFET_FAN, LOW);
  digitalWrite(PIN_STATUS_LED, LOW);

  Serial.println("[Actuators] MOSFET outputs configured on GPIO 25 (Pump) and 26 (Fan). All OFF.");
}

// Low-level hardware actuator toggles
void applyPumpHardware(bool state) {
  actuators.isPumpOn = state;
  digitalWrite(PIN_MOSFET_PUMP, state ? HIGH : LOW);
  digitalWrite(PIN_STATUS_LED, state ? HIGH : LOW);
  if (state) {
    actuators.pumpStartTime = millis();
  }
}

void applyFanHardware(bool state) {
  actuators.isFanOn = state;
  digitalWrite(PIN_MOSFET_FAN, state ? HIGH : LOW);
  if (state) {
    actuators.fanStartTime = millis();
  }
}

// Safe pump actuation function with interlocks
bool commandPump(bool turnOn, unsigned long durationSeconds, String& outReason) {
  if (turnOn) {
    // 1. Anti-Drowning Check: Do not permit pump if soil moisture is already high
    if (currentSensors.soilValid && currentSensors.soilMoistureAvg >= SAFETY_MAX_SOIL_MOIST) {
      outReason = "SAFETY_REJECTED: Bed moisture exceeds 85% safety threshold";
      Serial.println("[Actuators] " + outReason);
      return false;
    }

    // 2. Bound duration by hard safety maximum
    unsigned long allowedSeconds = durationSeconds;
    if (allowedSeconds == 0 || allowedSeconds > SAFETY_PUMP_MAX_SECONDS) {
      allowedSeconds = SAFETY_PUMP_MAX_SECONDS;
    }

    actuators.pumpDurationLimitMs = allowedSeconds * 1000UL;
    applyPumpHardware(true);
    outReason = "OK: Pump started for " + String(allowedSeconds) + "s";
    Serial.println("[Actuators] " + outReason);
    return true;
  } else {
    applyPumpHardware(false);
    outReason = "OK: Pump stopped";
    Serial.println("[Actuators] " + outReason);
    return true;
  }
}

// Safe fan actuation function
bool commandFan(bool turnOn, unsigned long durationSeconds, String& outReason) {
  if (turnOn) {
    actuators.fanDurationLimitMs = (durationSeconds > 0) ? (durationSeconds * 1000UL) : 0;
    applyFanHardware(true);
    outReason = "OK: 120mm Ventilation Fan started";
    Serial.println("[Actuators] " + outReason);
    return true;
  } else {
    applyFanHardware(false);
    outReason = "OK: Fan stopped";
    Serial.println("[Actuators] " + outReason);
    return true;
  }
}

// Autonomous Local Safety Control Loop
// THIS FUNCTION RUNS REGARDLESS OF WI-FI OR BROKER CONNECTION
void runLocalSafetyLoop() {
  unsigned long now = millis();

  // 1. Check Pump Runtime Expiration
  if (actuators.isPumpOn) {
    unsigned long elapsed = now - actuators.pumpStartTime;
    // Hard cutoff if timer exceeds duration limit OR absolute safety cutoff
    if ((actuators.pumpDurationLimitMs > 0 && elapsed >= actuators.pumpDurationLimitMs) ||
        (elapsed >= (SAFETY_PUMP_MAX_SECONDS * 1000UL))) {
      applyPumpHardware(false);
      Serial.println("[Safety] PUMP AUTO-STOP: Runtime safety limit reached.");
    }

    // Dynamic Anti-Drowning Override during active run
    if (currentSensors.soilValid && currentSensors.soilMoistureAvg >= SAFETY_MAX_SOIL_MOIST) {
      applyPumpHardware(false);
      Serial.println("[Safety] PUMP EMERGENCY CUTOFF: Bed moisture exceeded 85%!");
    }
  }

  // 2. Check Fan Runtime Expiration (if a timed run was set)
  if (actuators.isFanOn && actuators.fanDurationLimitMs > 0) {
    if (now - actuators.fanStartTime >= actuators.fanDurationLimitMs) {
      // Only stop fan if temperature is below the thermal trigger
      if (!currentSensors.dhtValid || currentSensors.airTemp < SAFETY_FAN_TEMP_TRIGGER) {
        applyFanHardware(false);
        Serial.println("[Safety] FAN AUTO-STOP: Timed ventilation cycle completed.");
      }
    }
  }

  // 3. Autonomous Thermal Relief Fan Trigger
  // Red wigglers suffer heat stress above 28°C and death above 35°C
  if (currentSensors.dhtValid && currentSensors.airTemp >= SAFETY_FAN_TEMP_TRIGGER) {
    if (!actuators.isFanOn) {
      applyFanHardware(true);
      actuators.fanDurationLimitMs = 0; // Run continuously until cooled
      Serial.printf("[Safety] THERMAL RELIEF ACTIVE: Canopy temp %.1fC >= 28.0C. Fan started!\n", currentSensors.airTemp);
    }
  }
}

#endif // WORMWISE_ACTUATORS_H
