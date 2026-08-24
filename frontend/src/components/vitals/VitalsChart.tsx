import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { VitalReading } from '../../types';
import { Calendar, RefreshCw } from 'lucide-react';

interface VitalsChartProps {
  readings: VitalReading[];
  onRangeChange?: (range: string) => void;
  isLoading?: boolean;
}

export const VitalsChart: React.FC<VitalsChartProps> = ({ readings, onRangeChange, isLoading }) => {
  const [selectedRange, setSelectedRange] = useState<string>('24h');
  const [activeMetric, setActiveMetric] = useState<'all' | 'hr' | 'spo2' | 'temp'>('all');

  const handleRangeClick = (range: string) => {
    setSelectedRange(range);
    if (onRangeChange) onRangeChange(range);
  };

  const chartData = readings.map((r) => ({
    time: new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date(r.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    heartRate: r.heartRate,
    spo2: r.spo2,
    temperature: r.temperature,
  }));

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      {/* Chart Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center">
            <Calendar className="w-5 h-5 text-teal-600 mr-2" /> Continuous Health Trends
          </h3>
          <p className="text-xs text-slate-500">Real-time IoT telemetry chart visualization</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveMetric('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${activeMetric === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              All Vitals
            </button>
            <button
              onClick={() => setActiveMetric('hr')}
              className={`px-2.5 py-1 rounded-lg transition-all ${activeMetric === 'hr' ? 'bg-white text-rose-600 shadow-sm' : 'hover:text-slate-900'}`}
            >
              ❤️ HR
            </button>
            <button
              onClick={() => setActiveMetric('spo2')}
              className={`px-2.5 py-1 rounded-lg transition-all ${activeMetric === 'spo2' ? 'bg-white text-sky-600 shadow-sm' : 'hover:text-slate-900'}`}
            >
              🫁 SpO₂
            </button>
            <button
              onClick={() => setActiveMetric('temp')}
              className={`px-2.5 py-1 rounded-lg transition-all ${activeMetric === 'temp' ? 'bg-white text-amber-600 shadow-sm' : 'hover:text-slate-900'}`}
            >
              🌡 Temp
            </button>
          </div>

          {/* Timeframe Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 text-xs font-medium text-slate-600">
            {['1h', '6h', '24h', '7d', '30d'].map((r) => (
              <button
                key={r}
                onClick={() => handleRangeClick(r)}
                className={`px-2.5 py-1 rounded-lg uppercase transition-all ${selectedRange === r ? 'bg-teal-600 text-white font-bold shadow-sm' : 'hover:text-slate-900'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
          </div>
        )}

        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">No vital telemetry data available for the selected timeframe.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />

              {(activeMetric === 'all' || activeMetric === 'hr') && (
                <Line type="monotone" dataKey="heartRate" name="Heart Rate (BPM)" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 6 }} />
              )}
              {(activeMetric === 'all' || activeMetric === 'spo2') && (
                <Line type="monotone" dataKey="spo2" name="SpO₂ (%)" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 6 }} />
              )}
              {(activeMetric === 'all' || activeMetric === 'temp') && (
                <Line type="monotone" dataKey="temperature" name="Body Temp (°C)" stroke="#d97706" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 6 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
