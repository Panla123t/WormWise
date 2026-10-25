'use client';

import React, { useState } from 'react';
import { HistoricalDataPoint } from '@/types/farm';
import { LineChart, Activity } from 'lucide-react';

interface TelemetryChartProps {
  data: HistoricalDataPoint[];
  isOffline?: boolean;
  timeRange?: '24h' | '12h' | '6h';
  onTimeRangeChange?: (range: '24h' | '12h' | '6h') => void;
  dataSource?: 'influxdb' | 'mock';
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  data,
  isOffline = false,
  timeRange: controlledTimeRange,
  onTimeRangeChange,
  dataSource = 'mock',
}) => {
  const [activeMetric, setActiveMetric] = useState<'moisture' | 'temperature'>('moisture');
  const [internalTimeRange, setInternalTimeRange] = useState<'24h' | '12h' | '6h'>('24h');

  const timeRange = controlledTimeRange || internalTimeRange;
  const handleTimeRangeClick = (r: '24h' | '12h' | '6h') => {
    setInternalTimeRange(r);
    onTimeRangeChange?.(r);
  };

  const sliceCount = timeRange === '24h' ? 24 : timeRange === '12h' ? 12 : 6;
  const displayData = data.slice(-sliceCount);

  // Bounds calculation
  let series1Values: number[];
  let series2Values: number[];
  let series1Label: string;
  let series2Label: string;
  let series1Color: string;
  let series2Color: string;
  let unit: string;

  if (activeMetric === 'moisture') {
    series1Values = displayData.map((d) => d.soilMoisture);
    series2Values = displayData.map((d) => d.airHumidity);
    series1Label = 'Bed Moisture';
    series2Label = 'Air Humidity';
    series1Color = '#2dd4bf'; // teal-400
    series2Color = '#06b6d4'; // cyan-500
    unit = '%';
  } else {
    series1Values = displayData.map((d) => d.soilTemperature);
    series2Values = displayData.map((d) => d.airTemperature);
    series1Label = 'Bed Temp';
    series2Label = 'Air Temp';
    series1Color = '#fbbf24'; // amber-400
    series2Color = '#f97316'; // orange-500
    unit = '°C';
  }

  const allVals = [...series1Values, ...series2Values];
  const minVal = Math.floor(Math.min(...allVals) - 2);
  const maxVal = Math.ceil(Math.max(...allVals) + 2);
  const range = maxVal - minVal || 1;

  // Chart SVG coordinates
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const getPoints = (values: number[]) => {
    return values.map((val, idx) => {
      const x = paddingX + (idx / (values.length - 1 || 1)) * chartW;
      const y = paddingY + chartH - ((val - minVal) / range) * chartH;
      return { x, y, val };
    });
  };

  const points1 = getPoints(series1Values);
  const points2 = getPoints(series2Values);

  const polyline1 = points1.map((p) => `${p.x},${p.y}`).join(' ');
  const polyline2 = points2.map((p) => `${p.x},${p.y}`).join(' ');

  const area1 = `${paddingX},${paddingY + chartH} ` + polyline1 + ` ${paddingX + chartW},${paddingY + chartH}`;

  return (
    <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-5 shadow-lg shadow-black/20">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Historical Telemetry Trends</h3>
            <p className="text-xs text-zinc-400">
              Sensor behavior over time ({dataSource === 'influxdb' ? 'InfluxDB Flux query' : 'InfluxDB baseline mock'})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex bg-zinc-800/90 p-0.5 rounded-lg border border-zinc-700/60 text-xs">
            <button
              onClick={() => setActiveMetric('moisture')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                activeMetric === 'moisture'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Moisture & Humidity
            </button>
            <button
              onClick={() => setActiveMetric('temperature')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                activeMetric === 'temperature'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Temperature
            </button>
          </div>

          {/* Time range */}
          <div className="flex bg-zinc-800/90 p-0.5 rounded-lg border border-zinc-700/60 text-xs text-zinc-400">
            {(['6h', '12h', '24h'] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleTimeRangeClick(r)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  timeRange === r ? 'bg-zinc-700 text-white' : 'hover:text-zinc-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center gap-4 mb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: series1Color }}></span>
          <span className="text-zinc-300 font-medium">{series1Label}</span>
          <span className="text-zinc-400">({series1Values[series1Values.length - 1]}{unit})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: series2Color }}></span>
          <span className="text-zinc-300 font-medium">{series2Label}</span>
          <span className="text-zinc-400">({series2Values[series2Values.length - 1]}{unit})</span>
        </div>
      </div>

      {/* Chart Body */}
      {isOffline ? (
        <div className="h-56 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40 text-zinc-400 text-xs">
          <Activity className="w-8 h-8 mb-2 text-zinc-600 animate-pulse" />
          <p>Sensor telemetry stream unavailable while ESP32 node is offline.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[600px]">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series1Color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={series1Color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingY + chartH * ratio;
                const val = +(maxVal - ratio * range).toFixed(0);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={paddingX + chartW}
                      y2={y}
                      stroke="#27272a"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 4}
                      fill="#71717a"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {val}{unit}
                    </text>
                  </g>
                );
              })}

              {/* Area fill for series 1 */}
              <polygon points={area1} fill="url(#chartGradient)" />

              {/* Polyline series 2 */}
              <polyline
                fill="none"
                stroke={series2Color}
                strokeWidth="2"
                strokeDasharray="4 3"
                points={polyline2}
              />

              {/* Polyline series 1 */}
              <polyline
                fill="none"
                stroke={series1Color}
                strokeWidth="2.5"
                points={polyline1}
              />

              {/* Data points for series 1 */}
              {points1.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="#18181b"
                  stroke={series1Color}
                  strokeWidth="2"
                  className="hover:r-5 transition-all cursor-pointer"
                >
                  <title>{`${series1Label}: ${p.val}${unit} at ${displayData[idx]?.timestamp}`}</title>
                </circle>
              ))}

              {/* X Axis Timestamps */}
              {displayData.map((point, idx) => {
                if (idx % (Math.ceil(displayData.length / 6)) !== 0 && idx !== displayData.length - 1) {
                  return null;
                }
                const x = paddingX + (idx / (displayData.length - 1 || 1)) * chartW;
                return (
                  <text
                    key={idx}
                    x={x}
                    y={svgHeight - 4}
                    fill="#71717a"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {point.timestamp}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
        <span>Sampling interval: Every 10 seconds (Downsampled for 24h view)</span>
        <span className="font-mono text-emerald-400">Database: InfluxDB (Target: Milestone 6)</span>
      </div>
    </div>
  );
};
