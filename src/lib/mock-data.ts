import { Greenhouse, SensorMetric, ActuatorState, HistoricalDataPoint } from '@/types/farm';

export const MOCK_GREENHOUSES: Greenhouse[] = [
  {
    id: 'gh-alpha-01',
    name: 'Greenhouse Alpha (Bed A)',
    location: 'North Vermicomposting Facility',
    zone: 'Zone A - Primary Breeding',
    status: 'online',
    wormSpecies: 'Eisenia fetida (Red Wigglers)',
    bedCount: 4,
    devices: [
      {
        id: 'esp32-wormwise-gh1-01',
        name: 'ESP32 VermiNode Core #1',
        type: 'ESP32-WROOM-32D',
        firmwareVersion: 'v0.2.1-dev-mock',
        ipAddress: '192.168.1.142',
        macAddress: '24:6F:28:B4:72:9A',
        wifiRssi: -64,
        isOnline: true,
        lastSeen: '2026-10-25T10:14:46.000Z',
        mqttTopic: 'wormwise/tenant-1/farm-north/gh-alpha-01/esp32-wormwise-gh1-01',
      },
    ],
  },
  {
    id: 'gh-beta-02',
    name: 'Greenhouse Beta (Bed B)',
    location: 'South Vermicomposting Facility',
    zone: 'Zone B - Castings Nursery',
    status: 'degraded',
    wormSpecies: 'Eudrilus eugeniae (African Nightcrawlers)',
    bedCount: 2,
    devices: [
      {
        id: 'esp32-wormwise-gh2-01',
        name: 'ESP32 VermiNode Core #2',
        type: 'ESP32-WROOM-32D',
        firmwareVersion: 'v0.2.0-dev-mock',
        ipAddress: '192.168.1.143',
        macAddress: '24:6F:28:A1:34:11',
        wifiRssi: -78,
        isOnline: true,
        lastSeen: '2026-10-25T10:14:12.000Z',
        mqttTopic: 'wormwise/tenant-1/farm-south/gh-beta-02/esp32-wormwise-gh2-01',
      },
    ],
  },
];

export const INITIAL_METRICS: SensorMetric[] = [
  {
    id: 'soil_moisture',
    name: 'Soil Bed Moisture',
    value: 72.4,
    unit: '%',
    minOptimal: 65,
    maxOptimal: 80,
    minCritical: 50,
    maxCritical: 90,
    status: 'optimal',
    trend: 'stable',
    change24h: 1.2,
    lastUpdated: '2026-10-25T10:14:45.000Z',
    description: 'Crucial for earthworm respiration through epidermal skin.',
  },
  {
    id: 'soil_temp',
    name: 'Bed Temperature',
    value: 21.8,
    unit: '°C',
    minOptimal: 18,
    maxOptimal: 25,
    minCritical: 10,
    maxCritical: 32,
    status: 'optimal',
    trend: 'rising',
    change24h: 0.6,
    lastUpdated: '2026-10-25T10:14:45.000Z',
    description: 'Internal temperature of the vermicompost bedding layer.',
  },
  {
    id: 'air_temp',
    name: 'Greenhouse Air Temp',
    value: 24.6,
    unit: '°C',
    minOptimal: 18,
    maxOptimal: 28,
    minCritical: 12,
    maxCritical: 35,
    status: 'optimal',
    trend: 'rising',
    change24h: -0.8,
    lastUpdated: '2026-10-25T10:14:45.000Z',
    description: 'Ambient ambient greenhouse canopy temperature.',
  },
  {
    id: 'air_humidity',
    name: 'Greenhouse Air Humidity',
    value: 68.2,
    unit: '%',
    minOptimal: 60,
    maxOptimal: 85,
    minCritical: 45,
    maxCritical: 95,
    status: 'optimal',
    trend: 'falling',
    change24h: -3.4,
    lastUpdated: '2026-10-25T10:14:45.000Z',
    description: 'Surrounding atmospheric relative humidity.',
  },
  {
    id: 'co2_level',
    name: 'CO₂ Concentration',
    value: 580,
    unit: 'ppm',
    minOptimal: 400,
    maxOptimal: 1200,
    minCritical: 300,
    maxCritical: 2500,
    status: 'optimal',
    trend: 'stable',
    change24h: 25,
    lastUpdated: '2026-10-25T10:14:45.000Z',
    description: 'Bio-decomposition gas activity reading.',
  },
];

export const INITIAL_ACTUATORS: ActuatorState[] = [
  {
    id: 'actuator-pump-1',
    name: 'Bed Misting Pump #1',
    type: 'pump',
    isOn: false,
    mode: 'auto',
    status: 'ready',
    lastTriggered: '2026-10-25T09:30:00.000Z',
    runtimeSeconds: 0,
    safetyLimitSeconds: 60,
    description: 'High pressure micro-nozzle misting for maintaining 70% bed moisture.',
  },
  {
    id: 'actuator-fan-1',
    name: 'Exhaust & Circulation Fan A',
    type: 'fan',
    isOn: true,
    mode: 'auto',
    status: 'running',
    lastTriggered: '2026-10-25T08:15:00.000Z',
    runtimeSeconds: 7200,
    safetyLimitSeconds: 14400,
    description: 'Regulates ambient canopy heat and prevents CO2 stagnation.',
  },
  {
    id: 'actuator-pump-2',
    name: 'Nutrient Tea / Drainage Pump',
    type: 'pump',
    isOn: false,
    mode: 'manual',
    status: 'ready',
    lastTriggered: '2026-10-25T07:00:00.000Z',
    runtimeSeconds: 0,
    safetyLimitSeconds: 120,
    description: 'Worm tea collection recirculation and overflow pump.',
  },
  {
    id: 'actuator-fan-2',
    name: 'Intake Cooling Louver Fan',
    type: 'fan',
    isOn: false,
    mode: 'manual',
    status: 'ready',
    lastTriggered: '2026-10-25T04:00:00.000Z',
    runtimeSeconds: 0,
    safetyLimitSeconds: 3600,
    description: 'Fresh air intake intake louvers triggered when canopy exceeds 28°C.',
  },
];

export function generateHistoricalData(points = 24): HistoricalDataPoint[] {
  const result: HistoricalDataPoint[] = [];

  for (let i = points - 1; i >= 0; i--) {
    const hour = (24 - i) % 24;
    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;

    // Deterministic diurnal curve
    const tempWave = Math.sin(((hour - 6) / 24) * 2 * Math.PI);
    const airTemp = +(22 + tempWave * 4.5 + Math.sin(i * 1.7) * 0.4).toFixed(1);
    const soilTemp = +(21.2 + tempWave * 1.8 + Math.cos(i * 1.3) * 0.2).toFixed(1);
    const airHum = +(70 - tempWave * 7.5 + Math.cos(i * 1.1) * 0.8).toFixed(1);
    const soilMoist = +(72.8 - (i * 0.08) + Math.sin(i * 0.9) * 0.3).toFixed(1);

    result.push({
      timestamp: hourLabel,
      airTemperature: airTemp,
      soilTemperature: soilTemp,
      airHumidity: airHum,
      soilMoisture: Math.min(85, Math.max(55, soilMoist)),
    });
  }

  return result;
}
