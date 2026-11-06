import { useCallback, useEffect, useState } from 'react';

/**
 * Shared access to the patient profile saved in localStorage by the Settings page.
 *
 * Before: App.jsx and ScenarioMonitoring.jsx each read localStorage exactly once on
 * mount, so after saving a new name in Settings the sidebar/topbar kept showing the
 * old ("Not Configured") value until a full page reload. Same for the prediction page's
 * default age. This hook keeps every consumer in sync.
 */

export const DEFAULT_PATIENT_SETTINGS = {
  patientId: 'P001',
  patientName: '',
  age: '',
  email: '',
  phone: '',
  medicalNotes: '',
};

const STORAGE_KEY = 'patientSettings';
const EVENT_NAME = 'patientSettingsChanged';

export const readPatientSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PATIENT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PATIENT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_PATIENT_SETTINGS };
  }
};

export const writePatientSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota / private mode */
  }
  // Notify every hook instance in this tab (the native `storage` event only fires
  // in *other* tabs).
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: settings }));
};

export const clearPatientSettings = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { ...DEFAULT_PATIENT_SETTINGS } }));
};

export const usePatientSettings = () => {
  const [settings, setSettings] = useState(readPatientSettings);

  useEffect(() => {
    const sync = () => setSettings(readPatientSettings());
    const onCustom = (e) => setSettings({ ...DEFAULT_PATIENT_SETTINGS, ...(e.detail || {}) });
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) sync();
    };

    window.addEventListener(EVENT_NAME, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const save = useCallback((next) => writePatientSettings(next), []);
  const reset = useCallback(() => clearPatientSettings(), []);

  return { settings, save, reset };
};

export default usePatientSettings;
