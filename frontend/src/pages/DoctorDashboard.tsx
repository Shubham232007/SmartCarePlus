import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { Users, Wifi, ShieldAlert, Activity, Search, ChevronRight } from 'lucide-react';

export const DoctorDashboard = () => {
  const [summary, setSummary] = useState<any>({ totalPatients: 0, onlineDevices: 0, criticalAlerts: 0, activeAlerts: 0 });
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const navigate = useNavigate();

  const fetchDoctorData = async () => {
    try {
      const [sumRes, patRes] = await Promise.all([
        api.get('/doctors/summary'),
        api.get(`/doctors/patients?search=${encodeURIComponent(search)}&status=${statusFilter}`),
      ]);

      if (sumRes.data.success) setSummary(sumRes.data.summary);
      if (patRes.data.success) setPatients(patRes.data.patients);
    } catch (err) {
      console.error('Failed to load doctor dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Clinical Physician Dashboard</h1>
        <p className="text-sm text-teal-200 mt-1">Continuous Bedside IoT Telemetry & Patient Population Monitoring</p>

        {/* Overview Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-teal-300 text-xs font-semibold">
              <span>Assigned Patients</span>
              <Users className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold mt-1 text-white">{summary.totalPatients}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-teal-300 text-xs font-semibold">
              <span>Online ESP32 Devices</span>
              <Wifi className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold mt-1 text-white">{summary.onlineDevices}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-rose-300 text-xs font-semibold">
              <span>Critical Alerts</span>
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold mt-1 text-white">{summary.criticalAlerts}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
              <span>Active Alerts</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold mt-1 text-white">{summary.activeAlerts}</p>
          </div>
        </div>
      </div>

      {/* Patient Directory Table Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Patient Directory</h2>
            <p className="text-xs text-slate-500">Real-time vital parameters for authorized assigned patients</p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient name or ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white transition outline-none"
              />
            </div>

            {/* Status Chips */}
            <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 text-xs font-semibold text-slate-600 overflow-x-auto">
              {['ALL', 'NORMAL', 'WARNING', 'CRITICAL', 'ONLINE', 'OFFLINE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === st ? 'bg-teal-600 text-white shadow-xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Patient Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Heart Rate</th>
                <th className="py-3 px-4">SpO₂</th>
                <th className="py-3 px-4">Body Temp</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading assigned patient records...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No matching assigned patients found.</td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700">{p.patientId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {p.name}
                      <span className="block text-[10px] font-normal text-slate-400">{p.gender}, {p.dob} • {p.bloodGroup}</span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-800">
                      {p.latestVitals?.heartRate ? `${p.latestVitals.heartRate} BPM` : '--'}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-800">
                      {p.latestVitals?.spo2 ? `${p.latestVitals.spo2} %` : '--'}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-800">
                      {p.latestVitals?.temperature ? `${p.latestVitals.temperature} °C` : '--'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.deviceStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.healthStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/doctor/patients/${p.patientId}`)}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white font-bold text-xs rounded-xl border border-teal-200 transition inline-flex items-center"
                      >
                        View Profile <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
