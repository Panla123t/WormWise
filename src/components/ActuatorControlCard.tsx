'use client';

import React, { useState } from 'react';
import { ActuatorState } from '@/types/farm';
import { Power, Fan, Droplets, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';

interface ActuatorControlCardProps {
  actuators: ActuatorState[];
  onToggleActuator: (id: string) => void;
  isOffline?: boolean;
}

export const ActuatorControlCard: React.FC<ActuatorControlCardProps> = ({
  actuators,
  onToggleActuator,
  isOffline = false,
}) => {
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleToggle = (actuator: ActuatorState) => {
    if (isOffline) return;

    onToggleActuator(actuator.id);
    const action = !actuator.isOn ? 'ACTIVATED (Simulated)' : 'DEACTIVATED (Simulated)';
    setFeedbackMessage(`Command Simulated for ${actuator.name}: ${action}. Target ESP32 acknowledges safety bounds.`);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const getActuatorIcon = (type: string, isOn: boolean) => {
    if (type === 'pump') {
      return <Droplets className={`w-5 h-5 ${isOn ? 'text-teal-400 animate-pulse' : 'text-zinc-500'}`} />;
    }
    return <Fan className={`w-5 h-5 ${isOn ? 'text-cyan-400 animate-spin' : 'text-zinc-500'}`} />;
  };

  return (
    <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-5 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-950/60 border border-teal-800/50 flex items-center justify-center text-teal-400">
            <Power className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">2-Channel MOSFET Climate Control</h3>
            <p className="text-xs text-zinc-400">MOSFET 1 (Water Pump) & MOSFET 2 (120mm Ventilation Fan)</p>
          </div>
        </div>

        {/* Safety Lock Badge */}
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-950/60 text-teal-300 border border-teal-800/80">
          <Power className="w-3 h-3 text-teal-400" />
          2x MOSFET CHANNELS
        </span>
      </div>

      {/* Safety Notice Banner */}
      <div className="mb-4 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-zinc-300 font-medium">Hardware Interlock & Dual-Purpose Regulation</p>
          <p className="mt-0.5 text-[11px] leading-relaxed">
            <strong>MOSFET 1 (GPIO 25):</strong> Regulates soil moisture & air humidity, with misting providing evaporative air cooling (60s anti-flooding cutoff).<br />
            <strong>MOSFET 2 (GPIO 26):</strong> Regulates air temperature and circulation (120mm fan auto-engages when temperature ≥ 28°C).
          </p>
        </div>
      </div>

      {feedbackMessage && (
        <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Actuator Grid */}
      <div className="space-y-3">
        {actuators.map((actuator) => (
          <div
            key={actuator.id}
            className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              actuator.isOn
                ? 'bg-zinc-800/60 border-teal-500/40 shadow-sm'
                : 'bg-zinc-950/40 border-zinc-800/80'
            } ${isOffline ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {/* Actuator Meta */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                  actuator.isOn
                    ? 'bg-teal-950/70 border-teal-700/60'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                {getActuatorIcon(actuator.type, actuator.isOn)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-semibold text-white">{actuator.name}</h4>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                      actuator.mode === 'auto'
                        ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                        : 'bg-purple-950/60 text-purple-300 border-purple-800'
                    }`}
                  >
                    {actuator.mode}
                  </span>
                  {actuator.type === 'pump' ? (
                    <>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 font-medium">
                        Moisture (Soil & Air)
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-medium">
                        Evaporative Cooling
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                        Air Temp & Exhaust
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                        CO₂ Circulation
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">{actuator.description}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    Max safety cutoff: {actuator.safetyLimitSeconds}s
                  </span>
                  {actuator.isOn && (
                    <span className="text-teal-400 font-medium flex items-center gap-1">
                      ● Active (Simulated)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className={`text-xs font-mono font-medium ${actuator.isOn ? 'text-teal-300' : 'text-zinc-500'}`}>
                {actuator.isOn ? 'RUNNING' : 'STOPPED'}
              </span>
              <button
                type="button"
                onClick={() => handleToggle(actuator)}
                disabled={isOffline}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  actuator.isOn ? 'bg-teal-500' : 'bg-zinc-700'
                }`}
                title={`Toggle ${actuator.name} (Mock)`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    actuator.isOn ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
