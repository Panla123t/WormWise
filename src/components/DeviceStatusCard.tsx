'use client';

import React from 'react';
import { DeviceInfo } from '@/types/farm';
import { Cpu, Wifi, Radio, ShieldCheck, HardDrive, Hash, Clock, Server } from 'lucide-react';

interface DeviceStatusCardProps {
  device: DeviceInfo;
  isOffline?: boolean;
}

export const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({ device, isOffline = false }) => {
  const getSignalStrength = (rssi: number) => {
    if (rssi > -60) return { label: 'Excellent', color: 'text-emerald-400', percent: 95 };
    if (rssi > -70) return { label: 'Good', color: 'text-teal-400', percent: 75 };
    if (rssi > -80) return { label: 'Fair', color: 'text-amber-400', percent: 50 };
    return { label: 'Weak', color: 'text-rose-400', percent: 25 };
  };

  const signal = getSignalStrength(device.wifiRssi);

  return (
    <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-5 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">ESP32 Perception Node</h3>
            <p className="text-xs text-zinc-400">{device.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              !isOffline && device.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-mono text-zinc-300">
            {!isOffline && device.isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Grid of hardware stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Hardware Model */}
        <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Microcontroller</span>
          </div>
          <p className="text-xs font-semibold text-white truncate">{device.type}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Dual Core Tensilica LX6</p>
        </div>

        {/* Firmware Version */}
        <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
            <Hash className="w-3.5 h-3.5" />
            <span>Firmware</span>
          </div>
          <p className="text-xs font-mono font-semibold text-emerald-400">{device.firmwareVersion}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Local Safety Logic: Enabled</p>
        </div>

        {/* Wi-Fi RSSI */}
        <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
            <Wifi className="w-3.5 h-3.5" />
            <span>Wi-Fi Signal</span>
          </div>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold ${signal.color}`}>
              {device.wifiRssi} dBm
            </p>
            <span className="text-[10px] text-zinc-400">{signal.label}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full ${signal.percent > 60 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${signal.percent}%` }}
            />
          </div>
        </div>

        {/* Local IP Address */}
        <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
            <Server className="w-3.5 h-3.5" />
            <span>Local IP</span>
          </div>
          <p className="text-xs font-mono text-zinc-200">{device.ipAddress}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Subnet DHCP</p>
        </div>

        {/* MAC Address */}
        <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
            <Radio className="w-3.5 h-3.5" />
            <span>MAC Hardware ID</span>
          </div>
          <p className="text-xs font-mono text-zinc-200 truncate">{device.macAddress}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Static Chip ID</p>
        </div>

        {/* Last Heartbeat */}
        <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Last Heartbeat</span>
          </div>
          <p className="text-xs font-mono text-zinc-200">
            {isOffline ? 'Lost contact' : '14 seconds ago'}
          </p>
          <p className="text-[10px] text-emerald-400 mt-0.5">Keepalive: 30s interval</p>
        </div>
      </div>

      {/* Safety & Ingestion Architecture Footnote */}
      <div className="mt-4 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="text-zinc-300 font-medium">Autonomous Local Safety Guarantee</p>
          <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
            The ESP32 runs standalone control loop code. If Wi-Fi or HiveMQ MQTT fails, misting pumps auto-cutoff and local failsafes keep earthworms safe from drowning or desiccation.
          </p>
        </div>
      </div>
    </div>
  );
};
