import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { Bell, CheckCircle, ShieldAlert } from 'lucide-react';
import { Alert } from '../types';

export const DoctorAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const fetchAlerts = async () => {
    try {
      const res = await api.get(`/alerts?status=${statusFilter === 'ALL' ? '' : statusFilter}`);
      if (res.data.success) setAlerts(res.data.alerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const handleAcknowledge = async (id: string) => {
    await api.post(`/alerts/${id}/acknowledge`);
    fetchAlerts();
  };

  const handleResolve = async (id: string) => {
    await api.post(`/alerts/${id}/resolve`);
    fetchAlerts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Bell className="w-5 h-5 text-rose-600 mr-2" /> Real-time Alert Desk
          </h1>
          <p className="text-xs text-slate-500">Continuous telemetry alerts triggered by IoT software thresholds</p>
        </div>

        <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 text-xs font-semibold text-slate-600">
          {['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === st ? 'bg-teal-600 text-white font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-sm border border-slate-200">
            No alerts found for the selected status.
          </div>
        ) : (
          alerts.map((al) => (
            <div key={al.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <StatusBadge status={al.severity} size="sm" />
                  <span className="font-bold text-slate-900 text-sm">{al.title}</span>
                  <span className="font-mono text-xs font-bold text-teal-700">Patient: {al.patient?.patientId} ({al.patient?.user?.firstName} {al.patient?.user?.lastName})</span>
                </div>
                <p className="text-xs text-slate-600">{al.message}</p>
                <div className="text-[10px] text-slate-400 flex items-center space-x-4">
                  <span>Triggered: {new Date(al.createdAt).toLocaleString()}</span>
                  {al.acknowledgedBy && <span>Ack by: {al.acknowledgedBy}</span>}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {al.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleAcknowledge(al.id)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Acknowledge
                  </button>
                )}
                {al.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleResolve(al.id)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <DisclaimerFooter />
    </div>
  );
};
