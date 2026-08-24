import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { VitalCard } from '../components/vitals/VitalCard';
import { VitalsChart } from '../components/vitals/VitalsChart';
import { StatusBadge } from '../components/common/StatusBadge';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { VitalReading, Medicine, Alert } from '../types';
import { Pill, Check, X, ShieldAlert, Bot, Activity, Clock, Heart } from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { latestVitalUpdate, latestAlert } = useSocket();

  const [patientData, setPatientData] = useState<any>(null);
  const [latestVital, setLatestVital] = useState<VitalReading | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalReading[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboardData = async (range = '24h') => {
    try {
      const [pRes, vLatestRes, vHistRes, medRes, alRes] = await Promise.all([
        api.get('/patients/me'),
        api.get('/patients/me/vitals/latest'),
        api.get(`/patients/me/vitals/history?range=${range}`),
        api.get('/medicines'),
        api.get('/alerts'),
      ]);

      if (pRes.data.success) setPatientData(pRes.data.patient);
      if (vLatestRes.data.success) setLatestVital(vLatestRes.data.latest);
      if (vHistRes.data.success) setVitalsHistory(vHistRes.data.readings);
      if (medRes.data.success) setMedicines(medRes.data.medicines);
      if (alRes.data.success) setAlerts(alRes.data.alerts);
    } catch (err) {
      console.error('Error fetching patient dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update latest vital if socket emits real-time event for this patient
  useEffect(() => {
    if (latestVitalUpdate && patientData && (latestVitalUpdate.patientId === patientData.id || latestVitalUpdate.patientId === patientData.patientId)) {
      setLatestVital(latestVitalUpdate);
      setVitalsHistory((prev) => [...prev, latestVitalUpdate]);
    }
  }, [latestVitalUpdate, patientData]);

  // Update alert list if socket emits real-time alert
  useEffect(() => {
    if (latestAlert) {
      setAlerts((prev) => [latestAlert, ...prev]);
    }
  }, [latestAlert]);

  const handleConfirmMedicineLog = async (logId: string, status: 'TAKEN' | 'SKIPPED') => {
    try {
      await api.post(`/medicines/logs/${logId}/confirm`, { status });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to confirm medicine log:', err);
    }
  };

  const primaryDevice = patientData?.devices?.[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-700/15 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Good Morning, {user?.firstName || 'Patient'}
            </h1>
            <p className="text-sm text-teal-100 mt-1 max-w-xl">
              SmartCare+ bedside sensors are actively monitoring your heart rate, oxygen saturation, and body temperature.
            </p>
          </div>

          {/* Quick Patient Meta Pill */}
          <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center space-x-4 text-xs shrink-0">
            <div>
              <p className="text-teal-200 font-medium">Patient Identifier</p>
              <p className="text-lg font-bold font-mono text-white">{patientData?.patientId || user?.humanPatientId || 'PAT-1001'}</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-teal-200 font-medium">Bedside Device</p>
              <div className="mt-0.5">
                <StatusBadge status={primaryDevice?.status || 'ONLINE'} size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vital Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <VitalCard
          type="heartRate"
          value={latestVital?.heartRate || 75}
          recordedAt={latestVital?.recordedAt}
          status={
            (latestVital?.heartRate || 75) > 120 ? 'CRITICAL' : (latestVital?.heartRate || 75) < 50 ? 'WARNING' : 'NORMAL'
          }
        />

        <VitalCard
          type="spo2"
          value={latestVital?.spo2 || 98}
          recordedAt={latestVital?.recordedAt}
          status={
            (latestVital?.spo2 || 98) < 90 ? 'CRITICAL' : (latestVital?.spo2 || 98) < 94 ? 'WARNING' : 'NORMAL'
          }
        />

        <VitalCard
          type="temperature"
          value={latestVital?.temperature || 36.7}
          recordedAt={latestVital?.recordedAt}
          status={
            (latestVital?.temperature || 36.7) > 38.0 || (latestVital?.temperature || 36.7) < 36.0 ? 'WARNING' : 'NORMAL'
          }
        />
      </div>

      {/* Main Interactive Recharts Graph */}
      <VitalsChart readings={vitalsHistory} onRangeChange={(range) => fetchDashboardData(range)} isLoading={isLoading} />

      {/* Medicine & Active Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Medicine Section */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Today's Medicines</h3>
                  <p className="text-xs text-slate-500">Scheduled bedside dosages & adherence</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-bold text-xs rounded-full">
                {medicines.length} Active Prescriptions
              </span>
            </div>

            {/* Medicine Items List */}
            <div className="space-y-3">
              {medicines.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active medication schedules configured.</p>
              ) : (
                medicines.map((med) => {
                  const pendingLog = med.logs?.find((l) => l.status === 'PENDING');
                  const takenLog = med.logs?.find((l) => l.status === 'TAKEN');

                  return (
                    <div key={med.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{med.name} <span className="text-xs font-semibold text-teal-600">({med.dosage})</span></p>
                        <p className="text-slate-500 mt-0.5">{med.frequency} • {med.instructions}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {takenLog ? (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg inline-flex items-center">
                            <Check className="w-3.5 h-3.5 mr-1" /> Confirmed
                          </span>
                        ) : pendingLog ? (
                          <>
                            <button
                              onClick={() => handleConfirmMedicineLog(pendingLog.id, 'TAKEN')}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-xs transition"
                            >
                              Confirm Taken
                            </button>
                            <button
                              onClick={() => handleConfirmMedicineLog(pendingLog.id, 'SKIPPED')}
                              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition"
                            >
                              Skip
                            </button>
                          </>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-medium rounded-lg">Completed</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Active Alerts Panel */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Recent Alerts & Notifications</h3>
                  <p className="text-xs text-slate-500">Automated IoT software threshold triggers</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold text-xs rounded-full">
                {alerts.filter((a) => a.status === 'ACTIVE').length} Active
              </span>
            </div>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active alerts recorded.</p>
              ) : (
                alerts.slice(0, 4).map((al) => (
                  <div key={al.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={al.severity} size="sm" />
                        <span className="font-bold text-slate-800">{al.title}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{al.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{new Date(al.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
