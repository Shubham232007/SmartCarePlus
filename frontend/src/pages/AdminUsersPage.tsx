import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { Users, UserPlus, Link as LinkIcon, CheckCircle } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  const fetchUsersData = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.users);
        const docs = res.data.users.filter((u: any) => u.role === 'DOCTOR' && u.doctor);
        const pats = res.data.users.filter((u: any) => u.role === 'PATIENT' && u.patient);
        setDoctors(docs);
        setPatients(pats);

        if (docs.length > 0) setSelectedDoctor(docs[0].doctor.doctorId);
        if (pats.length > 0) setSelectedPatient(pats[0].patient.patientId);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  const handleAssignDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedPatient) return;
    try {
      const res = await api.post('/admin/assign-doctor', {
        doctorId: selectedDoctor,
        patientId: selectedPatient,
      });

      if (res.data.success) {
        setMessage('Doctor assigned to patient successfully.');
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Assignment failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Users className="w-5 h-5 text-teal-600 mr-2" /> User & Assignment Management
          </h1>
          <p className="text-xs text-slate-500">Manage platform users, clinical doctors, and patient assignments</p>
        </div>
      </div>

      {/* Assign Doctor to Patient Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center">
          <LinkIcon className="w-4 h-4 text-teal-600 mr-2" /> Assign Doctor to Patient
        </h2>

        <form onSubmit={handleAssignDoctor} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Doctor</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 transition outline-none"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.doctor.doctorId}>
                  Dr. {d.firstName} {d.lastName} ({d.doctor.doctorId} - {d.doctor.specialization})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient</label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 transition outline-none"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.patient.patientId}>
                  {p.firstName} {p.lastName} ({p.patient.patientId})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Confirm Assignment
          </button>
        </form>

        {message && (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium rounded-xl flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-teal-600" />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Platform Users Directory ({users.length})</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{u.firstName} {u.lastName}</td>
                  <td className="py-3 px-4 text-slate-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : u.role === 'DOCTOR' ? 'bg-teal-100 text-teal-800' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">
                    {u.patient?.patientId || u.doctor?.doctorId || 'ADMIN-ROOT'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={u.isActive ? 'NORMAL' : 'OFFLINE'} size="sm" />
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
