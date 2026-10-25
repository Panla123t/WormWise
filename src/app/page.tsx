'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MOCK_GREENHOUSES,
  INITIAL_METRICS,
  INITIAL_ACTUATORS,
  generateHistoricalData,
} from '@/lib/mock-data';
import { Greenhouse, SensorMetric, ActuatorState, HistoricalDataPoint } from '@/types/farm';
import { LatestTelemetryRow } from '@/types/influx';
import { Header } from '@/components/Header';
import { SensorCard } from '@/components/SensorCard';
import { TelemetryChart } from '@/components/TelemetryChart';
import { ActuatorControlCard } from '@/components/ActuatorControlCard';
import { DeviceStatusCard } from '@/components/DeviceStatusCard';
import { SimulationBar, SimulationScenario } from '@/components/SimulationBar';
import {
  Sprout,
  ShieldCheck,
  Layers,
  ThermometerSnowflake,
  AlertTriangle,
  Info,
  CheckCircle,
  Activity,
  Radio,
} from 'lucide-react';

export default function DashboardPage() {
  const [selectedGreenhouse, setSelectedGreenhouse] = useState<Greenhouse>(MOCK_GREENHOUSES[0]);
  const [dataSource, setDataSource] = useState<'live' | 'simulation'>('live');
  const [telemetrySource, setTelemetrySource] = useState<'influxdb' | 'mock'>('mock');
  const [scenario, setScenario] = useState<SimulationScenario>('normal');
  const [actuators, setActuators] = useState<ActuatorState[]>(INITIAL_ACTUATORS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartRange, setChartRange] = useState<'24h' | '12h' | '6h'>('24h');

  // Live telemetry state
  const [liveLatest, setLiveLatest] = useState<LatestTelemetryRow | null>(null);
  const [liveHistory, setLiveHistory] = useState<HistoricalDataPoint[]>(() => generateHistoricalData(24));
  const [lastPollTime, setLastPollTime] = useState<string>('Initializing...');

  // Fallback simulation historical data
  const simulationHistory = useMemo(() => generateHistoricalData(24), []);

  const deviceId = selectedGreenhouse.devices[0]?.id || 'esp32-wormwise-gh1-01';
  const tenantId = '11111111-1111-1111-1111-111111111111';

  // Fetch telemetry from server-side InfluxDB / mock endpoints
  const fetchTelemetry = useCallback(async () => {
    try {
      // 1. Fetch latest sensor sample
      const resLatest = await fetch(`/api/telemetry/latest?tenantId=${tenantId}&deviceId=${deviceId}`);
      if (resLatest.ok) {
        const jsonLatest = await resLatest.json();
        if (jsonLatest.success && jsonLatest.data) {
          setLiveLatest(jsonLatest.data);
          setTelemetrySource(jsonLatest.source || 'mock');
          setLastPollTime(new Date().toLocaleTimeString());
        }
      }

      // 2. Fetch historical downsampled time-series
      const resHistory = await fetch(`/api/telemetry/history?range=${chartRange}&tenantId=${tenantId}&deviceId=${deviceId}`);
      if (resHistory.ok) {
        const jsonHistory = await resHistory.json();
        if (jsonHistory.success && Array.isArray(jsonHistory.data)) {
          const points: HistoricalDataPoint[] = jsonHistory.data.map((d: any) => ({
            timestamp: d.timestamp,
            soilMoisture: d.soilMoisture,
            soilTemperature: d.soilTemp ?? d.soilTemperature ?? 21.5,
            airTemperature: d.airTemp ?? d.airTemperature ?? 23.5,
            airHumidity: d.airHumidity,
          }));
          setLiveHistory(points);
        }
      }
    } catch (err) {
      console.warn('[Dashboard] Telemetry polling error:', err);
    }
  }, [deviceId, tenantId, chartRange]);

  // Periodic polling when in live mode (every 7 seconds)
  useEffect(() => {
    if (dataSource === 'live') {
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 7000);
      return () => clearInterval(interval);
    }
  }, [dataSource, fetchTelemetry]);

  // Manual refresh action
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTelemetry();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Switch to simulation if user clicks a scenario
  const handleSelectScenario = (scen: SimulationScenario) => {
    setScenario(scen);
    if (scen !== 'normal') {
      setDataSource('simulation');
    }
  };

  // Compute metrics based on live readings or simulation overrides
  const metrics = useMemo<SensorMetric[]>(() => {
    if (dataSource === 'simulation') {
      return INITIAL_METRICS.map((metric) => {
        if (scenario === 'low_moisture' && metric.id === 'soil_moisture') {
          return {
            ...metric,
            value: 54.2,
            status: 'warning',
            trend: 'falling',
            description: 'CRITICAL: Bed moisture below 60%. Worm skin respiration impaired.',
          };
        }
        if (scenario === 'high_temp') {
          if (metric.id === 'soil_temp') {
            return {
              ...metric,
              value: 29.8,
              status: 'critical',
              trend: 'rising',
              description: 'DANGER: Bed temperature approaching lethal worm limit (>30°C).',
            };
          }
          if (metric.id === 'air_temp') {
            return {
              ...metric,
              value: 33.4,
              status: 'warning',
              trend: 'rising',
            };
          }
        }
        return metric;
      });
    }

    // Live mode metrics derived from API / InfluxDB
    const latest = liveLatest;
    return INITIAL_METRICS.map((m) => {
      if (!latest) return m;

      if (m.id === 'soil_moisture') {
        const val = latest.soilMoisture;
        const status = val < 50 || val > 85 ? 'critical' : val < 65 || val > 80 ? 'warning' : 'optimal';
        return {
          ...m,
          value: val,
          status,
          lastUpdated: latest.timestamp,
          description: status === 'optimal'
            ? 'Moisture within optimal 65-80% humus band for respiration.'
            : 'Bed moisture outside recommended range.',
        };
      }

      if (m.id === 'soil_temp') {
        const val = latest.soilTemp;
        const status = val > 30 ? 'critical' : val > 25 || val < 15 ? 'warning' : 'optimal';
        return {
          ...m,
          value: val,
          status,
          lastUpdated: latest.timestamp,
          description: status === 'optimal'
            ? 'Optimal 18-25°C worm metabolism zone.'
            : 'Bed temperature requires operator attention.',
        };
      }

      if (m.id === 'air_temp') {
        const val = latest.airTemp;
        return {
          ...m,
          value: val,
          status: val > 32 ? 'warning' : 'optimal',
          lastUpdated: latest.timestamp,
        };
      }

      if (m.id === 'air_humidity') {
        const val = latest.airHumidity;
        return {
          ...m,
          value: val,
          status: val < 50 ? 'warning' : 'optimal',
          lastUpdated: latest.timestamp,
        };
      }

      if (m.id === 'co2_level') {
        const val = latest.co2Ppm ?? 580;
        return {
          ...m,
          value: val,
          status: val > 1200 ? 'warning' : 'optimal',
          lastUpdated: latest.timestamp,
        };
      }

      return m;
    });
  }, [dataSource, scenario, liveLatest]);

  const isStale = dataSource === 'simulation' ? scenario === 'stale' : Boolean(liveLatest?.isStale);
  const isOffline = dataSource === 'simulation' ? scenario === 'offline' : false;

  const handleToggleActuator = (id: string) => {
    setActuators((prev) =>
      prev.map((act) => (act.id === id ? { ...act, isOn: !act.isOn } : act))
    );
  };

  const currentDevice = useMemo(() => {
    const base = selectedGreenhouse.devices[0];
    if (dataSource === 'live' && liveLatest) {
      return {
        ...base,
        wifiRssi: liveLatest.wifiRssi ?? base.wifiRssi,
        lastSeen: liveLatest.timestamp,
      };
    }
    return base;
  }, [selectedGreenhouse, dataSource, liveLatest]);

  const displayedHistory = dataSource === 'live' ? liveHistory : simulationHistory;

  return (
    <div className="min-h-screen bg-[#090d0b] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        greenhouses={MOCK_GREENHOUSES}
        selectedGreenhouse={selectedGreenhouse}
        onSelectGreenhouse={setSelectedGreenhouse}
        simulationMode={scenario === 'offline' ? 'offline' : 'normal'}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        dataSource={dataSource}
        telemetrySource={telemetrySource}
        onToggleDataSource={setDataSource}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Interactive Scenario Bar */}
        <div className="mb-4">
          <SimulationBar currentScenario={scenario} onSelectScenario={handleSelectScenario} />
        </div>

        {/* Live Stream / InfluxDB Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dataSource === 'live' ? 'bg-emerald-400' : 'bg-indigo-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dataSource === 'live' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
            </span>
            <span className="font-semibold text-white">
              {dataSource === 'live' ? 'Milestone 7 Live InfluxDB Consumer' : 'Simulation Engine Sandbox'}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">
              Source: <strong className={telemetrySource === 'influxdb' ? 'text-emerald-400' : 'text-amber-400'}>{telemetrySource.toUpperCase()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-zinc-400">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Poll: 7s (Last: {lastPollTime})
            </span>
            <button
              onClick={() => setDataSource((prev) => (prev === 'live' ? 'simulation' : 'live'))}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4"
            >
              Switch to {dataSource === 'live' ? 'Simulation Sandbox' : 'Live Polling'}
            </button>
          </div>
        </div>

        {/* Greenhouse Context Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900/40 border border-emerald-900/30 p-5 mb-6 shadow-md backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center shrink-0 text-emerald-300">
                <Sprout className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {selectedGreenhouse.name}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    {selectedGreenhouse.wormSpecies}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {selectedGreenhouse.location} • {selectedGreenhouse.zone} • {selectedGreenhouse.bedCount} Vermicomposting Bins
                </p>
              </div>
            </div>

            {/* Quick Farm Status summary badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Perception Layer</p>
                  <p className="font-semibold text-white">4 Probes Active</p>
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-2">
                <ThermometerSnowflake className="w-4 h-4 text-teal-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Climate Profile</p>
                  <p className="font-semibold text-white">Moist Humus (21°C / 72%)</p>
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">ESP32 Failsafe</p>
                  <p className="font-semibold text-white">Autonomous Loop</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Offline / Stale Notice if applicable */}
        {isOffline && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 flex items-center gap-3 text-sm animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold">Node Connection Lost (ESP32 Offline Simulation)</p>
              <p className="text-xs text-rose-300 mt-0.5">
                The web dashboard has stopped receiving telemetry. Local hardware safety routines on the ESP32 maintain basic pump limits until connectivity is restored.
              </p>
            </div>
          </div>
        )}

        {isStale && (
          <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 flex items-center gap-3 text-sm animate-fade-in">
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold">Stale Telemetry Warning</p>
              <p className="text-xs text-amber-300 mt-0.5">
                Sensor readings have not refreshed in over 5 minutes. Values are grayed out to prevent operators from acting on outdated environmental conditions.
              </p>
            </div>
          </div>
        )}

        {/* Sensor Metrics Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Primary Vermiculture Telemetry</span>
            </h3>
            <span className="text-xs text-zinc-400 font-mono">
              Target: InfluxDB bucket `wormwise-telemetry`
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {metrics.map((metric) => (
              <SensorCard
                key={metric.id}
                metric={metric}
                isStale={isStale}
                isOffline={isOffline}
              />
            ))}
          </div>
        </div>

        {/* 2-Column Content: Charts & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main 2-column wide area: Historical Telemetry Chart + Actuator Controls */}
          <div className="lg:col-span-2 space-y-6">
            <TelemetryChart
              data={displayedHistory}
              isOffline={isOffline}
              timeRange={chartRange}
              onTimeRangeChange={setChartRange}
              dataSource={telemetrySource}
            />
            <ActuatorControlCard
              actuators={actuators}
              onToggleActuator={handleToggleActuator}
              isOffline={isOffline}
            />
          </div>

          {/* Right Column: ESP32 Diagnostics & Local Safety Rules */}
          <div className="space-y-6">
            <DeviceStatusCard device={currentDevice} isOffline={isOffline} />

            {/* Local Safety Logic Explainer */}
            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-5 shadow-lg shadow-black/20">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-semibold text-white">ESP32 Local Safety Rules</h4>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Per the architecture design, the ESP32 must enforce essential safety behavior even when cloud or network connectivity drops.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-zinc-200">MOSFET 1 (GPIO 25) • Water Pump:</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Regulates soil moisture, air humidity, and provides evaporative air cooling. Forcefully de-energizes if runtime exceeds 60s or if bed moisture reaches 85%.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-zinc-200">MOSFET 2 (GPIO 26) • 120mm Fan:</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Controls canopy heat and air circulation. Automatically engages when canopy temperature exceeds 28°C to vent hot stagnant air and replenish CO₂.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-zinc-200">Autonomous Failsafe:</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      If MQTT disconnects for &gt; 120s, the ESP32 local safety loop continues running autonomously without cloud dependency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 bg-zinc-950/80 py-4 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 WormWise Platform. Smart Earthworm Farm Perception & Control.</p>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">Milestone 7: Real Telemetry Integration</span>
            <span>•</span>
            <span className="text-emerald-400/90 font-mono">Next.js App Router + InfluxDB v2</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
