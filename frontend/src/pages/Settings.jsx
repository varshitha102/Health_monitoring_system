import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Mail,
  Phone,
  Save,
  RotateCcw,
  CheckCircle,
  Shield,
} from 'lucide-react';
import {
  usePatientSettings,
  DEFAULT_PATIENT_SETTINGS,
} from '../hooks/usePatientSettings';

const FIELDS = [
  { name: 'patientId', label: 'Patient ID', type: 'text', placeholder: 'P001' },
  { name: 'patientName', label: 'Full Name', type: 'text', placeholder: 'John Smith', required: true },
  { name: 'age', label: 'Age', type: 'number', placeholder: '35' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
  { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1234567890' },
];

const Settings = () => {
  const { settings: stored, save, reset } = usePatientSettings();
  const [form, setForm] = useState(stored);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Reflect external changes (e.g. another page reset the profile).
  useEffect(() => {
    setForm(stored);
  }, [stored]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
    setError('');
  };

  const handleSave = (e) => {
    e?.preventDefault?.();

    if (!form.patientName?.trim()) {
      setError('Full name is required — it is used in emergency SMS alerts.');
      return;
    }
    if (form.phone && !/^\+[1-9]\d{7,14}$/.test(form.phone.trim())) {
      setError('Phone number must be in E.164 format, e.g. +919876543210');
      return;
    }
    if (form.age !== '' && (Number(form.age) < 0 || Number(form.age) > 120)) {
      setError('Age must be between 0 and 120');
      return;
    }

    const cleaned = { ...form, patientName: form.patientName.trim() };
    save(cleaned);
    setForm(cleaned);
    setError('');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (!window.confirm('Reset the patient profile to defaults?')) return;
    reset();
    setForm({ ...DEFAULT_PATIENT_SETTINGS });
    setSaved(false);
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-xl flex items-center justify-center flex-shrink-0">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
            <p className="text-slate-500 text-sm">
              Manage your patient profile and application preferences
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Patient Profile</h3>
              <p className="text-sm text-slate-500">Configure patient information</p>
            </div>
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Settings saved successfully!
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* A real <form> so Enter submits (previously the form had no onSubmit at all). */}
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELDS.map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={field.name}
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    value={form[field.name] ?? ''}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1F06AC] focus:border-transparent transition-all ${
                      field.required ? 'border-2 border-[#1F06AC]' : 'border border-slate-300'
                    }`}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>

            <div>
              <label htmlFor="medicalNotes" className="block text-sm font-medium text-slate-700 mb-2">
                Medical Notes
              </label>
              <textarea
                id="medicalNotes"
                name="medicalNotes"
                value={form.medicalNotes ?? ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1F06AC] focus:border-transparent transition-all resize-none"
                placeholder="Any relevant medical information..."
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type="submit"
                className="bg-[#1F06AC] hover:bg-[#0F42C0] text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Settings
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-[#1F06AC]/10 to-[#0F42C0]/10 rounded-2xl p-6 border border-[#1F06AC]/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#1F06AC] rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-[#1F06AC]">Information</h3>
          </div>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-[#1F06AC] font-bold">•</span>
              <span>Patient Name is used in emergency SMS alerts to family members</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1F06AC] font-bold">•</span>
              <span>Settings are saved locally in your browser</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1F06AC] font-bold">•</span>
              <span>
                These settings are applied immediately on the Scenario Monitoring page — no reload
                needed
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1F06AC] font-bold">•</span>
              <span>Age is used for ML predictions on the Patient Prediction page</span>
            </li>
          </ul>

          <div className="mt-6 p-4 bg-white/60 rounded-xl border border-white/40">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-[#1F06AC]" />
              <p className="font-semibold text-slate-800">Quick Access</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-600 truncate">{form.email || 'No email set'}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-600 truncate">{form.phone || 'No phone set'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
