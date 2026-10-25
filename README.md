# WormWise 🌱
## Development Roadmap & Milestones

> **Project goal:** Build a reliable, secure, and extensible smart-farm monitoring and control platform, starting with the WormWise earthworm greenhouse and leaving room to support other farm types later.

This roadmap is designed to be completed incrementally. Finish and verify each milestone before moving to the next one. Keep the first version simple: **reliable sensor data, safe device control, and measurable value for a real farm** come before AI features.

---

## Product Scope

### Initial MVP
- Monitor greenhouse temperature and humidity.
- Add CO₂ or other sensors only when the hardware is ready.
- View current readings and historical charts.
- Control supported pumps and fans from the web dashboard.
- Run essential safety and automation rules locally on the ESP32.
- Show device connectivity, last-seen time, command status, and errors.
- Support authenticated users and restrict access to their own farms and devices.

### Initial Architecture

```text
Sensors / Actuators
        ↕
ESP32 firmware
  - Local safety rules
  - Sensor sampling
  - MQTT client
        ↕ Wi-Fi / MQTT over TLS
HiveMQ Cloud (MQTT broker)
        ├── Telemetry ──> Telegraf ──> InfluxDB
        └── Commands / ACK / Status
                         ↕
              Secure command service
                         ↕
                 Next.js API
                         ↕
                 Next.js Dashboard

Supabase Auth + PostgreSQL
  - Users and memberships
  - Farms, greenhouses, devices
  - Permissions, configurations, audit logs
```

**Architecture notes**
- Next.js + TypeScript: web UI and server-side API.
- Supabase Auth + PostgreSQL: authentication and relational data.
- InfluxDB: time-series sensor measurements.
- HiveMQ Cloud: MQTT messaging.
- Telegraf: continuous telemetry ingestion into InfluxDB.
- A secure, long-running MQTT command service may be needed if the hosting environment cannot maintain persistent MQTT connections. Do not expose MQTT administrator credentials in browser code.
- Node-RED is not required for the initial design.
- The ESP32 must retain essential local safety behavior when Wi-Fi, the broker, or the cloud application is unavailable.

---

## Getting Started

### Prerequisites
- Node.js LTS (`v20+` or `v24+`)
- Git

### Running Locally
```powershell
# Install dependencies
npm install

# Run the development server
npm run dev

# Run linting
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Milestone 0: Development Environment

**Goal:** Run the starter Next.js application locally.

- [x] Install Node.js LTS.
- [x] Install VS Code.
- [x] Install Git.
- [x] Create the Next.js project with TypeScript, ESLint, Tailwind CSS, and App Router.
- [x] Run `npm install` inside the directory containing `package.json`.
- [x] Run `npm run dev` and verify.
- [x] Initialize Git and link to GitHub repository.

---

## Milestone 1: Project Foundation

**Goal:** Establish a maintainable application structure before adding integrations.

- [x] Review project structure.
- [x] Create shared layout, navigation, and page structure (`src/`).
- [x] Set up environment variable conventions (`.env.example`).
- [x] Add formatting/lint checks (`npm run lint`).
- [x] Verify `.env.local` is ignored by Git.
- [x] Add a README section with setup and run instructions.

**Suggested initial structure**
```text
wormwise/
├── public/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── api/
│   ├── components/
│   ├── lib/
│   └── types/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Milestone 2: Dashboard UI with Mock Data

**Goal:** Build and review the interface before connecting real hardware.

- [x] Create the farm overview page.
- [x] Add cards for temperature, humidity, and other available readings.
- [x] Add sensor status and last-updated timestamps.
- [x] Add historical chart placeholders.
- [x] Add greenhouse/device selector.
- [x] Add pump and fan controls in a disabled or mock-only state.
- [x] Design loading, empty, offline, and error states.
- [x] Make the interface usable on desktop and mobile.

---

## Milestone 3: Data Model and Authentication

**Goal:** Establish user identity and farm ownership.

- [x] Configure Supabase Auth integration.
- [x] Design PostgreSQL tables for tenants, memberships, farms, greenhouses, devices, and device configuration (`supabase/migrations/`).
- [x] Add primary keys, foreign keys, unique constraints, and timestamps.
- [x] Enable and test Row Level Security (RLS) on tables accessible to users.
- [x] Create seed data for development and multi-tenant testing (`supabase/seed.sql`).
- [x] Add sign-in/sign-out and auth pages (`/login`).
- [x] Verify cross-tenant isolation and RLS test suite (`supabase/rls_test.sql`).

---

## Milestone 4: MQTT Broker and Device Identity

**Goal:** Establish secure, traceable device messaging.

- [ ] Create a HiveMQ Cloud deployment.
- [ ] Configure TLS and a dedicated development credential.
- [ ] Define topic naming conventions.
- [ ] Configure topic permissions/ACLs.
- [ ] Test publish/subscribe using an MQTT client before connecting the ESP32.
- [ ] Define telemetry, status, command, and acknowledgement payload schemas.
- [ ] Include a stable device ID, timestamp, and message/command ID where appropriate.
- [ ] Document credential provisioning and rotation.

---

## Milestone 5: ESP32 Telemetry

**Goal:** Send real sensor readings to the broker.

- [ ] Connect the ESP32 to Wi-Fi.
- [ ] Read each installed sensor and validate its values.
- [ ] Publish telemetry at a configurable interval.
- [ ] Add reconnect logic with a backoff strategy.
- [ ] Publish device online/offline status where supported.
- [ ] Include timestamps or clearly document whether timestamps are generated by the device or server.
- [ ] Test sensor disconnects, invalid readings, Wi-Fi loss, and broker loss.
- [ ] Keep local control and safety logic operational when the network is down.

