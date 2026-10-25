'use client';

import React from 'react';
import { Sliders, CheckCircle, AlertTriangle, AlertOctagon, Clock, WifiOff } from 'lucide-react';

export type SimulationScenario = 'normal' | 'low_moisture' | 'high_temp' | 'stale' | 'offline';

interface SimulationBarProps {
  currentScenario: SimulationScenario;
  onSelectScenario: (scenario: SimulationScenario) => void;
}

export const SimulationBar: React.FC<SimulationBarProps> = ({ currentScenario, onSelectScenario }) => {
  const scenarios: { id: SimulationScenario; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'normal',
      label: 'Optimal State',
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
      desc: 'Bed moisture 72%, Temp 21.8°C, ESP32 online',
    },
    {
      id: 'low_moisture',
      label: 'Low Moisture Alert',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
      desc: 'Bed moisture drops to 54.2% (Worms need misting)',
    },
    {
      id: 'high_temp',
      label: 'High Temp Alert',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
      desc: 'Bed temp reaches 29.5°C (Cooling fans required)',
    },
    {
      id: 'stale',
      label: 'Stale Telemetry',
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
      desc: 'Sensor probe disconnected (>5 mins no update)',
    },
    {
      id: 'offline',
      label: 'ESP32 Offline',
      icon: <WifiOff className="w-3.5 h-3.5 text-rose-400" />,
      desc: 'Power/Wi-Fi dropped; local safety interlocks active',
    },
  ];

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 mb-6 shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Milestone 2 Interactive Telemetry Simulator</span>
          <span className="text-[10px] text-zinc-400 font-normal">
            (Verify UI states without real hardware)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {scenarios.map((s) => {
          const isActive = currentScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectScenario(s.id)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-zinc-800/90 border-emerald-500 shadow-sm shadow-emerald-950/30'
                  : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-800/50 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {s.icon}
                <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                  {s.label}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">{s.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
