'use client';

import React from 'react';
import { SensorMetric } from '@/types/farm';
import {
  Droplets,
  Thermometer,
  Wind,
  Gauge,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface SensorCardProps {
  metric: SensorMetric;
  isStale?: boolean;
  isOffline?: boolean;
}

export const SensorCard: React.FC<SensorCardProps> = ({ metric, isStale = false, isOffline = false }) => {
  // Determine icon based on metric id
  const getIcon = () => {
    switch (metric.id) {
      case 'soil_moisture':
        return <Droplets className="w-5 h-5 text-teal-400" />;
      case 'soil_temp':
        return <Thermometer className="w-5 h-5 text-amber-400" />;
      case 'air_temp':
        return <Thermometer className="w-5 h-5 text-orange-400" />;
      case 'air_humidity':
        return <Wind className="w-5 h-5 text-cyan-400" />;
      case 'co2_level':
        return <Gauge className="w-5 h-5 text-emerald-400" />;
      default:
        return <Activity className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getStatusBadge = () => {
    if (isOffline) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
          OFFLINE
        </span>
      );
    }
    if (isStale) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800">
          <Clock className="w-3 h-3" /> STALE
        </span>
      );
    }
    switch (metric.status) {
      case 'optimal':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/80">
            OPTIMAL
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-800/80">
            <AlertTriangle className="w-3 h-3" /> WARNING
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/70 text-rose-300 border border-rose-800/80">
            <AlertTriangle className="w-3 h-3" /> CRITICAL
          </span>
        );
      default:
        return null;
    }
  };

  const getTrendIcon = () => {
    if (metric.trend === 'rising') {
      return <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 inline" />;
    }
    if (metric.trend === 'falling') {
      return <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 inline" />;
    }
    return <Minus className="w-3.5 h-3.5 text-zinc-400 inline" />;
  };

  // Percentage position in range for visual meter
  const rangeSpan = metric.maxCritical - metric.minCritical;
  const currentRatio = Math.max(0, Math.min(100, ((metric.value - metric.minCritical) / rangeSpan) * 100));

  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-300 ${
        isOffline
          ? 'bg-zinc-900/40 border-zinc-800/60 opacity-60'
          : isStale
          ? 'bg-zinc-900/60 border-amber-500/40 shadow-lg shadow-amber-950/20'
          : metric.status === 'critical'
          ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30'
          : metric.status === 'warning'
          ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30'
          : 'bg-zinc-900/70 border-zinc-800/80 hover:border-emerald-500/40 shadow-lg shadow-black/20'
      }`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">{metric.name}</h3>
            <p className="text-[11px] text-zinc-400">
              Optimal: {metric.minOptimal}–{metric.maxOptimal} {metric.unit}
            </p>
          </div>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Value Display */}
      <div className="flex items-baseline justify-between mt-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-3xl font-extrabold tracking-tight ${
              isOffline
                ? 'text-zinc-500'
                : isStale
                ? 'text-amber-300'
                : metric.status === 'critical'
                ? 'text-rose-400'
                : metric.status === 'warning'
                ? 'text-amber-400'
                : 'text-white'
            }`}
          >
            {isOffline ? '--' : metric.value.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-zinc-400">{metric.unit}</span>
        </div>

        {!isOffline && (
          <div className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
            {getTrendIcon()}
            <span>
              {metric.change24h > 0 ? `+${metric.change24h}` : metric.change24h} (24h)
            </span>
          </div>
        )}
      </div>

      {/* Visual meter bar */}
      {!isOffline && (
        <div className="mt-4">
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden relative border border-zinc-700/50">
            {/* Optimal zone guide */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/20"
              style={{
                left: `${((metric.minOptimal - metric.minCritical) / rangeSpan) * 100}%`,
                width: `${((metric.maxOptimal - metric.minOptimal) / rangeSpan) * 100}%`,
              }}
            />
            {/* Current marker indicator */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isStale
                  ? 'bg-amber-400'
                  : metric.status === 'critical'
                  ? 'bg-rose-500'
                  : metric.status === 'warning'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${currentRatio}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
            <span>{metric.minCritical}{metric.unit}</span>
            <span className="text-emerald-400/90 font-medium">Optimal Window</span>
            <span>{metric.maxCritical}{metric.unit}</span>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="truncate max-w-[200px]" title={metric.description}>
          {metric.description}
        </span>
        <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap ml-2">
          {isOffline ? 'No signal' : isStale ? 'Stale reading' : 'Sampled 15s ago'}
        </span>
      </div>
    </div>
  );
};
