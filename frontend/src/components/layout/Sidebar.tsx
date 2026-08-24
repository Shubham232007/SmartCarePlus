import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Heart,
  TrendingUp,
  Pill,
  Bot,
  Bell,
  ShieldAlert,
  HardDrive,
  User,
  Users,
  FileText,
  Settings,
  Activity,
  Sliders,
  LogOut,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const role = user?.role || 'PATIENT';

  const patientLinks = [
    { to: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patient/health', label: 'My Health', icon: Heart },
    { to: '/patient/history', label: 'Health History', icon: TrendingUp },
    { to: '/patient/medicines', label: 'Medicines', icon: Pill },
    { to: '/patient/ai', label: 'AI Assistant', icon: Bot },
    { to: '/patient/alerts', label: 'Alerts', icon: Bell },
    { to: '/patient/emergency', label: 'Emergency', icon: ShieldAlert },
    { to: '/patient/device', label: 'Bedside Device', icon: HardDrive },
  ];

  const doctorLinks = [
    { to: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/doctor/patients', label: 'Assigned Patients', icon: Users },
    { to: '/doctor/alerts', label: 'Real-time Alerts', icon: Bell },
    { to: '/doctor/notes', label: 'Clinical Notes', icon: FileText },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users & Doctors', icon: Users },
    { to: '/admin/devices', label: 'IoT Registry', icon: HardDrive },
    { to: '/admin/thresholds', label: 'Alert Thresholds', icon: Sliders },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  ];

  const links = role === 'PATIENT' ? patientLinks : role === 'DOCTOR' ? doctorLinks : adminLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 shrink-0 hidden md:flex flex-col justify-between p-4 min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        {/* Role Badge Section */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-sm uppercase">
            {role.substring(0, 2)}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-slate-400 font-medium capitalize">{role.toLowerCase()} Account</p>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-500/20'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile Button */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-xs text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
