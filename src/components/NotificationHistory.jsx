import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  RefreshCw,
  Loader2,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { notificationsAPI } from '../services/api';

const getStatusConfig = (status) => {
  switch (status) {
    case 'SENT':
      return { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-800' };
    case 'SENDING':
      return { icon: Clock, bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'FAILED':
      return { icon: XCircle, bg: 'bg-red-100', text: 'text-red-800' };
    case 'CREATING':
      return { icon: Loader2, bg: 'bg-amber-100', text: 'text-amber-800' };
    default:
      return { icon: Clock, bg: 'bg-slate-100', text: 'text-slate-800' };
  }
};

const getAlertLevelConfig = (level) =>
  level === 'CRITICAL'
    ? { icon: AlertTriangle, bg: 'bg-red-100', text: 'text-red-800' }
    : { icon: AlertTriangle, bg: 'bg-amber-100', text: 'text-amber-800' };

const NotificationHistory = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [fetchError, setFetchError] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsAPI.getAll({ limit: 20 });
      setNotifications(Array.isArray(response.data) ? response.data : []);
      setFetchError('');
    } catch (err) {
      setFetchError(err.friendlyMessage || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    if (!autoRefresh) return undefined;
    // Only poll while the tab is visible — the old version kept hammering the API
    // every 5s even in a background tab.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchNotifications]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Notification History</h2>
            <p className="text-sm text-slate-500">SMS alert delivery tracking</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchNotifications}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              autoRefresh
                ? 'bg-[#1F06AC] hover:bg-[#0F42C0] text-white shadow-md'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-Refresh' : 'Manual'}
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-4 text-sm">
          {fetchError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No notifications sent yet</p>
          <p className="text-sm text-slate-400 mt-1">Trigger an alert to see history here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const statusConfig = getStatusConfig(notification.delivery_status);
            const alertConfig = getAlertLevelConfig(notification.alert_level);
            const StatusIcon = statusConfig.icon;
            const AlertIcon = alertConfig.icon;
            const isExpanded = expandedId === notification.id;
            const hasLocation = Number(notification.location_available) === 1;

            return (
              <div
                key={notification.id}
                className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 ${alertConfig.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        {/* BUG FIX: this was className="w-5 h-5 ${alertConfig.text}" —
                            a literal string, so the icon had no colour. */}
                        <AlertIcon className={`w-5 h-5 ${alertConfig.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {notification.alert_level ?? 'UNKNOWN'}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <StatusIcon
                              className={`w-3 h-3 ${notification.delivery_status === 'CREATING' ? 'animate-spin' : ''}`}
                            />
                            {notification.delivery_status ?? 'UNKNOWN'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 truncate">
                          Patient ID: {notification.patient_id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                      aria-label={isExpanded ? 'Hide details' : 'Show details'}
                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Eye
                        className={`w-4 h-4 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-3">
                    <span className="font-medium">To: {notification.recipient_phone ?? '—'}</span>
                    <span className="text-slate-300">•</span>
                    <span>
                      {notification.created_at
                        ? new Date(notification.created_at).toLocaleString()
                        : '—'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                          {notification.message_content || 'No message content'}
                        </p>
                      </div>

                      {hasLocation && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-semibold text-blue-800">Location Snapshot</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-blue-600 text-xs">Latitude</p>
                              <p className="font-semibold text-slate-800">
                                {typeof notification.location_latitude === 'number'
                                  ? notification.location_latitude.toFixed(6)
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600 text-xs">Longitude</p>
                              <p className="font-semibold text-slate-800">
                                {typeof notification.location_longitude === 'number'
                                  ? notification.location_longitude.toFixed(6)
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600 text-xs">Accuracy</p>
                              <p className="font-semibold text-slate-800">
                                {typeof notification.location_accuracy === 'number'
                                  ? `${Math.round(notification.location_accuracy)}m`
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600 text-xs">Timestamp</p>
                              <p className="font-semibold text-slate-800 text-xs">
                                {notification.location_timestamp
                                  ? new Date(notification.location_timestamp).toLocaleTimeString()
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                          {typeof notification.location_latitude === 'number' &&
                            typeof notification.location_longitude === 'number' && (
                              <a
                                href={`https://www.google.com/maps?q=${notification.location_latitude},${notification.location_longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-3 text-sm text-[#1F06AC] hover:text-[#0F42C0] font-semibold"
                              >
                                <MapPin className="w-4 h-4" />
                                Open in Google Maps
                              </a>
                            )}
                        </div>
                      )}

                      {Number(notification.location_available) === 0 && (
                        <div className="bg-slate-100 p-4 rounded-xl">
                          <p className="text-sm text-slate-600 italic">
                            Location was unavailable at time of alert
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        {notification.twilio_message_sid ? (
                          <span className="break-all">SID: {notification.twilio_message_sid}</span>
                        ) : (
                          <span />
                        )}
                        {notification.updated_at && (
                          <span>Updated: {new Date(notification.updated_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationHistory;
