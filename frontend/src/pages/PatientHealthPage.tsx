import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { VitalCard } from '../components/vitals/VitalCard';
import { VitalsChart } from '../components/vitals/VitalsChart';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { Heart } from 'lucide-react';
import { VitalReading } from '../types';

export const PatientHealthPage: React.FC = () => {
  const [latestVital, setLatestVital] = useState<VitalReading | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalReading[]>([]);

  const fetchHealthData = async (range = '24h') => {
    try {
      const [latestRes, histRes] = await Promise.all([
        api.get('/patients/me/vitals/latest'),
        api.get(`/patients/me/vitals/history?range=${range}`),
      ]);
      if (latestRes.data.success) setLatestVital(latestRes.data.latest);
      if (histRes.data.success) setVitalsHistory(histRes.data.readings);
    } catch (err) {
      console.error('Failed to load patient health vitals:', err);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center">
          <Heart className="w-5 h-5 text-rose-500 mr-2" /> My Continuous Health Parameters
        </h1>
        <p className="text-xs text-slate-500">Live bedside telemetry and historical health trend charts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <VitalCard
          type="heartRate"
          value={latestVital?.heartRate || 75}
          recordedAt={latestVital?.recordedAt}
          status={(latestVital?.heartRate || 75) > 120 ? 'CRITICAL' : (latestVital?.heartRate || 75) < 50 ? 'WARNING' : 'NORMAL'}
        />
        <VitalCard
          type="spo2"
          value={latestVital?.spo2 || 98}
          recordedAt={latestVital?.recordedAt}
          status={(latestVital?.spo2 || 98) < 90 ? 'CRITICAL' : (latestVital?.spo2 || 98) < 94 ? 'WARNING' : 'NORMAL'}
        />
        <VitalCard
          type="temperature"
          value={latestVital?.temperature || 36.7}
          recordedAt={latestVital?.recordedAt}
          status={(latestVital?.temperature || 36.7) > 38.0 || (latestVital?.temperature || 36.7) < 36.0 ? 'WARNING' : 'NORMAL'}
        />
      </div>

      <VitalsChart readings={vitalsHistory} onRangeChange={(r) => fetchHealthData(r)} />

      <DisclaimerFooter />
    </div>
  );
};
