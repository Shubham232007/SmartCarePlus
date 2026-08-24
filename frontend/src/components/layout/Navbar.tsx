import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Activity, ShieldAlert, Bot, LogOut, Bell, Wifi, User as UserIcon } from 'lucide-react';
import { SOSModal } from '../emergency/SOSModal';
import { AIVoiceModal } from '../ai/AIVoiceModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, latestAlert } = useSocket();
  const [isSOSOpen, setIsSOSOpen] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-xs">
        {/* Left Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center shadow-md shadow-teal-500/20 text-white font-black text-xl">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight text-slate-900">SMARTCARE+</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase tracking-wider">
                {user?.role}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Intelligent Bedside Healthcare Assistant</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Socket Connectivity */}
          <div
            className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span>{isConnected ? 'IoT Socket Live' : 'Connecting...'}</span>
          </div>

          {/* AI Voice Assistant Trigger */}
          <button
            onClick={() => setIsAIOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-xs flex items-center space-x-1.5 border border-teal-200 transition"
          >
            <Bot className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">AI Voice</span>
          </button>

          {/* Emergency SOS Button */}
          <button
            onClick={() => setIsSOSOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-rose-200 transition animate-pulse"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>SOS EMERGENCY</span>
          </button>

          {/* User Profile & Logout */}
          <div className="pl-2 border-l border-slate-200 flex items-center space-x-3">
            <div className="hidden lg:block text-right text-xs">
              <p className="font-bold text-slate-800">{user?.firstName} {user?.lastName}</p>
              <p className="text-slate-400 font-mono text-[10px]">{user?.humanPatientId || user?.humanDoctorId || user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* SOS & AI Modals */}
      <SOSModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} patientId={user?.patientId} />
      <AIVoiceModal isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} patientId={user?.patientId} />
    </>
  );
};
