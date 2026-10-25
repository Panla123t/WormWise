import { InfluxDB } from '@influxdata/influxdb-client';
import { TimeSeriesQueryOptions, DownsampledTelemetryRow, LatestTelemetryRow } from '@/types/influx';
import { generateHistoricalData } from '@/lib/mock-data';

export function isInfluxConfigured(): boolean {
  return Boolean(
    process.env.INFLUXDB_URL &&
    process.env.INFLUXDB_TOKEN &&
    process.env.INFLUXDB_ORG &&
    process.env.INFLUXDB_BUCKET
  );
}

function getInfluxQueryClient() {
  const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
  const token = process.env.INFLUXDB_TOKEN || 'placeholder-token';

  const influxDB = new InfluxDB({ url, token });
  return influxDB.getQueryApi(process.env.INFLUXDB_ORG || 'wormwise');
}

/**
 * Queries time-series telemetry from InfluxDB v2 with strict tenant scoping
 * and downsampled aggregation windows.
 */
export async function queryHistoricalTelemetry(
  options: TimeSeriesQueryOptions
): Promise<{ data: DownsampledTelemetryRow[]; source: 'influxdb' | 'mock' }> {
  if (!isInfluxConfigured()) {
    // Return deterministic mock historical series if InfluxDB is not configured yet
    const count = options.rangeDuration === '-6h' ? 6 : options.rangeDuration === '-12h' ? 12 : 24;
    const mock = generateHistoricalData(count).map((d) => ({
      timestamp: d.timestamp,
      soilMoisture: d.soilMoisture,
      soilTemp: d.soilTemperature,
      airTemp: d.airTemperature,
      airHumidity: d.airHumidity,
      co2Ppm: 580,
    }));
    return { data: mock, source: 'mock' };
  }

  const queryApi = getInfluxQueryClient();
  const bucket = process.env.INFLUXDB_BUCKET || 'wormwise-telemetry';
  const range = options.rangeDuration || '-24h';
  const window = options.aggregateWindow || '15m';

  // Construct Flux query with tenant-level security filter
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${range})
      |> filter(fn: (r) => r["_measurement"] == "vermicompost_telemetry")
      |> filter(fn: (r) => r["tenant_id"] == "${options.tenantId}")
      ${options.deviceId ? `|> filter(fn: (r) => r["device_id"] == "${options.deviceId}")` : ''}
      |> filter(fn: (r) => r["_field"] =~ /^readings_/)
      |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
      |> yield(name: "mean")
  `;

  const rowsByTime: Record<string, Partial<DownsampledTelemetryRow>> = {};

  return new Promise((resolve) => {
    queryApi.queryRows(fluxQuery, {
      next(row, tableMetadata) {
        const o = tableMetadata.toObject(row);
        const timeKey = o._time;
        if (!rowsByTime[timeKey]) {
          rowsByTime[timeKey] = {
            timestamp: new Date(timeKey).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            soilMoisture: 70,
            soilTemp: 21,
            airTemp: 23,
            airHumidity: 65,
          };
        }

        const field = o._field as string;
        const val = Number(o._value);

        if (field === 'readings_soilMoisture') rowsByTime[timeKey].soilMoisture = +val.toFixed(1);
        if (field === 'readings_soilTemp') rowsByTime[timeKey].soilTemp = +val.toFixed(1);
        if (field === 'readings_airTemp') rowsByTime[timeKey].airTemp = +val.toFixed(1);
        if (field === 'readings_airHumidity') rowsByTime[timeKey].airHumidity = +val.toFixed(1);
        if (field === 'readings_co2Ppm') rowsByTime[timeKey].co2Ppm = Math.round(val);
      },
      error(error) {
        console.warn('[InfluxDB] Query failed, falling back to mock series:', error.message);
        const mock = generateHistoricalData(24).map((d) => ({
          timestamp: d.timestamp,
          soilMoisture: d.soilMoisture,
          soilTemp: d.soilTemperature,
          airTemp: d.airTemperature,
          airHumidity: d.airHumidity,
          co2Ppm: 580,
        }));
        resolve({ data: mock, source: 'mock' });
      },
      complete() {
        const sorted = Object.values(rowsByTime) as DownsampledTelemetryRow[];
        if (sorted.length === 0) {
          const mock = generateHistoricalData(24).map((d) => ({
            timestamp: d.timestamp,
            soilMoisture: d.soilMoisture,
            soilTemp: d.soilTemperature,
            airTemp: d.airTemperature,
            airHumidity: d.airHumidity,
            co2Ppm: 580,
          }));
          resolve({ data: mock, source: 'mock' });
        } else {
          resolve({ data: sorted, source: 'influxdb' });
        }
      },
    });
  });
}

/**
 * Queries the most recent telemetry readings from InfluxDB v2.
 * Falls back to deterministic mock values if InfluxDB is offline or empty.
 */
export async function queryLatestTelemetry(options: {
  tenantId: string;
  deviceId?: string;
}): Promise<LatestTelemetryRow> {
  const fallbackMock: LatestTelemetryRow = {
    timestamp: '2026-10-25T15:00:00.000Z',
    soilMoisture: 72.4,
    soilTemp: 21.8,
    airTemp: 23.5,
    airHumidity: 65.2,
    co2Ppm: 580,
    wifiRssi: -64,
    deviceId: options.deviceId || 'esp32-wormwise-gh1-01',
    source: 'mock',
    isStale: false,
  };

  if (!isInfluxConfigured()) {
    return fallbackMock;
  }

  const queryApi = getInfluxQueryClient();
  const bucket = process.env.INFLUXDB_BUCKET || 'wormwise-telemetry';

  // Query the last point within the past 24 hours
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "vermicompost_telemetry")
      |> filter(fn: (r) => r["tenant_id"] == "${options.tenantId}")
      ${options.deviceId ? `|> filter(fn: (r) => r["device_id"] == "${options.deviceId}")` : ''}
      |> last()
  `;

  const reading: Partial<LatestTelemetryRow> = {
    deviceId: options.deviceId || 'esp32-wormwise-gh1-01',
    source: 'influxdb',
  };
  let latestIsoTime = '';

  return new Promise((resolve) => {
    queryApi.queryRows(fluxQuery, {
      next(row, tableMetadata) {
        const o = tableMetadata.toObject(row);
        latestIsoTime = o._time;
        const field = o._field as string;
        const val = Number(o._value);

        if (field === 'readings_soilMoisture') reading.soilMoisture = +val.toFixed(1);
        if (field === 'readings_soilTemp') reading.soilTemp = +val.toFixed(1);
        if (field === 'readings_airTemp') reading.airTemp = +val.toFixed(1);
        if (field === 'readings_airHumidity') reading.airHumidity = +val.toFixed(1);
        if (field === 'readings_co2Ppm') reading.co2Ppm = Math.round(val);
        if (field === 'system_wifiRssi') reading.wifiRssi = Math.round(val);
        if (o.device_id) reading.deviceId = o.device_id;
      },
      error(error) {
        console.warn('[InfluxDB] Latest query failed, falling back to mock:', error.message);
        resolve(fallbackMock);
      },
      complete() {
        if (!latestIsoTime || reading.soilMoisture === undefined) {
          resolve(fallbackMock);
        } else {
          reading.timestamp = latestIsoTime;
          // Check if data is older than 5 minutes
          const diffMs = Date.now() - new Date(latestIsoTime).getTime();
          reading.isStale = diffMs > 5 * 60 * 1000;
          resolve(reading as LatestTelemetryRow);
        }
      },
    });
  });
}

