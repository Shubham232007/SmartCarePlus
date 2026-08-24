import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { VitalCard } from '../components/vitals/VitalCard';
import { VitalsChart } from '../components/vitals/VitalsChart';
import { StatusBadge } from '../components/common/StatusBadge';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { ArrowLeft, Plus, FileText, Pill, ShieldAlert, Bot, PhoneCall, CheckCircle } from 'lucide-react';

export const DoctorPatientDetail: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<any>(null);
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
  const [newNote, setNewNote] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'medicines' | 'alerts' | 'ai' | 'notes'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchPatientDetails = async (range = '24h') => {
    if (!patientId) return;
    try {
      const [pRes, vHistRes] = await Promise.all([
        api.get(`/doctors/patients/${patientId}`),
        api.get(`/patients/${patientId}/vitals/history?range=${range}`),
      ]);

      if (pRes.data.success) setPatient(pRes.data.patient);
      if (vHistRes.data.success) setVitalsHistory(vHistRes.data.readings);
    } catch (err) {
      console.error('Error fetching patient profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [patientId]);

  const handleAddClinicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !patientId) return;

    setIsSubmittingNote(true);
    try {
      const res = await api.post(`/patients/${patientId}/notes`, { note: newNote });
      if (res.data.success) {
        setNewNote('');
        fetchPatientDetails();
      }
    } catch (err) {
      console.error('Failed to add clinical note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/alerts/${alertId}/acknowledge`);
      fetchPatientDetails();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.post(`/alerts/${alertId}/resolve`);
      fetchPatientDetails();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  if (isLoading || !patient) {
    return <div className="p-8 text-center text-slate-400">Loading patient electronic health record...</div>;
  }

  const latestVital = patient.vitalReadings?.[0] || { heartRate: 75, spo2: 98, temperature: 36.6 };
  const primaryDevice = patient.devices?.[0];

  return (
    <div className="space-y-6">
      {/* Top Navigation Back Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/doctor/patients')}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition inline-flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Patients List
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">Bedside Device:</span>
          <StatusBadge status={primaryDevice?.status || 'OFFLINE'} size="sm" />
        </div>
      </div>

      {/* Patient Profile Demographics Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-teal-100 text-teal-800 font-mono font-black text-sm rounded-xl">
              {patient.patientId}
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              {patient.user?.firstName} {patient.user?.lastName}
            </h1>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-600">
            <span><strong className="text-slate-800">DOB:</strong> {patient.dateOfBirth}</span>
            <span><strong className="text-slate-800">Gender:</strong> {patient.gender}</span>
            <span><strong className="text-slate-800">Blood Group:</strong> {patient.bloodGroup}</span>
            <span><strong className="text-slate-800">Emergency:</strong> {patient.emergencyContactName} ({patient.emergencyContactPhone})</span>
          </div>

          <div className="mt-2 text-xs text-slate-500">
            <p><strong className="text-slate-700">Medical Conditions:</strong> {patient.medicalConditions || 'None specified'}</p>
            <p><strong className="text-slate-700">Allergies:</strong> {patient.allergies || 'None'}</p>
          </div>
        </div>
      </div>

      {/* Current Vitals Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <VitalCard
          type="heartRate"
          value={latestVital.heartRate}
          recordedAt={latestVital.recordedAt}
          status={latestVital.heartRate > 120 ? 'CRITICAL' : latestVital.heartRate < 50 ? 'WARNING' : 'NORMAL'}
        />

        <VitalCard
          type="spo2"
          value={latestVital.spo2}
          recordedAt={latestVital.recordedAt}
          status={latestVital.spo2 < 90 ? 'CRITICAL' : latestVital.spo2 < 94 ? 'WARNING' : 'NORMAL'}
        />

        <VitalCard
          type="temperature"
          value={latestVital.temperature}
          recordedAt={latestVital.recordedAt}
          status={latestVital.temperature > 38.0 || latestVital.temperature < 36.0 ? 'WARNING' : 'NORMAL'}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex space-x-2 text-xs font-bold text-slate-600">
        {[
          { key: 'overview', label: 'Vitals Graph' },
          { key: 'medicines', label: `Medicines (${patient.medicines?.length || 0})` },
          { key: 'alerts', label: `Alerts (${patient.alerts?.length || 0})` },
          { key: 'ai', label: `AI Interactions (${patient.voiceInteractions?.length || 0})` },
          { key: 'notes', label: `Clinical Notes (${patient.clinicalNotes?.length || 0})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`py-3 px-4 rounded-t-xl transition-all border-b-2 ${
              activeTab === t.key ? 'border-teal-600 text-teal-700 bg-white font-extrabold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <VitalsChart readings={vitalsHistory} onRangeChange={(r) => fetchPatientDetails(r)} />
      )}

      {activeTab === 'medicines' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center">
            <Pill className="w-5 h-5 text-teal-600 mr-2" /> Prescribed Medications & Logs
          </h3>

          <div className="space-y-3">
            {patient.medicines?.map((m: any) => (
              <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>{m.name} ({m.dosage})</span>
                  <span className="text-xs text-teal-700 font-semibold">{m.frequency}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{m.instructions}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center">
            <ShieldAlert className="w-5 h-5 text-rose-600 mr-2" /> Alert History & Acknowledgement
          </h3>

          <div className="space-y-3">
            {patient.alerts?.map((al: any) => (
              <div key={al.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={al.severity} size="sm" />
                    <span className="font-bold text-slate-900 text-sm">{al.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{al.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">{new Date(al.createdAt).toLocaleString()}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {al.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleAcknowledgeAlert(al.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-700 transition"
                    >
                      Acknowledge
                    </button>
                  )}
                  {al.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleResolveAlert(al.id)}
                      className="px-3 py-1.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center">
            <Bot className="w-5 h-5 text-teal-600 mr-2" /> AI Bedside Assistant Voice History
          </h3>

          <div className="space-y-3">
            {patient.voiceInteractions?.map((v: any) => (
              <div key={v.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700">Patient Transcript:</span>
                  <p className="text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 mt-1">"{v.transcript}"</p>
                </div>
                <div>
                  <span className="font-bold text-teal-700">SmartCare+ AI Reply:</span>
                  <p className="text-slate-800 bg-teal-50 p-2.5 rounded-lg border border-teal-100 mt-1">"{v.aiResponse}"</p>
                </div>
                <span className="text-[10px] text-slate-400 block text-right">{new Date(v.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center">
            <FileText className="w-5 h-5 text-teal-600 mr-2" /> Clinical Observations & Physician Notes
          </h3>

          {/* Add Note Form */}
          <form onSubmit={handleAddClinicalNote} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <textarea
              rows={3}
              required
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Type clinical progress note, diagnosis observations, or medication adjustment instructions..."
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 transition outline-none"
            />
            <div className="text-right">
              <button
                type="submit"
                disabled={isSubmittingNote || !newNote.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Clinical Note
              </button>
            </div>
          </form>

          {/* Previous Notes List */}
          <div className="space-y-3">
            {patient.clinicalNotes?.map((cn: any) => (
              <div key={cn.id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span className="font-bold text-slate-800">
                    Dr. {cn.doctor?.user?.firstName} {cn.doctor?.user?.lastName}
                  </span>
                  <span>{new Date(cn.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed">{cn.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <DisclaimerFooter />
    </div>
  );
};
