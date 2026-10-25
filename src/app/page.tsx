'use client';

import React, { useState, useMemo } from 'react';
import {
  MOCK_GREENHOUSES,
  INITIAL_METRICS,
  INITIAL_ACTUATORS,
  generateHistoricalData,
} from '@/lib/mock-data';
import { Greenhouse, SensorMetric, ActuatorState } from '@/types/farm';
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
} from 'lucide-react';

export default function DashboardPage() {
  const [selectedGreenhouse, setSelectedGreenhouse] = useState<Greenhouse>(MOCK_GREENHOUSES[0]);
  const [scenario, setScenario] = useState<SimulationScenario>('normal');
  const [actuators, setActuators] = useState<ActuatorState[]>(INITIAL_ACTUATORS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate historical data
  const historicalData = useMemo(() => generateHistoricalData(24), []);

  // Compute metrics based on simulation scenario
  const metrics = useMemo<SensorMetric[]>(() => {
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
  }, [scenario]);

  const isStale = scenario === 'stale';
  const isOffline = scenario === 'offline';

  const handleToggleActuator = (id: string) => {
    setActuators((prev) =>
      prev.map((act) => (act.id === id ? { ...act, isOn: !act.isOn } : act))
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const currentDevice = selectedGreenhouse.devices[0];

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
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Interactive Scenario Bar for Milestone 2 Testing */}
        <SimulationBar currentScenario={scenario} onSelectScenario={setScenario} />

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
            <TelemetryChart data={historicalData} isOffline={isOffline} />
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
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-zinc-200">Anti-Flooding Cutoff:</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Pumps forcefully de-energize if runtime exceeds 60s or if bed moisture reaches 85%.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-zinc-200">Thermal Relief Trigger:</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Circulation and exhaust fans automatically engage when canopy temperature exceeds 28°C.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-zinc-200">Loss-of-Signal Failsafe:</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      If MQTT disconnects for &gt; 120s, the ESP32 enters autonomous scheduled sampling mode.
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
            <span className="text-zinc-400">Milestone 2: Mock Dashboard</span>
            <span>•</span>
            <span className="text-emerald-400/90 font-mono">Next.js App Router + TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
