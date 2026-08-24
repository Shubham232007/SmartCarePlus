import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Wifi, WifiOff } from 'lucide-react';

interface StatusBadgeProps {
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'ONLINE' | 'OFFLINE' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const upper = status ? status.toUpperCase() : 'NORMAL';

  let bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let icon = <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
  let label = upper;

  if (upper === 'WARNING') {
    bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
    icon = <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
  } else if (upper === 'CRITICAL' || upper === 'ACTIVE') {
    bgClass = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
    icon = <ShieldAlert className="w-3.5 h-3.5 mr-1" />;
  } else if (upper === 'ONLINE') {
    bgClass = 'bg-teal-50 text-teal-700 border-teal-200';
    icon = <Wifi className="w-3.5 h-3.5 mr-1" />;
  } else if (upper === 'OFFLINE') {
    bgClass = 'bg-slate-100 text-slate-600 border-slate-300';
    icon = <WifiOff className="w-3.5 h-3.5 mr-1" />;
  } else if (upper === 'ACKNOWLEDGED') {
    bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
    icon = <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
  } else if (upper === 'RESOLVED') {
    bgClass = 'bg-slate-50 text-slate-600 border-slate-200';
    icon = <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${bgClass} ${sizeClasses}`}>
      {icon}
      {label}
    </span>
  );
};
