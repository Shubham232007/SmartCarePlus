import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, Shield } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { AuditLog } from '../types';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        if (res.data.success) setLogs(res.data.logs);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Shield className="w-5 h-5 text-indigo-600 mr-2" /> Security Audit Log Trail
          </h1>
          <p className="text-xs text-slate-500">Immutable security event logging for compliance and RBAC tracking</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Audit Events ({logs.length})</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 text-slate-500">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-indigo-700">{l.action}</td>
                  <td className="py-3 px-4 text-slate-800">
                    {l.user ? `${l.user.email} (${l.user.role})` : 'SYSTEM'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{l.entityType}</td>
                  <td className="py-3 px-4 text-slate-500">{l.entityId || '--'}</td>
                  <td className="py-3 px-4 text-slate-400">{l.ipAddress}</td>
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
