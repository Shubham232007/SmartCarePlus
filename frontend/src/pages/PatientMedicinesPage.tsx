import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Pill, Check, Clock } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { Medicine } from '../types';

export const PatientMedicinesPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const fetchMedicines = async () => {
    try {
      const res = await api.get('/medicines');
      if (res.data.success) setMedicines(res.data.medicines);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleConfirm = async (logId: string, status: 'TAKEN' | 'SKIPPED') => {
    try {
      await api.post(`/medicines/logs/${logId}/confirm`, { status });
      fetchMedicines();
    } catch (err) {
      console.error('Failed to confirm medicine:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center">
          <Pill className="w-5 h-5 text-teal-600 mr-2" /> My Prescription Schedule & Adherence
        </h1>
        <p className="text-xs text-slate-500">Track and confirm daily bedside medication doses</p>
      </div>

      <div className="space-y-4">
        {medicines.map((m) => {
          const pendingLog = m.logs?.find((l) => l.status === 'PENDING');
          const takenLog = m.logs?.find((l) => l.status === 'TAKEN');

          return (
            <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-base">{m.name}</span>
                  <span className="px-2 py-0.5 bg-teal-50 text-teal-700 font-bold text-xs rounded-lg">{m.dosage}</span>
                </div>
                <p className="text-xs text-slate-600">{m.frequency} • {m.instructions}</p>
                <span className="text-[10px] text-slate-400 block">Prescribed Period: {new Date(m.startDate).toLocaleDateString()} onwards</span>
              </div>

              <div className="flex items-center space-x-2">
                {takenLog ? (
                  <span className="px-4 py-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl inline-flex items-center">
                    <Check className="w-4 h-4 mr-1.5" /> Taken at {new Date(takenLog.takenAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : pendingLog ? (
                  <>
                    <button
                      onClick={() => handleConfirm(pendingLog.id, 'TAKEN')}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      Confirm Taken
                    </button>
                    <button
                      onClick={() => handleConfirm(pendingLog.id, 'SKIPPED')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                    >
                      Skip
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-500 font-medium text-xs rounded-xl">All doses logged</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DisclaimerFooter />
    </div>
  );
};
