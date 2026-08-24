import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Sliders, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';

export const AdminThresholdsPage: React.FC = () => {
  const [minHeartRate, setMinHeartRate] = useState<number>(50);
  const [maxHeartRate, setMaxHeartRate] = useState<number>(120);
  const [minSpo2Warning, setMinSpo2Warning] = useState<number>(94);
  const [minSpo2Critical, setMinSpo2Critical] = useState<number>(90);
  const [minTemp, setMinTemp] = useState<number>(36.0);
  const [maxTemp, setMaxTemp] = useState<number>(38.0);

  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const res = await api.get('/admin/statistics');
        if (res.data.success && res.data.stats?.thresholdConfig) {
          const tc = res.data.stats.thresholdConfig;
          setMinHeartRate(tc.minHeartRate);
          setMaxHeartRate(tc.maxHeartRate);
          setMinSpo2Warning(tc.minSpo2Warning);
          setMinSpo2Critical(tc.minSpo2Critical);
          setMinTemp(tc.minTemp);
          setMaxTemp(tc.maxTemp);
        }
      } catch (err) {
        console.error('Failed to load threshold settings:', err);
      }
    };
    fetchThresholds();
  }, []);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await api.put('/admin/thresholds', {
        minHeartRate,
        maxHeartRate,
        minSpo2Warning,
        minSpo2Critical,
        minTemp,
        maxTemp,
      });

      if (res.data.success) {
        setMessage('Software alert threshold configuration saved successfully.');
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to update thresholds.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Sliders className="w-5 h-5 text-amber-600 mr-2" /> Alert Threshold Configuration
          </h1>
          <p className="text-xs text-slate-500">Configure automated software trigger limits for IoT vital telemetry</p>
        </div>
      </div>

      <form onSubmit={handleSaveThresholds} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Heart Rate Thresholds */}
          <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-4">
            <h3 className="text-sm font-bold text-rose-900 flex items-center">
              ❤️ Heart Rate Limits (BPM)
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Low HR Threshold (BPM)</label>
              <input
                type="number"
                value={minHeartRate}
                onChange={(e) => setMinHeartRate(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400">Triggers LOW_HEART_RATE warning below this</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">High HR Threshold (BPM)</label>
              <input
                type="number"
                value={maxHeartRate}
                onChange={(e) => setMaxHeartRate(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400">Triggers HIGH_HEART_RATE critical alert above this</span>
            </div>
          </div>

          {/* SpO2 Thresholds */}
          <div className="p-5 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-4">
            <h3 className="text-sm font-bold text-sky-900 flex items-center">
              🫁 Oxygen Saturation Limits (%)
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SpO₂ Warning Level (%)</label>
              <input
                type="number"
                value={minSpo2Warning}
                onChange={(e) => setMinSpo2Warning(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400">Triggers LOW_SPO2 warning below this</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SpO₂ Critical Level (%)</label>
              <input
                type="number"
                value={minSpo2Critical}
                onChange={(e) => setMinSpo2Critical(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400">Triggers LOW_SPO2 critical alarm below this</span>
            </div>
          </div>

          {/* Temperature Thresholds */}
          <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-4">
            <h3 className="text-sm font-bold text-amber-900 flex items-center">
              🌡 Body Temperature Limits (°C)
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Temp (°C)</label>
              <input
                type="number"
                step="0.1"
                value={minTemp}
                onChange={(e) => setMinTemp(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400">Triggers LOW_TEMPERATURE warning below this</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Temp (°C)</label>
              <input
                type="number"
                step="0.1"
                value={maxTemp}
                onChange={(e) => setMaxTemp(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400">Triggers HIGH_TEMPERATURE fever warning above this</span>
            </div>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium rounded-xl flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-teal-600" />
            <span>{message}</span>
          </div>
        )}

        <div className="text-right pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="py-3 px-6 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-500/20 transition inline-flex items-center"
          >
            <Save className="w-4 h-4 mr-2" /> Save Threshold Settings
          </button>
        </div>
      </form>

      <DisclaimerFooter />
    </div>
  );
};
