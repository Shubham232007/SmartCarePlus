import React from 'react';
import { Heart, Activity, Thermometer, ArrowUpRight, ArrowDownRight, CheckCircle } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface VitalCardProps {
  type: 'heartRate' | 'spo2' | 'temperature';
  value: number;
  recordedAt?: string;
  status?: 'NORMAL' | 'WARNING' | 'CRITICAL' | string;
}

export const VitalCard: React.FC<VitalCardProps> = ({ type, value, recordedAt, status = 'NORMAL' }) => {
  const isHeart = type === 'heartRate';
  const isSpo2 = type === 'spo2';
  const isTemp = type === 'temperature';

  const title = isHeart ? 'Heart Rate' : isSpo2 ? 'Oxygen Saturation (SpO₂)' : 'Body Temperature';
  const unit = isHeart ? 'BPM' : isSpo2 ? '%' : '°C';

  const icon = isHeart ? (
    <Heart className="w-6 h-6 text-rose-500 animate-pulse" />
  ) : isSpo2 ? (
    <Activity className="w-6 h-6 text-sky-500" />
  ) : (
    <Thermometer className="w-6 h-6 text-amber-500" />
  );

  const normalRange = isHeart ? '50 - 120 BPM' : isSpo2 ? '94 - 100 %' : '36.0 - 38.0 °C';

  let borderColor = 'border-slate-200';
  let shadowColor = 'hover:shadow-md';

  if (status === 'CRITICAL') {
    borderColor = 'border-rose-300 ring-2 ring-rose-400/20';
    shadowColor = 'shadow-lg shadow-rose-100';
  } else if (status === 'WARNING') {
    borderColor = 'border-amber-300 ring-2 ring-amber-400/20';
    shadowColor = 'shadow-md shadow-amber-50';
  }

  return (
    <div className={`bg-white rounded-2xl p-5 border ${borderColor} ${shadowColor} transition-all duration-300 relative overflow-hidden`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">{icon}</div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            <p className="text-xs text-slate-400">Normal: {normalRange}</p>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      {/* Main Metric Value */}
      <div className="mt-4 flex items-baseline justify-between">
        <div className="flex items-baseline space-x-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">{value ? value.toFixed(1) : '--'}</span>
          <span className="text-sm font-bold text-slate-500">{unit}</span>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Updated {recordedAt ? new Date(recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
        <span className="inline-flex items-center text-teal-600 font-medium">
          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Telemetry Live
        </span>
      </div>
    </div>
  );
};
