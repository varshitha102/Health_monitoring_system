import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Wifi, WifiOff, Loader2, RotateCcw, Pause } from 'lucide-react';
import websocketService from '../services/websocket';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useLocation } from '../contexts/LocationContext.jsx';
import LocationMap from '../components/LocationMap';
import { usePatientSettings } from '../hooks/usePatientSettings';
import { WS_BASE_URL } from '../config';

const TOTAL_STEPS = 60;
const MAX_CHART_POINTS = 60;

const ScenarioMonitoring = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [streamError, setStreamError] = useState('');
  const [nameWarning, setNameWarning] = useState('');

  const totalSteps = TOTAL_STEPS;

  // Kept in refs so the socket callbacks always see fresh values.
  const unsubscribeRef = useRef(null);
  const streamRef = useRef(false);

  // Live patient profile — updates instantly when saved on the Settings page.
  const { settings } = usePatientSettings();
  const patientId = settings.patientId || 'P001';
  const patientName = settings.patientName || '';

  const {
    location,
    permissionStatus,
    isTracking: locationTracking,
    isSharing: locationSharing,
    error: locationError,
    getCurrentLocation,
    stopTracking,
    startLiveSharing,
    stopSharing,
    setPatientId: setLocationPatientId,
  } = useLocation();

  // Keep the tracker bound to the configured patient id.
  useEffect(() => {
    setLocationPatientId(patientId);
  }, [patientId, setLocationPatientId]);

  useEffect(() => {
    const off = websocketService.onStatus((status) => setConnectionStatus(status));
    return off;
  }, []);

  const detach = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    streamRef.current = false;
  }, []);

  const stopStreaming = useCallback(() => {
    detach();
    websocketService.disconnect();
    setIsStreaming(false);
  }, [detach]);

  const resetStream = useCallback(() => {
    detach();
    websocketService.reset();
    setIsStreaming(false);
    setHealthData(null);
    setChartData([]);
    setStreamingProgress(0);
    setCurrentScenario(null);
    setAlerts([]);
    setStreamError('');
  }, [detach]);

  const startStreaming = useCallback(
    (scenarioType) => {
      if (streamRef.current) return;

      if (!patientName.trim()) {
        setNameWarning(
          'Please enter a patient name in Settings before starting monitoring — it is used in emergency SMS alerts.',
        );
        return;
      }
      setNameWarning('');
      setStreamError('');

      // Always drop any previous listener first (this was the duplicate-data bug).
      detach();

      const wsUrl =
        `${WS_BASE_URL}/ws/monitor/${encodeURIComponent(patientId)}` +
        `?patient_name=${encodeURIComponent(patientName)}` +
        `&scenario=${scenarioType}&steps=${totalSteps}&interval=1.0&notifications=true`;

      setChartData([]);
      setAlerts([]);
      setHealthData(null);
      setStreamingProgress(0);
      setCurrentScenario(scenarioType);
      setIsStreaming(true);
      streamRef.current = true;

      unsubscribeRef.current = websocketService.subscribe((data) => {
        if (!data || typeof data !== 'object') return;

        if (data.type === 'alert_sent') {
          setAlerts((prev) => [...prev, data]);
          return;
        }
        if (data.type === 'error' || data.error) {
          setStreamError(data.error || data.message || 'Stream error from server');
          return;
        }

        setHealthData(data);

        // De-duplicate by step: a reconnect can replay the last frame and would
        // otherwise draw the same point twice.
        setChartData((prev) => {
          const point = {
            step: data.step,
            time: data.timestamp
              ? new Date(data.timestamp).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            temperature: data.temperature,
            heartRate: data.heart_rate,
            spo2: data.spo2,
          };
          const withoutDup = prev.filter((p) => p.step !== point.step);
          return [...withoutDup, point].slice(-MAX_CHART_POINTS);
        });

        if (typeof data.step === 'number') setStreamingProgress(data.step + 1);
        if (data.scenario_type) setCurrentScenario(data.scenario_type);

        if (typeof data.step === 'number' && data.step >= totalSteps - 1) {
          stopStreaming();
        }
      });

      websocketService.connect(wsUrl);
    },
    [detach, patientId, patientName, stopStreaming, totalSteps],
  );

  // Cleanup on unmount so navigating away does not leave a socket running.
  useEffect(
    () => () => {
      detach();
      websocketService.disconnect();
    },
    [detach],
  );

  const scenarios = [
    {
      type: 'NORMAL',
      name: 'Normal Patient',
      description: 'All readings within healthy ranges',
      emoji: '✅',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-700',
    },
    {
      type: 'WARNING',
      name: 'Warning Patient',
      description: 'Moderately elevated vital signs',
      emoji: '⚠️',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-700',
    },
    {
      type: 'CRITICAL',
      name: 'Critical Patient',
      description: 'Severely abnormal vital signs',
      emoji: '🚨',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-700',
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'NORMAL':
        return 'bg-green-100 text-green-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const borderForStatus = (status) =>
    status === 'CRITICAL'
      ? 'border-red-500'
      : status === 'WARNING'
        ? 'border-amber-500'
        : 'border-green-500';

  const dotForStatus = (status) =>
    status === 'CRITICAL'
      ? 'bg-red-500'
      : status === 'WARNING'
        ? 'bg-amber-500'
        : 'bg-green-500';

  const pct = Math.min(100, Math.round((streamingProgress / totalSteps) * 100));

  return (
    <div className="space-y-6">
      {/* Patient Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
              {patientName ? patientName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-slate-800 truncate">
                {patientName || 'Not Configured'}
              </h3>
              <p className="text-sm text-slate-500">Patient ID: {patientId}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    locationTracking ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {locationTracking ? '● Location Active' : '○ Location Inactive'}
                </span>
                {locationSharing && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#E3EF4F] text-[#1F06AC]">
                    ● Sharing Active
                  </span>
                )}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    connectionStatus === 'open'
                      ? 'bg-blue-100 text-blue-700'
                      : connectionStatus === 'connecting'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {connectionStatus === 'open' ? (
                    <Wifi className="w-3 h-3" />
                  ) : connectionStatus === 'connecting' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <WifiOff className="w-3 h-3" />
                  )}
                  {connectionStatus === 'open' ? 'Stream Connected' : 'Stream Idle'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {permissionStatus === 'denied' && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">Location denied</p>
            )}
            {!locationTracking ? (
              <button
                type="button"
                onClick={() => getCurrentLocation(patientId)}
                disabled={isStreaming}
                className="bg-[#1F06AC] hover:bg-[#0F42C0] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Start Location Session
              </button>
            ) : (
              <button
                type="button"
                onClick={stopTracking}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Stop Location Session
              </button>
            )}
            {!patientName && (
              <Link
                to="/settings"
                className="text-sm text-[#1F06AC] hover:text-[#0F42C0] font-semibold flex items-center gap-1"
              >
                Configure Profile →
              </Link>
            )}
          </div>
        </div>

        {locationError && (
          <p className="text-sm text-red-600 mt-3 bg-red-50 p-3 rounded-lg">{locationError}</p>
        )}
        {nameWarning && (
          <div className="text-sm text-amber-800 mt-3 bg-amber-50 border border-amber-200 p-3 rounded-lg flex flex-wrap items-center gap-2">
            <span className="flex-1">{nameWarning}</span>
            <Link to="/settings" className="font-semibold underline">
              Open Settings
            </Link>
          </div>
        )}
        {streamError && (
          <p className="text-sm text-red-600 mt-3 bg-red-50 p-3 rounded-lg">{streamError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Scenario Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Select Health Scenario</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.type}
                  type="button"
                  onClick={() => startStreaming(scenario.type)}
                  disabled={isStreaming}
                  className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                    currentScenario === scenario.type
                      ? `${scenario.bgColor} ${scenario.borderColor} ${scenario.textColor} shadow-lg scale-[1.02]`
                      : 'bg-white border-slate-200 hover:border-[#5882E8] hover:shadow-md text-slate-800'
                  } ${isStreaming ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-4xl mb-3">{scenario.emoji}</div>
                  <h3 className="font-bold text-lg">{scenario.name}</h3>
                  <p className="text-sm mt-2 opacity-80">{scenario.description}</p>
                </button>
              ))}
            </div>

            {isStreaming && (
              <div className="mt-6 flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <button
                  type="button"
                  onClick={stopStreaming}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  type="button"
                  onClick={resetStream}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1F06AC] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-600 tabular-nums">
                    {streamingProgress} / {totalSteps}
                  </span>
                </div>
              </div>
            )}

            {!isStreaming && (healthData || chartData.length > 0) && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={resetStream}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Results
                </button>
              </div>
            )}
          </div>

          {healthData && (
            <>
              {/* Health Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Temperature', value: `${healthData.temperature ?? '—'}°C` },
                  { label: 'Heart Rate', value: `${healthData.heart_rate ?? '—'} BPM` },
                  { label: 'SpO2', value: `${healthData.spo2 ?? '—'}%` },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className={`bg-white rounded-2xl shadow-sm border-2 p-6 ${borderForStatus(
                      healthData.health_status,
                    )}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-600">{metric.label}</h3>
                      <span
                        className={`w-3 h-3 rounded-full ${dotForStatus(healthData.health_status)}`}
                      />
                    </div>
                    <p className="text-4xl font-bold text-slate-800 tabular-nums">{metric.value}</p>
                    <span
                      className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        healthData.health_status,
                      )}`}
                    >
                      {healthData.health_status ?? 'UNKNOWN'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Real-Time Health Monitoring</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { key: 'temperature', label: 'Temperature (°C)', stroke: '#ef4444' },
                    { key: 'heartRate', label: 'Heart Rate (BPM)', stroke: '#3b82f6' },
                    { key: 'spo2', label: 'SpO2 (%)', stroke: '#10b981' },
                  ].map((chart) => (
                    <div key={chart.key}>
                      <h4 className="text-sm font-semibold text-slate-600 mb-3">{chart.label}</h4>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="time" stroke="#64748b" fontSize={11} minTickGap={40} />
                            <YAxis stroke="#64748b" fontSize={11} width={38} domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1F06AC',
                                color: '#fff',
                                borderRadius: 8,
                                border: 'none',
                              }}
                              labelStyle={{ color: '#E3EF4F' }}
                            />
                            <Line
                              type="monotone"
                              dataKey={chart.key}
                              stroke={chart.stroke}
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                              connectNulls
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert History */}
              {alerts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">Alert History</h3>
                  <div className="space-y-3">
                    {alerts.map((alert, index) => (
                      <div
                        key={`${alert.timestamp || index}-${index}`}
                        className={`p-4 rounded-xl border-2 ${
                          alert.alert_level === 'CRITICAL'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">{alert.alert_level} Alert Sent</p>
                            <p className="text-sm text-slate-600">
                              {alert.timestamp
                                ? new Date(alert.timestamp).toLocaleString()
                                : 'Just now'}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold text-white flex-shrink-0 ${
                              alert.alert_level === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'
                            }`}
                          >
                            {alert.alert_level}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Source Info */}
              <div className="bg-gradient-to-r from-[#1F06AC]/10 to-[#0F42C0]/10 rounded-xl p-4 border border-[#1F06AC]/20">
                <p className="text-sm text-[#1F06AC] break-words">
                  <strong>Data Source:</strong> SYNTHETIC_SIMULATION | <strong>Patient ID:</strong>{' '}
                  {patientId} | <strong>Scenario:</strong> {currentScenario}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Location Map Sidebar */}
        <div className="lg:col-span-1">
          <LocationMap
            location={location}
            isTracking={locationTracking}
            isSharing={locationSharing}
            patientId={patientId}
            patientName={patientName}
            onStartSharing={() => startLiveSharing(patientName)}
            onStopSharing={stopSharing}
          />
        </div>
      </div>

      {!healthData && !isStreaming && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">
            Select a scenario above to begin real-time monitoring
          </p>
        </div>
      )}
    </div>
  );
};

export default ScenarioMonitoring;
