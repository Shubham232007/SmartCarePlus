import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Users, HardDrive, ShieldAlert, Activity, Sliders, FileText, CheckCircle2 } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/statistics');
        if (res.data.success) setStats(res.data.stats);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">System Administration Console</h1>
        <p className="text-sm text-indigo-200 mt-1">SmartCare+ Infrastructure Management & Auditing</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-xs text-indigo-200 font-medium">Total Registered Users</p>
            <p className="text-2xl font-black text-white mt-1">{stats?.totalUsers || 0}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-xs text-indigo-200 font-medium">Active Doctors</p>
            <p className="text-2xl font-black text-white mt-1">{stats?.totalDoctors || 0}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-xs text-indigo-200 font-medium">Total Patients</p>
            <p className="text-2xl font-black text-white mt-1">{stats?.totalPatients || 0}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-xs text-emerald-300 font-medium">Online Devices</p>
            <p className="text-2xl font-black text-white mt-1">{stats?.onlineDevices || 0} / {stats?.totalDevices || 0}</p>
          </div>
        </div>
      </div>

      {/* Admin Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          onClick={() => navigate('/admin/users')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit group-hover:scale-110 transition">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-3">Users & Doctors</h3>
          <p className="text-xs text-slate-500 mt-1">Manage user profiles and assign doctors to patient beds.</p>
        </div>

        <div
          onClick={() => navigate('/admin/devices')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit group-hover:scale-110 transition">
            <HardDrive className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-3">IoT Device Registry</h3>
          <p className="text-xs text-slate-500 mt-1">Manage ESP32 DevKit devices and secret API keys.</p>
        </div>

        <div
          onClick={() => navigate('/admin/thresholds')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit group-hover:scale-110 transition">
            <Sliders className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-3">Alert Thresholds</h3>
          <p className="text-xs text-slate-500 mt-1">Configure software limits for Heart Rate, SpO2, and Body Temp.</p>
        </div>

        <div
          onClick={() => navigate('/admin/audit-logs')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit group-hover:scale-110 transition">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-3">Audit Logs</h3>
          <p className="text-xs text-slate-500 mt-1">View system security audit trail and access logs.</p>
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
