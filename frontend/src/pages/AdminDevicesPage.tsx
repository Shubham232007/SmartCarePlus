import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { HardDrive, Plus, Key, Cpu, RefreshCw } from 'lucide-react';
import { Device } from '../types';

export const AdminDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('');
  const [patientId, setPatientId] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      if (res.data.success) setDevices(res.data.devices);
    } catch (err) {
      console.error('Failed to load devices:', err);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId || !deviceName) return;
    try {
      const res = await api.post('/devices', {
        deviceId,
        deviceName,
        patientId: patientId || undefined,
        deviceType: 'ESP32_BEDSIDE',
        firmwareVersion: '1.2.0',
      });

      if (res.data.success) {
        setMessage(`Device '${deviceId}' registered successfully.`);
        setDeviceId('');
        setDeviceName('');
        setPatientId('');
        fetchDevices();
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Device registration failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <HardDrive className="w-5 h-5 text-sky-600 mr-2" /> IoT Bedside Device Registry
          </h1>
          <p className="text-xs text-slate-500">Manage ESP32 DevKit V1 units, device key secrets, and patient bindings</p>
        </div>
      </div>

      {/* Register New Device Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center">
          <Plus className="w-4 h-4 text-sky-600 mr-2" /> Register New ESP32 Device
        </h2>

        <form onSubmit={handleRegisterDevice} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Device ID (e.g. SC-ESP32-011)</label>
            <input
              type="text"
              required
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="SC-ESP32-011"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 transition outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Device Name</label>
            <input
              type="text"
              required
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Bedside Monitor Unit 11"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 transition outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Patient ID (Optional)</label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="PAT-1001"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 transition outline-none"
            />
          </div>

          <button
            type="submit"
            className="py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Register Device
          </button>
        </form>

        {message && (
          <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium rounded-xl">
            {message}
          </div>
        )}
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Registered Hardware Units ({devices.length})</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Device Name</th>
                <th className="py-3 px-4">Assigned Patient</th>
                <th className="py-3 px-4">Device Key Secret</th>
                <th className="py-3 px-4">Firmware</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {devices.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-sky-700">{d.deviceId}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{d.deviceName}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    {d.patient ? `${d.patient.user.firstName} ${d.patient.user.lastName} (${d.patient.patientId})` : 'Unassigned'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 bg-slate-50 px-2 rounded border border-slate-200 max-w-[160px] truncate">
                    {d.deviceKey}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{d.firmwareVersion}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
