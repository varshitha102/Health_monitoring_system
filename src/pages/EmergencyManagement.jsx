import React, { useCallback, useEffect, useState } from 'react';
import {
  Phone,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
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
  const [twilioExpanded, setTwilioExpanded] = useState(true);

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

      {/* Twilio Configuration */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setTwilioExpanded((v) => !v)}
          aria-expanded={twilioExpanded}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-amber-100/50 transition-colors"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Twilio SMS Delivery Setup</h3>
              <p className="text-sm text-amber-700">Configure your Twilio account for SMS notifications</p>
            </div>
          </div>
          {twilioExpanded ? (
            <ChevronUp className="w-5 h-5 text-amber-700 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-amber-700 flex-shrink-0" />
          )}
        </button>

        {twilioExpanded && (
          <div className="px-6 pb-6">
            <div className="mt-4 bg-white/60 rounded-xl p-4">
              <p className="text-sm text-amber-800 mb-3 font-semibold">
                To receive actual SMS messages, verify your phone number in Twilio:
              </p>
              <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.twilio.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900 font-medium"
                  >
                    console.twilio.com
                  </a>
                </li>
                <li>Navigate to &quot;Phone Numbers&quot; → &quot;Verified Caller IDs&quot;</li>
                <li>Click &quot;Add Verified Caller ID&quot;</li>
                <li>Enter your phone number in E.164 format (e.g. +919876543210)</li>
                <li>Enter the verification code sent to your phone</li>
                <li>After verification, SMS will be delivered to your number</li>
              </ol>
              <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> Twilio trial accounts can only send SMS to verified numbers.
                  Upgrade to remove this restriction.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact Manager */}
      <ContactManager />

      {/* Notification History */}
      <NotificationHistory />
    </div>
  );
};

export default EmergencyManagement;
