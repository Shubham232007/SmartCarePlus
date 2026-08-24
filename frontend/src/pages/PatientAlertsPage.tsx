import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Bell } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { Alert } from '../types';

export const PatientAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/alerts');
        if (res.data.success) setAlerts(res.data.alerts);
      } catch (err) {
        console.error('Failed to load patient alerts:', err);
      }
    };
    fetchAlerts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center">
          <Bell className="w-5 h-5 text-rose-600 mr-2" /> My Notifications & Threshold Warnings
        </h1>
        <p className="text-xs text-slate-500">History of automated alerts logged for your bedside unit</p>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-sm border border-slate-200">
            No active alerts or warnings recorded.
          </div>
        ) : (
          alerts.map((al) => (
            <div key={al.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <StatusBadge status={al.severity} size="sm" />
                  <span className="font-bold text-slate-900 text-sm">{al.title}</span>
                </div>
                <p className="text-xs text-slate-600">{al.message}</p>
                <span className="text-[10px] text-slate-400 block">{new Date(al.createdAt).toLocaleString()}</span>
              </div>
              <StatusBadge status={al.status} size="sm" />
            </div>
          ))
        )}
      </div>

      <DisclaimerFooter />
    </div>
  );
};
