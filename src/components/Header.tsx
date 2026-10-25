'use client';

import React from 'react';
import { Greenhouse } from '@/types/farm';
import { Sprout, Wifi, WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  greenhouses: Greenhouse[];
  selectedGreenhouse: Greenhouse;
  onSelectGreenhouse: (gh: Greenhouse) => void;
  simulationMode: 'normal' | 'low_moisture' | 'stale' | 'offline';
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  greenhouses,
  selectedGreenhouse,
  onSelectGreenhouse,
  simulationMode,
  onRefresh,
  isRefreshing,
}) => {
  const isOnline = simulationMode !== 'offline';

  return (
    <header className="border-b border-emerald-950/20 bg-emerald-950/50 backdrop-blur-md sticky top-0 z-40">
      {/* Milestone 2 Safety notice */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>
            <strong>Milestone 2 Mock Mode:</strong> UI connected to telemetry simulator. Hardware actuators are safely isolated.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-zinc-400">
          <span>Firmware Target: ESP32-WROOM-32D</span>
          <span>•</span>
          <span>Broker: HiveMQ Cloud</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                WormWise <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Smart Farm</span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400">Vermiculture Perception & Climate Control</p>
          </div>
        </div>

        {/* Controls & Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Greenhouse Dropdown */}
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-xs text-zinc-400">Unit:</span>
            <select
              value={selectedGreenhouse.id}
              onChange={(e) => {
                const found = greenhouses.find((g) => g.id === e.target.value);
                if (found) onSelectGreenhouse(found);
              }}
              className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
            >
              {greenhouses.map((gh) => (
                <option key={gh.id} value={gh.id} className="bg-zinc-900 text-white">
                  {gh.name}
                </option>
              ))}
            </select>
          </div>

          {/* Device Connectivity Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            {isOnline ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ESP32 Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Node Disconnected</span>
              </>
            )}
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-medium transition disabled:opacity-50"
            title="Refresh sensor sample"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Sample Now</span>
          </button>
        </div>
      </div>
    </header>
  );
};