---

## Milestone 6: Time-Series Storage

**Goal:** Store and query sensor history.

- [ ] Create/configure an InfluxDB instance.
- [ ] Create a dedicated development bucket and scoped credentials.
- [ ] Configure Telegraf's MQTT consumer input.
- [ ] Map incoming payload fields and tags consistently.
- [ ] Configure Telegraf's InfluxDB output.
- [ ] Test timestamp, units, tags, and missing-field behavior.
- [ ] Define retention and data-volume expectations.
- [ ] Verify that duplicate or malformed messages are handled appropriately.

---

## Milestone 7: Connect the Dashboard to Real Data

**Goal:** Replace mock readings with real sensor values.

- [ ] Add server-side data access to InfluxDB.
- [ ] Add an API endpoint for latest readings.
- [ ] Add an API endpoint for historical ranges.
- [ ] Validate query parameters and enforce farm/device authorization.
- [ ] Add time range and device filters.
- [ ] Add loading, empty, stale, offline, and error states.
- [ ] Start with polling every 5–10 seconds if sufficient.
- [ ] Add SSE/WebSocket only if measured requirements justify it.

---

## Milestone 8: Secure Web Control

**Goal:** Send commands from the dashboard and verify their outcome.

- [ ] Design a server-side command API.
- [ ] Authenticate the user and verify device ownership/permission.
- [ ] Validate the action and value against an allowlist.
- [ ] Add a command ID, creation time, and expiry.
- [ ] Publish commands through a protected backend MQTT client/service.
- [ ] Have the ESP32 validate command ID, expiry, action, and allowed values.
- [ ] Return an acknowledgement containing the command ID.
- [ ] Track states such as `pending`, `acknowledged`, `succeeded`, `failed`, and `expired`.
- [ ] Show the device's reported state separately from the requested state.
- [ ] Add rate limits and an audit trail.
- [ ] Define safe behavior for loss of connectivity and actuator timeouts.

---

## Milestone 9: Automation and Alerts

**Goal:** Make the system useful without requiring constant manual monitoring.

- [ ] Define threshold rules with the farm owner.
- [ ] Keep safety-critical control rules on the ESP32.
- [ ] Decide which non-critical alerts are handled in the cloud.
- [ ] Add alert deduplication, cooldowns, and recovery notifications.
- [ ] Notify users when a device is offline or a sensor value is outside an allowed range.
- [ ] Log rule evaluations and device actions.
- [ ] Add a way to acknowledge or mute non-critical alerts.

---

## Milestone 10: Reliability, Security, and Deployment

**Goal:** Prepare for a controlled real-world pilot.

- [ ] Deploy the web application.
- [ ] Deploy Telegraf or another continuously running ingestion service.
- [ ] Configure production secrets and least-privilege credentials.
- [ ] Set up backups and test a restore.
- [ ] Add structured logs and basic monitoring.
- [ ] Test power loss, Wi-Fi loss, broker downtime, and database downtime.
- [ ] Test sensor failure, pump/fan failure, duplicate commands, and stale messages.
- [ ] Review authorization, RLS, MQTT ACLs, and API rate limits.
- [ ] Document firmware updates and recovery procedures.
- [ ] Measure uptime, missing data, command success rate, and recovery time.

---

## Milestone 11: Real-Farm Pilot and Business Validation

**Goal:** Prove that WormWise provides measurable value before expanding the business.

- [ ] Interview potential farm users and record their pain points.
- [ ] Define a baseline before deployment.
- [ ] Run a pilot for an agreed period.
- [ ] Measure sensor uptime, missing-data rate, alert usefulness, and control success.
- [ ] Measure the customer's chosen business outcome, such as labor saved, reduced losses, more consistent conditions, or reduced water/power usage.
- [ ] Calculate hardware, installation, connectivity, cloud, maintenance, and support costs.
- [ ] Ask for a paid pilot or paying customer.
- [ ] Document feedback and the decision to continue, change scope, or stop.

---

## Milestone 12: Expansion to Other Farm Types

**Goal:** Reuse the platform without assuming every farm needs the same sensors or rules.

- [ ] Keep sensor types and units configurable.
- [ ] Separate generic device telemetry from farm-specific interpretation.
- [ ] Create configurable device profiles and automation templates.
- [ ] Validate new sensor hardware and calibration requirements per farm type.
- [ ] Add tenant-specific dashboards and thresholds.
- [ ] Pilot one new farm type before making it a standard offering.
- [ ] Review whether the data model and topic structure remain appropriate as the number of devices grows.

---

## Progress Tracker

| Milestone | Status | Notes |
|---|---|---|
| 0. Development environment | 🟢 Complete | Next.js, Node, Git, and repo linked |
| 1. Project foundation | 🟢 Complete | Clean `src/` layout, `.env.example`, lint & build pass |
| 2. Dashboard UI with mock data | 🟢 Complete | Interactive telemetry, chart, safe mock controls, state simulator |
| 3. Data model and authentication | 🟢 Complete | Supabase Auth, PostgreSQL schema, RLS, seed data & tests |
| 4. MQTT broker and device identity | 🟡 Up next | HiveMQ Cloud, TLS, topic structure & ACLs |
| 5. ESP32 telemetry | ⬜ Not started | |
| 6. Time-series storage | ⬜ Not started | |
| 7. Real-data dashboard | ⬜ Not started | |
| 8. Secure web control | ⬜ Not started | |
| 9. Automation and alerts | ⬜ Not started | |
| 10. Reliability and deployment | ⬜ Not started | |
| 11. Real-farm pilot | ⬜ Not started | |
| 12. Expansion to other farm types | ⬜ Not started | |
