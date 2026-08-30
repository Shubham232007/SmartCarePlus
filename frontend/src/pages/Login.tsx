import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, UserCheck, Shield, Heart, Info, Sparkles } from 'lucide-react';
import { ProjectOverviewModal } from '../components/common/ProjectOverviewModal';

export const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('patient@smartcare.local');
  const [password, setPassword] = useState<string>('Patient@123456');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      // Role redirection will happen automatically via router guards or based on email
    } else {
      setError(res.message || 'Invalid email or password.');
    }
  };

  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl" />

      {/* Top Header Floating Navigation Bar */}
      <div className="absolute top-6 left-0 right-0 px-6 max-w-7xl mx-auto flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-teal-400" />
          <span className="text-sm font-bold text-white tracking-wider">SMARTCARE+</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOverviewOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold transition shadow-lg backdrop-blur-md"
        >
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>Project Overview</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-teal-500/30 mb-4">
          <Activity className="w-10 h-10 animate-pulse" />
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">SMARTCARE+</h1>
        <p className="mt-1 text-sm text-teal-300 font-medium">Intelligent IoT Bedside Healthcare Assistant</p>

        {/* Prominent Overview Trigger Sub-Banner */}
        <button
          type="button"
          onClick={() => setIsOverviewOpen(true)}
          className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/70 hover:bg-teal-900/80 text-teal-300 border border-teal-800/80 text-xs font-semibold transition"
        >
          <Info className="w-3.5 h-3.5 text-teal-400" />
          <span>New to SmartCare+? Read Total Project Overview</span>
        </button>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
              <div className="mt-1.5 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition outline-none"
                  placeholder="name@smartcare.local"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
              <div className="mt-1.5 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white transition outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-500/25 transition flex items-center justify-center"
            >
              {isLoading ? (
                <span className="inline-flex items-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Authenticating...
                </span>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Demo Login Accounts</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('patient@smartcare.local', 'Patient@123456')}
                className="py-2 px-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 transition flex flex-col items-center"
              >
                <Heart className="w-4 h-4 text-rose-500 mb-1" />
                <span>Patient</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('dr.smith@smartcare.local', 'Doctor@123456')}
                className="py-2 px-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 transition flex flex-col items-center"
              >
                <UserCheck className="w-4 h-4 text-teal-600 mb-1" />
                <span>Doctor</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin@smartcare.local', 'Admin@123456')}
                className="py-2 px-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 transition flex flex-col items-center"
              >
                <Shield className="w-4 h-4 text-indigo-600 mb-1" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Overview Modal */}
      <ProjectOverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        onSelectDemo={handleQuickDemo}
      />
    </div>
  );
};

