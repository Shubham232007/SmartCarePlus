import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, Plus, CheckCircle } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';

export const DoctorNotesPage: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [notesList, setNotesList] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/doctors/patients');
      if (res.data.success && res.data.patients.length > 0) {
        setPatients(res.data.patients);
        setSelectedPatientId(res.data.patients[0].patientId);
      }
    } catch (err) {
      console.error('Failed to load doctor patients:', err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const fetchNotes = async () => {
      if (!selectedPatientId) return;
      try {
        const res = await api.get(`/patients/${selectedPatientId}/notes`);
        if (res.data.success) setNotesList(res.data.notes);
      } catch (err) {
        console.error('Failed to load notes:', err);
      }
    };
    fetchNotes();
  }, [selectedPatientId]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !note.trim()) return;

    try {
      const res = await api.post(`/patients/${selectedPatientId}/notes`, { note });
      if (res.data.success) {
        setNote('');
        setMessage('Clinical note added.');
        setTimeout(() => setMessage(null), 3000);
        // Refresh notes list
        const updated = await api.get(`/patients/${selectedPatientId}/notes`);
        if (updated.data.success) setNotesList(updated.data.notes);
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <FileText className="w-5 h-5 text-teal-600 mr-2" /> Clinical Observations & Notes
          </h1>
          <p className="text-xs text-slate-500">Record clinical progress notes and medical instructions for assigned patients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Selection & New Note Form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center">
            <Plus className="w-4 h-4 text-teal-600 mr-2" /> Add Clinical Note
          </h2>

          <form onSubmit={handleCreateNote} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 transition outline-none"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.patientId}>
                    {p.name} ({p.patientId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Note</label>
              <textarea
                rows={5}
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type physician notes, treatment progress, or care plan changes..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white transition outline-none"
              />
            </div>

            {message && (
              <div className="p-2.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium rounded-xl flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Save Clinical Note
            </button>
          </form>
        </div>

        {/* Existing Notes List */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800">
            Previous Clinical Notes for Patient {selectedPatientId} ({notesList.length})
          </h2>

          <div className="space-y-3">
            {notesList.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No clinical notes recorded for this patient.</p>
            ) : (
              notesList.map((cn) => (
                <div key={cn.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-medium">
                    <span className="font-bold text-slate-900">Dr. {cn.doctor?.user?.firstName} {cn.doctor?.user?.lastName}</span>
                    <span>{new Date(cn.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed pt-1">{cn.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
