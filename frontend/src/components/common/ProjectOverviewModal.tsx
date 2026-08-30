import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Cpu,
  Bot,
  Users,
  Layers,
  Heart,
  Shield,
  Radio,
  FileText,
  CheckCircle2,
  Sparkles,
  Server,
  Zap,
  UserCheck
} from 'lucide-react';

interface ProjectOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDemo?: (email: string, pass: string) => void;
}

type TabType = 'overview' | 'architecture' | 'ai' | 'roles' | 'tech' | 'demo';

export const ProjectOverviewModal: React.FC<ProjectOverviewModalProps> = ({
  isOpen,
  onClose,
  onSelectDemo
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md transition-opacity duration-300">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">SMARTCARE+</h2>
                <span className="px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-teal-400 bg-teal-950/80 border border-teal-800/60 rounded-full uppercase">
                  Project Overview
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Intelligent IoT Bedside Assistant & Voice AI Healthcare System
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b border-slate-800/60 bg-slate-900/50 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Sparkles },
            { id: 'architecture', label: 'IoT & Hardware', icon: Cpu },
            { id: 'ai', label: 'Voice AI Engine', icon: Bot },
            { id: 'roles', label: 'Portals & Dashboards', icon: Users },
            { id: 'tech', label: 'Tech Stack', icon: Layers },
            { id: 'demo', label: 'Demo Credentials', icon: Shield }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300 custom-scrollbar">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-950/40 via-slate-900 to-sky-950/30 border border-teal-800/30">
                <h3 className="text-base font-bold text-teal-300 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  What is SmartCare+?
                </h3>
                <p className="leading-relaxed text-slate-300">
                  <strong className="text-white">SmartCare+</strong> is an end-to-end, production-style IoT & AI bedside healthcare platform designed for continuous patient vital sign tracking, real-time threshold alert evaluation, medicine adherence logging, emergency SOS triggers, and intelligent AI voice interactions for bedside hospital care.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold mb-1.5">
                    <Heart className="w-4 h-4 text-rose-400" /> Continuous Vital Tracking
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Monitors Heart Rate (BPM), SpO2 (Blood Oxygen %), and Body Temperature in real-time with automated threshold alerts for critical events.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold mb-1.5">
                    <Bot className="w-4 h-4 text-sky-400" /> Bedside AI Voice Assistant
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Patients can ask about their latest vitals, medication schedules, or trigger instant nurse-call assistance via voice commands.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold mb-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" /> Real-time Alerting & Emergency SOS
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Hardware physical SOS button or digital triggers immediately broadcast urgent alerts to assigned doctors and system administrators.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold mb-1.5">
                    <Users className="w-4 h-4 text-amber-400" /> Role-Based Control (RBAC)
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tailored portals for Patients, Doctors, and System Admins with strict JWT-authenticated data access and audit logging.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Key System Highlights</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" /> Real-time Socket.IO event broadcasting
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" /> Interactive Recharts with 1h - 30d filters
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" /> Speech-to-Text & Text-to-Speech audio loop
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" /> Hardware ESP32 firmware integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" /> Device Key authentication middleware
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" /> Full Audit Logging & System Security
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: ARCHITECTURE & HARDWARE */}
          {activeTab === 'architecture' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-teal-400" /> ESP32 Bedside Hardware Architecture
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  The bedside prototype utilizes an ESP32 DevKit micro-controller with specialized healthcare sensors and I2S audio hardware:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-teal-300">MAX30100 Oximeter:</span> Measures Heart Rate (BPM) & SpO2 blood oxygen levels via I2C (SDA 21, SCL 22).
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-teal-300">MLX90614 IR Temp:</span> Non-contact infrared temperature sensing for accurate skin/body temperature.
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-teal-300">INMP441 Microphone:</span> I2S MEMS omnidirectional microphone for capturing patient voice queries.
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-teal-300">MAX98357A Amp + Speaker:</span> 3W Class-D I2S amplifier for high-clarity voice output.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-sky-400" /> Telemetry Ingestion Pipeline
                </h3>
                <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-teal-300 overflow-x-auto border border-slate-800">
                  <p className="text-slate-400">// HTTP Telemetry Ingestion API (ESP32 → Backend)</p>
                  <p className="text-emerald-400">POST /api/iot/readings</p>
                  <p className="text-slate-300">Header: X-Device-Key: device_secret_PAT1001</p>
                  <pre className="text-sky-300 mt-2">
{`{
  "deviceId": "SC-ESP32-001",
  "patientId": "PAT-1001",
  "heartRate": 78.5,
  "spo2": 98.0,
  "temperature": 36.7,
  "timestamp": "2026-08-30T12:00:00Z"
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VOICE AI */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/50 via-slate-900 to-indigo-950/40 border border-sky-800/40">
                <h3 className="text-base font-bold text-sky-300 mb-2 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-sky-400" /> Conversational AI Voice Assistant
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SmartCare+ incorporates a dedicated Flask AI server powered by LLM clinical context enrichment. The assistant acts as an interactive bedside companion for hospitalized patients.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Example Voice Prompts & Capability Matrix</h4>
                
                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">"What is my current heart rate?"</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Queries latest database telemetry and responds: <em>"Your latest recorded heart rate is 78.5 BPM, which is within the normal healthy range."</em>
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">"When is my next medicine due?"</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Retrieves active patient medication schedules from Prisma DB and speaks: <em>"Your next dose of Metoprolol (50mg) is scheduled for 2:00 PM."</em>
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">"I need help, call a nurse!"</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Triggers Nurse Call intent, immediately broadcasts a high-priority emergency alert over Socket.IO to attending doctors, and provides verbal reassurance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ROLES */}
          {activeTab === 'roles' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Patient Portal */}
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-teal-500/40 transition">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Patient Portal</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    View real-time vital graphs, medication schedules, interactive AI voice assistant, bedside IoT device status, and emergency SOS button.
                  </p>
                </div>

                {/* Doctor Portal */}
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-teal-500/40 transition">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-3">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Doctor Dashboard</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Monitor assigned patients, real-time alert notifications, review vital trends, add clinical notes, and manage patient treatment plans.
                  </p>
                </div>

                {/* Admin Portal */}
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-teal-500/40 transition">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Admin Console</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Manage system users, register IoT ESP32 hardware devices, configure alert thresholds (min/max BPM, SpO2, temp), and view security audit logs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TECH STACK */}
          {activeTab === 'tech' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                  <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Frontend Technologies
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    <li>• React 18 + TypeScript + Vite</li>
                    <li>• Tailwind CSS + Glassmorphism UX</li>
                    <li>• Recharts Data Visualization</li>
                    <li>• Socket.IO Client for Live Events</li>
                    <li>• Lucide React Icons</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4" /> Backend & Database
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    <li>• Node.js + Express.js API Engine</li>
                    <li>• PostgreSQL / SQLite + Prisma ORM</li>
                    <li>• JWT Auth & RBAC Middleware</li>
                    <li>• Socket.IO Server (Room Isolation)</li>
                    <li>• Flask AI Voice Bridge (Python)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DEMO CREDENTIALS */}
          {activeTab === 'demo' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-800/40 text-xs text-slate-300">
                Click any role below to pre-fill the login credentials on the sign-in form!
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => {
                    if (onSelectDemo) onSelectDemo('patient@smartcare.local', 'Patient@123456');
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-rose-500/60 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-400">PATIENT</span>
                    <Heart className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xs font-semibold text-white">Rahul Sharma</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">patient@smartcare.local</p>
                  <p className="text-[10px] text-slate-500 mt-2">Pass: Patient@123456</p>
                </div>

                <div
                  onClick={() => {
                    if (onSelectDemo) onSelectDemo('dr.smith@smartcare.local', 'Doctor@123456');
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-teal-500/60 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-teal-400">DOCTOR</span>
                    <UserCheck className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xs font-semibold text-white">Dr. Alexander Smith</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">dr.smith@smartcare.local</p>
                  <p className="text-[10px] text-slate-500 mt-2">Pass: Doctor@123456</p>
                </div>

                <div
                  onClick={() => {
                    if (onSelectDemo) onSelectDemo('admin@smartcare.local', 'Admin@123456');
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-indigo-500/60 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-400">ADMIN</span>
                    <Shield className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xs font-semibold text-white">System Administrator</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">admin@smartcare.local</p>
                  <p className="text-[10px] text-slate-500 mt-2">Pass: Admin@123456</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">SmartCare+ Healthcare System v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
