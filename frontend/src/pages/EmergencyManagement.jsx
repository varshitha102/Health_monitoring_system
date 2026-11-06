import React, { useCallback, useEffect, useState } from 'react';
import {
  Phone,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import ContactManager from '../components/ContactManager';
import NotificationHistory from '../components/NotificationHistory';
import { notificationsAPI } from '../services/api';

const STAT_CARDS = [
  { key: 'total', label: 'Total Notifications', Icon: Phone, color: 'text-slate-800', bg: 'bg-slate-100', iconColor: 'text-slate-600' },
  { key: 'sent', label: 'Successful', Icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', iconColor: 'text-green-600' },
  { key: 'pending', label: 'Pending', Icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { key: 'failed', label: 'Failed', Icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', iconColor: 'text-red-600' },
];

const EmergencyManagement = () => {
  const [stats, setStats] = useState({ total: 0, sent: 0, pending: 0, failed: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await notificationsAPI.getAll({ limit: 1000 });
      const list = Array.isArray(response.data) ? response.data : [];

      setStats({
        total: list.length,
        sent: list.filter((n) => n.delivery_status === 'SENT').length,
        pending: list.filter(
          (n) => n.delivery_status === 'SENDING' || n.delivery_status === 'CREATING',
        ).length,
        failed: list.filter((n) => n.delivery_status === 'FAILED').length,
      });
      setStatsError('');
    } catch (err) {
      // Previously this only hit console.error, so the dashboard silently showed 0/0/0/0
      // and looked "broken" whenever the backend was down.
      setStatsError(err.friendlyMessage || 'Could not load notification statistics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Emergency Management</h2>
              <p className="text-slate-500 text-sm">
                Manage emergency contacts and monitor automated health alert notifications
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchStats}
            disabled={statsLoading}
            className="bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            {statsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {statsError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          {statsError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, Icon, color, bg, iconColor }) => (
          <div key={key} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{label}</p>
                <p className={`text-3xl font-bold tabular-nums ${color}`}>
                  {statsLoading ? '—' : stats[key]}
                </p>
              </div>
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contact Manager */}
      <ContactManager />

      {/* Notification History */}
      <NotificationHistory />
    </div>
  );
};

export default EmergencyManagement;
