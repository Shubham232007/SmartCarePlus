import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, PhoneCall, CheckCircle } from 'lucide-react';
import api from '../../services/api';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  deviceId?: string;
}

export const SOSModal: React.FC<SOSModalProps> = ({ isOpen, onClose, patientId, deviceId }) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTriggered, setIsTriggered] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmSOS = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/emergency/sos', {
        patientId,
        deviceId,
        triggerType: 'SOS_BUTTON',
        description: 'High priority Web Dashboard SOS emergency call activated',
      });

      if (res.data.success) {
        setIsTriggered(true);
      } else {
        setError(res.data.message || 'Failed to dispatch SOS signal.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error connecting to emergency server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 relative overflow-hidden">
        {/* Top Emergency Strip */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-rose-500 via-red-600 to-rose-500 animate-pulse" />

        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        {!isTriggered ? (
          <div className="text-center pt-2">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-ring">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-black text-slate-900">Trigger Emergency SOS?</h2>
            <p className="text-sm text-slate-600 mt-2">
              This will immediately send a <span className="font-bold text-rose-600">CRITICAL ALERT</span> to attending doctors, nursing stations, and on-duty medical staff.
            </p>

            {error && <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>}

            <div className="mt-6 flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSOS}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-200 flex items-center justify-center transition"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </span>
                ) : (
                  'CONFIRM SOS'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center pt-2 py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-black text-emerald-700">Emergency SOS Active!</h2>
            <p className="text-sm text-slate-600 mt-2">
              Hospital nursing desk and primary physicians have been alerted via Socket.IO real-time channels. Timestamp logged at {new Date().toLocaleTimeString()}.
            </p>

            <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center space-x-2 text-xs font-semibold text-emerald-800">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>Medical team responding to room telemetry.</span>
            </div>

            <button onClick={onClose} className="mt-6 w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition">
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
