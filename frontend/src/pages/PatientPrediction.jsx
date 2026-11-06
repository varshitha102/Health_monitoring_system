import React, { useCallback, useEffect, useState } from 'react';
import { Brain, Activity, Target, Loader2, History, XCircle } from 'lucide-react';
import { predictionsAPI } from '../services/api';
import { usePatientSettings } from '../hooks/usePatientSettings';

const EMPTY_FORM = {
  patient_id: '',
  heart_rate_bpm: '',
  spo2_pct: '',
  skin_temp_c: '',
  steps: '',
  age: '',
};

const toNumber = (value, { int = false } = {}) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = int ? parseInt(value, 10) : parseFloat(value);
  return Number.isNaN(n) ? null : n;
};

const PatientPrediction = () => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modelInfo, setModelInfo] = useState(null);
  const [modelError, setModelError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const { settings } = usePatientSettings();

  // Keep defaults in sync with the Settings page without wiping user input.
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      patient_id: prev.patient_id || settings.patientId || '',
      age: prev.age || settings.age || '',
    }));
  }, [settings.patientId, settings.age]);

  const fetchModelInfo = useCallback(async () => {
    try {
      const response = await predictionsAPI.getModelInfo();
      setModelInfo(response.data);
      setModelError('');
    } catch (err) {
      // A missing /model/info endpoint used to just log; show it instead.
      setModelError(err.friendlyMessage || 'Model information unavailable');
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const response = await predictionsAPI.getAll({ limit: 10 });
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModelInfo();
    fetchHistory();
  }, [fetchModelInfo, fetchHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPrediction(null);

    if (!formData.patient_id.trim()) {
      setError('Patient ID is required');
      return;
    }
    if (toNumber(formData.age, { int: true }) === null) {
      setError('Age is required');
      return;
    }

    setLoading(true);
    try {
      const response = await predictionsAPI.create({
        patient_id: formData.patient_id.trim(),
        heart_rate_bpm: toNumber(formData.heart_rate_bpm),
        spo2_pct: toNumber(formData.spo2_pct),
        skin_temp_c: toNumber(formData.skin_temp_c),
        steps: toNumber(formData.steps, { int: true }),
        age: toNumber(formData.age, { int: true }),
      });
      setPrediction(response.data);
      fetchHistory();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to generate prediction');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'NORMAL':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' };
      case 'WARNING':
        return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-500' };
      case 'CRITICAL':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-400' };
    }
  };

  // Guard against non-numeric scores (the old code called .toFixed() blindly and crashed).
  const formatScore = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(4) : '—';

  const contamination =
    typeof modelInfo?.contamination_actual === 'number'
      ? `${(modelInfo.contamination_actual * 100).toFixed(1)}%`
      : '—';

  const fields = [
    { key: 'heart_rate_bpm', label: 'Heart Rate (BPM)', placeholder: '60-100', required: false },
    { key: 'spo2_pct', label: 'SpO2 (%)', placeholder: '95-100', required: false },
    { key: 'skin_temp_c', label: 'Skin Temperature (°C)', placeholder: '33-35', step: '0.1', required: false },
    { key: 'steps', label: 'Steps', placeholder: '0-2000', required: false },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Patient Health Prediction</h2>
            <p className="text-slate-500 text-sm">
              AI-powered patient health assessment using trained ML model
            </p>
          </div>
        </div>
      </div>

      {/* Model Information */}
      {modelInfo && (
        <div className="bg-gradient-to-r from-[#1F06AC]/10 to-[#0F42C0]/10 rounded-2xl p-6 border border-[#1F06AC]/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#1F06AC] rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-[#1F06AC]">Model Information</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 p-4 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Model Type</p>
              <p className="font-bold text-slate-800 break-words">{modelInfo.model_type ?? '—'}</p>
            </div>
            <div className="bg-white/60 p-4 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Training Samples</p>
              <p className="font-bold text-slate-800">{modelInfo.n_train_samples ?? '—'}</p>
            </div>
            <div className="bg-white/60 p-4 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Features</p>
              <p className="font-bold text-slate-800">{modelInfo.features?.length ?? '—'}</p>
            </div>
            <div className="bg-white/60 p-4 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Contamination</p>
              <p className="font-bold text-slate-800">{contamination}</p>
            </div>
          </div>
        </div>
      )}

      {modelError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
          Model information could not be loaded: {modelError}. Predictions may still work.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Enter Patient Details</h3>
              <p className="text-sm text-slate-500">Input vital signs for prediction</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="patient_id" className="block text-sm font-medium text-slate-700 mb-2">
                  Patient ID *
                </label>
                <input
                  id="patient_id"
                  type="text"
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1F06AC] focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-slate-700 mb-2">
                  Age *
                </label>
                <input
                  id="age"
                  type="number"
                  min="0"
                  max="120"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1F06AC] focus:border-transparent transition-all"
                  placeholder="25-75"
                  required
                />
              </div>

              {fields.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={field.key}
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    {field.label}
                  </label>
                  <input
                    id={field.key}
                    type="number"
                    step={field.step}
                    value={formData[field.key]}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1F06AC] focus:border-transparent transition-all"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1F06AC] hover:bg-[#0F42C0] disabled:bg-slate-300 text-white py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  <Target className="w-5 h-5" />
                  Generate Prediction
                </>
              )}
            </button>
          </form>
        </div>

        {/* Prediction Result */}
        {prediction ? (
          <div
            className={`bg-white rounded-2xl shadow-sm border-2 p-6 ${getStatusConfig(prediction.predicted_status).border}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-10 h-10 ${getStatusConfig(prediction.predicted_status).bg} rounded-lg flex items-center justify-center`}
              >
                <Target className={`w-5 h-5 ${getStatusConfig(prediction.predicted_status).text}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Prediction Result</h3>
                <p className="text-sm text-slate-500">AI-based health assessment</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Patient ID</p>
                  <p className="font-bold text-slate-800 break-words">{prediction.patient_id}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Predicted Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getStatusConfig(prediction.predicted_status).bg} ${getStatusConfig(prediction.predicted_status).text}`}
                  >
                    {prediction.predicted_status ?? 'UNKNOWN'}
                  </span>
                </div>
                {prediction.anomaly_score != null && (
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Anomaly Score</p>
                    <p className="font-bold text-slate-800 tabular-nums">
                      {formatScore(prediction.anomaly_score)}
                    </p>
                  </div>
                )}
                {prediction.is_anomaly != null && (
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Is Anomaly</p>
                    <p className="font-bold text-slate-800">
                      {Number(prediction.is_anomaly) === 1 ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl">
                <h4 className="font-semibold text-slate-700 mb-3">Input Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">HR:</span>{' '}
                    <span className="font-semibold">{prediction.heart_rate_bpm ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">SpO2:</span>{' '}
                    <span className="font-semibold">{prediction.spo2_pct ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Temp:</span>{' '}
                    <span className="font-semibold">{prediction.skin_temp_c ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Steps:</span>{' '}
                    <span className="font-semibold">{prediction.steps ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Age:</span>{' '}
                    <span className="font-semibold">{prediction.age ?? 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
                <div>
                  <span className="font-medium">Model Version:</span>{' '}
                  {prediction.model_version ?? '—'}
                </div>
                <div>
                  <span className="font-medium">Timestamp:</span>{' '}
                  {prediction.created_at
                    ? new Date(prediction.created_at).toLocaleString()
                    : '—'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
            <Target className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500">No prediction yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Fill in the details and click Generate Prediction
            </p>
          </div>
        )}
      </div>

      {/* Prediction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-lg flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Prediction History</h3>
            <p className="text-sm text-slate-500">Recent predictions made</p>
          </div>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No predictions yet</p>
            <p className="text-sm text-slate-400 mt-1">Generate a prediction to see history here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patient ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Anomaly</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.map((pred, index) => {
                  const cfg = getStatusConfig(pred.predicted_status);
                  return (
                    <tr
                      key={pred.id ?? `${pred.patient_id}-${pred.created_at}-${index}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-800">{pred.patient_id}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.bg} ${cfg.text}`}
                        >
                          {pred.predicted_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {Number(pred.is_anomaly) === 1 ? 'Yes' : 'No'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{pred.model_version ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {pred.created_at ? new Date(pred.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientPrediction;
