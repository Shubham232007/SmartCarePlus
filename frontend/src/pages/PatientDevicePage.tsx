import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { HardDrive, Cpu, Wifi, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';

export const PatientDevicePage: React.FC = () => {
  const [patientData, setPatientData] = useState<any>(null);

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const res = await api.get('/patients/me');
        if (res.data.success) setPatientData(res.data.patient);
      } catch (err) {
        console.error('Failed to load device info:', err);
      }
    };
    fetchDevice();
  }, []);

  const device = patientData?.devices?.[0] || {
    deviceId: 'SC-ESP32-001',
    deviceName: 'SmartCare Bedside Unit',
    deviceType: 'ESP32 DevKit V1',
    firmwareVersion: '1.2.0',
    status: 'ONLINE',
    macAddress: '24:0AC4:00:01',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center">
          <HardDrive className="w-5 h-5 text-teal-600 mr-2" /> Bedside Hardware Device Status
        </h1>
        <p className="text-xs text-slate-500">Hardware prototype hardware specs & wireless telemetry connection</p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Cpu className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{device.deviceName}</h2>
              <p className="text-xs text-slate-500 font-mono">ID: {device.deviceId} • MAC: {device.macAddress || '24:0AC4:00:01'}</p>
            </div>
          </div>

          <StatusBadge status={device.status || 'ONLINE'} size="lg" />
        </div>

        {/* Prototype Hardware Pinout Spec Display */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Physical Bedside Hardware Integration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-900 flex items-center"><Activity className="w-4 h-4 text-rose-500 mr-2" /> Pulse Oximeter & HR</p>
              <p className="text-slate-600">Sensor: <span className="font-semibold text-slate-800">MAX30100</span> (I2C SDA=21, SCL=22)</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-900 flex items-center"><Activity className="w-4 h-4 text-amber-500 mr-2" /> Temperature Probe</p>
              <p className="text-slate-600">Sensor: <span className="font-semibold text-slate-800">DS18B20 Waterproof</span> (OneWire Pin 4)</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-900 flex items-center"><Cpu className="w-4 h-4 text-sky-500 mr-2" /> Display & Audio</p>
              <p className="text-slate-600">OLED: <span className="font-semibold text-slate-800">0.96" SSD1306</span> | Amp: <span className="font-semibold text-slate-800">MAX98357A 3W</span></p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-900 flex items-center"><ShieldAlert className="w-4 h-4 text-rose-600 mr-2" /> Microphones & Buttons</p>
              <p className="text-slate-600">INMP441 I2S MEMS Mic | SOS Button Pin 34 | Med Button Pin 35</p>
            </div>
          </div>
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
