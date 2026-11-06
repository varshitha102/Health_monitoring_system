import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, AlertTriangle, HeartPulse, Settings as SettingsIcon, Menu, X, Bell, Clock } from 'lucide-react';
import ScenarioMonitoring from './pages/ScenarioMonitoring';
import EmergencyManagement from './pages/EmergencyManagement';
import PatientPrediction from './pages/PatientPrediction';
import Settings from './pages/Settings';
import { usePatientSettings } from './hooks/usePatientSettings';

function App() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  // Shared, live-updating patient profile (was read once from localStorage).
  const { settings: patientSettings } = usePatientSettings();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { path: '/', label: 'Scenario Monitoring', icon: Activity },
    { path: '/emergency', label: 'Emergency Management', icon: AlertTriangle },
    { path: '/prediction', label: 'Patient Prediction', icon: HeartPulse },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const getPageTitle = () => {
    const item = navItems.find((i) => i.path === location.pathname);
    return item ? item.label : 'Health Monitoring System';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-[#1F06AC] to-[#0F42C0] text-white transition-all duration-300 ease-in-out z-50 overflow-y-auto ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E3EF4F] rounded-lg flex items-center justify-center flex-shrink-0">
              <HeartPulse className="w-6 h-6 text-[#1F06AC]" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-bold text-lg leading-tight">HEALTH</h1>
                <p className="text-xs text-white/70">MONITORING</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#E3EF4F] text-[#1F06AC] shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="absolute bottom-6 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Topbar */}
        <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Breadcrumb */}
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-slate-800 truncate">{getPageTitle()}</h2>
                <p className="text-sm text-slate-500 mt-1 truncate">
                  Real-time health monitoring and emergency alert system
                </p>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-6 flex-shrink-0">
                {/* Time */}
                <div className="hidden md:flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium tabular-nums">
                    {currentTime.toLocaleTimeString()}
                  </span>
                </div>

                {/* Notification */}
                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative p-2 text-slate-600 hover:text-[#1F06AC] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Patient Profile */}
                <Link
                  to="/settings"
                  className="flex items-center gap-3 pl-6 border-l border-slate-200 hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {patientSettings.patientName ? patientSettings.patientName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="hidden md:block min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate max-w-[160px]">
                      {patientSettings.patientName || 'Not Configured'}
                    </p>
                    <p className="text-xs text-slate-500">ID: {patientSettings.patientId}</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Routes>
            <Route path="/" element={<ScenarioMonitoring />} />
            <Route path="/emergency" element={<EmergencyManagement />} />
            <Route path="/prediction" element={<PatientPrediction />} />
            <Route path="/settings" element={<Settings />} />
            {/* Unknown URL fallback — previously a blank page with a 404-looking shell. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-8">
          <div className="px-6 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-600">Health Monitoring System - Academic Project</p>
              <p className="text-xs text-slate-500 text-center md:text-right">
                Isolation Forest Anomaly Detection + Rule-Based Classification + Twilio SMS
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
      <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-slate-800 mb-2">Page not found</h3>
      <p className="text-slate-500 mb-6">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="inline-block bg-[#1F06AC] hover:bg-[#0F42C0] text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-md"
      >
        Back to Scenario Monitoring
      </Link>
    </div>
  );
}

export default App;
