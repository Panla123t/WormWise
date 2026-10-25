export type HealthStatus = 'optimal' | 'warning' | 'critical' | 'stale' | 'offline';

export type ActuatorType = 'pump' | 'fan' | 'valve' | 'mister';

export interface SensorMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  minOptimal: number;
  maxOptimal: number;
  minCritical: number;
  maxCritical: number;
  status: HealthStatus;
  trend: 'rising' | 'falling' | 'stable';
  change24h: number;
  lastUpdated: string;
  description: string;
}

export interface ActuatorState {
  id: string;
  name: string;
  type: ActuatorType;
  isOn: boolean;
  mode: 'manual' | 'auto';
  status: 'ready' | 'running' | 'disabled_mock' | 'fault';
  lastTriggered?: string;
  runtimeSeconds?: number;
  safetyLimitSeconds: number;
  description: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: string;
  firmwareVersion: string;
  ipAddress: string;
  macAddress: string;
  wifiRssi: number; // dBm
  isOnline: boolean;
  lastSeen: string;
  mqttTopic: string;
}

export interface Greenhouse {
  id: string;
  name: string;
  location: string;
  zone: string;
  status: 'online' | 'degraded' | 'offline';
  wormSpecies: string;
  bedCount: number;
  devices: DeviceInfo[];
}

export interface HistoricalDataPoint {
  timestamp: string;
  soilTemperature: number;
  airTemperature: number;
  soilMoisture: number;
  airHumidity: number;
}
