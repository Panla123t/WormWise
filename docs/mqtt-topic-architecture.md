# WormWise 🌱 MQTT Architecture & Topic Specification
## Milestone 4: MQTT Broker, Topic Hierarchy & Device Identity

This document defines the production MQTT design for WormWise, covering topic hierarchies, QoS guidelines, Last Will & Testament (LWT) configuration, security permissions, and HiveMQ Cloud setup.

---

## 1. Topic Hierarchy Convention

All messages follow a strict 6-segment hierarchical schema:

```text
wormwise/{tenantId}/{farmId}/{greenhouseId}/{deviceId}/{subtopic}
```

| Segment | Purpose | Example |
|---|---|---|
| `wormwise` | Top-level system namespace | `wormwise` |
| `{tenantId}` | Multi-tenant organization UUID | `11111111-1111-1111-1111-111111111111` |
| `{farmId}` | Facility or physical farm UUID | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` |
| `{greenhouseId}` | Vermicomposting greenhouse/zone UUID | `c1111111-1111-1111-1111-111111111111` |
| `{deviceId}` | Microcontroller Hardware ID | `esp32-wormwise-gh1-01` |
| `{subtopic}` | Channel role (`telemetry`, `status`, `cmd`, `ack`) | `telemetry` |

---

## 2. Topic Definitions & Payload Types

### 2.1 Telemetry (`/telemetry`)
- **Direction:** ESP32 → Broker → Ingestion Service (Telegraf) → InfluxDB
- **QoS:** `0` (or `1` for low-frequency critical beds)
- **Retained:** `false`
- **Cadence:** Configurable (Default: Every 10 seconds)
- **Payload Schema:**
```json
{
  "deviceId": "esp32-wormwise-gh1-01",
  "timestamp": "2026-10-25T11:40:00Z",
  "messageId": "msg-000412",
  "readings": {
    "soilMoisture": 72.4,
    "soilTemp": 21.8,
    "airTemp": 24.6,
    "airHumidity": 68.2,
    "co2Ppm": 580
  },
  "batteryVoltage": 4.12,
  "wifiRssi": -64
}
```

---

### 2.2 Device Status & Last Will (`/status`)
- **Direction:** ESP32 → Broker → Web Dashboard / Monitoring
- **QoS:** `1`
- **Retained:** `true` (Allows new dashboard sessions to instantly read current node health)
- **Last Will and Testament (LWT):** Configured at connection time by the ESP32:
  - If the connection drops without a clean disconnect packet, HiveMQ publishes:
```json
{
  "deviceId": "esp32-wormwise-gh1-01",
  "timestamp": "2026-10-25T11:42:15Z",
  "status": "offline",
  "reason": "lwt"
}
```
- **Birth / Heartbeat Payload:**
```json
{
  "deviceId": "esp32-wormwise-gh1-01",
  "timestamp": "2026-10-25T11:40:00Z",
  "status": "online",
  "reason": "boot",
  "firmwareVersion": "v0.2.1-dev",
  "ipAddress": "192.168.1.142",
  "macAddress": "24:6F:28:B4:72:9A",
  "freeHeapBytes": 182400,
  "uptimeSeconds": 3600,
  "reconnectCount": 0
}
```

---

### 2.3 Actuator Commands (`/cmd`)
- **Direction:** Backend Command Service → Broker → ESP32
- **QoS:** `1`
- **Retained:** `false` (Never retain actuator commands to prevent execution after power cycle)
- **Payload Schema:**
```json
{
  "commandId": "7d928490-410c-4e89-a5e2-89b91e921d74",
  "deviceId": "esp32-wormwise-gh1-01",
  "targetActuator": "misting_pump",
  "action": "turn_on",
  "durationSeconds": 30,
  "createdAt": "2026-10-25T11:40:00Z",
  "expiresAt": "2026-10-25T11:41:00Z"
}
```

---

### 2.4 Command Acknowledgement (`/ack`)
- **Direction:** ESP32 → Broker → Backend Command Service
- **QoS:** `1`
- **Retained:** `false`
- **Payload Schema:**
```json
{
  "commandId": "7d928490-410c-4e89-a5e2-89b91e921d74",
  "deviceId": "esp32-wormwise-gh1-01",
  "targetActuator": "misting_pump",
  "status": "acknowledged",
  "reason": "OK",
  "actuatorState": "running",
  "timestamp": "2026-10-25T11:40:01Z"
}
```

---

## 3. Access Control List (ACL) & Role Matrix

To guarantee multi-tenant security and ensure devices cannot snoop on other hardware:

| Role / Identity | Publish Permissions | Subscribe Permissions |
|---|---|---|
| **ESP32 Node** (`esp32-gh1-01`) | `wormwise/{tid}/{fid}/{gid}/esp32-wormwise-gh1-01/telemetry`<br>`wormwise/{tid}/{fid}/{gid}/esp32-wormwise-gh1-01/status`<br>`wormwise/{tid}/{fid}/{gid}/esp32-wormwise-gh1-01/ack` | `wormwise/{tid}/{fid}/{gid}/esp32-wormwise-gh1-01/cmd` |
| **Telegraf Ingestion Service** | *None* | `wormwise/+/+/+/+/telemetry` |
| **Command Backend Dispatcher** | `wormwise/+/+/+/+/cmd` | `wormwise/+/+/+/+/ack`<br>`wormwise/+/+/+/+/status` |

---

## 4. HiveMQ Cloud Provisioning Guide

1. Sign up at [https://www.hivemq.com/cloud/](https://www.hivemq.com/cloud/) (Free tier includes 100 devices and TLS).
2. Create a cluster (e.g. `wormwise-cluster`).
3. Note your Cluster URL: e.g. `xxxxxxxx.s1.eu.hivemq.cloud`, Port: `8883` (TLS enabled).
4. In **Access Management**:
   - Create user `wormwise_esp32_dev` with password.
   - Create user `wormwise_backend_dev` with password.
5. In your local `.env.local`, set:
   ```env
   MQTT_BROKER_URL=tls://xxxxxxxx.s1.eu.hivemq.cloud
   MQTT_PORT=8883
   MQTT_USERNAME=wormwise_backend_dev
   MQTT_PASSWORD=your_secure_password
   MQTT_CLIENT_ID=wormwise-backend-local
   ```
