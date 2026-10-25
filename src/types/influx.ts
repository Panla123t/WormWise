/**
 * WormWise 🌱 Smart Farm - InfluxDB Time-Series Types
 * Milestone 6: Time-Series Storage
 */

export interface TimeSeriesQueryOptions {
  tenantId: string;
  farmId?: string;
  greenhouseId?: string;
  deviceId?: string;
  rangeDuration?: string; // e.g. "-1h", "-6h", "-24h", "-7d"
  aggregateWindow?: string; // e.g. "1m", "5m", "15m", "1h"
}

export interface InfluxDataPoint {
  time: string;
  measurement: string;
  field: string;
  value: number;
  tenant_id: string;
  farm_id: string;
  greenhouse_id: string;
  device_id: string;
}

export interface DownsampledTelemetryRow {
  timestamp: string;
  soilMoisture: number;
  soilTemp: number;
  airTemp: number;
  airHumidity: number;
  co2Ppm?: number;
  wifiRssi?: number;
}

export interface LatestTelemetryRow {
  timestamp: string;
  soilMoisture: number;
  soilTemp: number;
  airTemp: number;
  airHumidity: number;
  co2Ppm?: number;
  wifiRssi?: number;
  deviceId: string;
  source: 'influxdb' | 'mock';
  isStale?: boolean;
}
