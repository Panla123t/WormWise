# WormWise 🌱 InfluxDB & Telegraf Ingestion Architecture
## Milestone 6: Time-Series Storage & Telemetry Pipeline

This guide documents the time-series ingestion architecture for storing high-frequency sensor telemetry from ESP32 nodes into InfluxDB v2 via Telegraf.

---

## 1. Architecture Flow

```text
ESP32 Node (GPIO 4, 32-35)
     │  (Wi-Fi / TLS Port 8883)
     ▼
HiveMQ Cloud MQTT Broker
     │  Topic: wormwise/{tenant_id}/{farm_id}/{greenhouse_id}/{device_id}/telemetry
     ▼
Telegraf Ingestion Service
  ├── Input: [[inputs.mqtt_consumer]] (Subscribes to all device telemetry)
  ├── Processor: Topic parsing -> Extracts indexed tags (tenant, farm, greenhouse, device)
  └── Output: [[outputs.influxdb_v2]] (Writes points in batches to InfluxDB v2)
     ▼
InfluxDB v2 Database
  └── Bucket: `wormwise-telemetry` (Retention: 30 days)
     ▼
Next.js Web Application
  └── Queries downsampled historical averages via Flux API for dashboard charts
```

---

## 2. InfluxDB Schema: Tags vs. Fields

To ensure maximum query performance and prevent high-cardinality index degradation:

### 🏷️ Indexed Tags (Bounded Identifiers)
Tags are indexed by InfluxDB for instant multi-tenant filtering:
- `tenant_id`: Organization UUID (e.g. `11111111-1111-1111-1111-111111111111`)
- `farm_id`: Farm facility UUID (e.g. `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`)
- `greenhouse_id`: Vermicomposting unit UUID (e.g. `c1111111-1111-1111-1111-111111111111`)
- `device_id`: Microcontroller hardware ID (e.g. `esp32-wormwise-gh1-01`)

### 📊 Measurements & Fields (Unindexed Values)
Numeric sensor values and high-cardinality strings are stored as fields:
- `readings_soilMoisture`: Float (Bed moisture percentage: 0–100%)
- `readings_soilTemp`: Float (Internal vermicompost bed temperature in °C)
- `readings_airTemp`: Float (Ambient greenhouse canopy temperature in °C)
- `readings_airHumidity`: Float (Ambient air humidity in %)
- `readings_co2Ppm`: Integer (MQ-135 estimated CO₂/Ammonia PPM)
- `wifiRssi`: Integer (Signal strength in dBm)
- `freeHeapBytes`: Integer (Microcontroller memory diagnostics)
- `uptimeSeconds`: Integer (Device uptime)
- `messageId`: String (Stored as field, NOT as a tag, to prevent cardinality explosion!)

---

## 3. Running with Docker Compose (Local Development)

The repository provides [`docker-compose.telemetry.yml`](file:///c:/Users/Devil/OneDrive/Desktop/WormWise/wormwise/docker-compose.telemetry.yml) which spins up InfluxDB v2 and Telegraf locally:

```bash
docker compose -f docker-compose.telemetry.yml up -d
```

- **InfluxDB Web Console:** [http://localhost:8086](http://localhost:8086)
- **Default Org:** `wormwise`
- **Default Bucket:** `wormwise-telemetry` (30 days retention)
- **Admin Token:** `wormwise-dev-token-9999-secure-local`

---

## 4. Using InfluxDB Cloud

If using InfluxDB Cloud Serverless:
1. Create a free account at [https://cloud2.influxdata.com/](https://cloud2.influxdata.com/).
2. Create bucket named `wormwise-telemetry`.
3. Generate an API Token with Read/Write access on `wormwise-telemetry`.
4. Put credentials in `.env.local`:
   ```env
   INFLUXDB_URL=https://eu-central-1-1.aws.cloud2.influxdata.com
   INFLUXDB_TOKEN=your_generated_api_token
   INFLUXDB_ORG=your_email_or_org
   INFLUXDB_BUCKET=wormwise-telemetry
   ```

---

## 5. Next.js Downsampled Flux Queries

The Next.js client ([`src/lib/influxdb/client.ts`](file:///c:/Users/Devil/OneDrive/Desktop/WormWise/wormwise/src/lib/influxdb/client.ts)) provides server-side functions to query historical windows with downsampling:

```flux
from(bucket: "wormwise-telemetry")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "vermicompost_telemetry")
  |> filter(fn: (r) => r["tenant_id"] == "11111111-1111-1111-1111-111111111111")
  |> filter(fn: (r) => r["device_id"] == "esp32-wormwise-gh1-01")
  |> filter(fn: (r) => r["_field"] =~ /^readings_/)
  |> aggregateWindow(every: 15m, fn: mean, createEmpty: false)
  |> yield(name: "mean")
```
This downsamples thousands of raw 10-second data points into smooth 15-minute averages for responsive chart rendering in the dashboard.
