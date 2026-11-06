import React, { useState, useEffect } from 'react';
import { contactsAPI, notificationsAPI } from '../services/api';

const AlertSender = () => {
  const [contacts, setContacts] = useState([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    temperature: '',
    heart_rate: '',
    spo2: '',
    alert_level: 'WARNING',
    contact_ids: [],
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetchContacts();
    // Load patient settings from localStorage
    const savedSettings = localStorage.getItem('patientSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setFormData(prev => ({
        ...prev,
        patient_id: settings.patientId || '',
        patient_name: settings.patientName || ''
      }));
    }
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await contactsAPI.getAll();
      setContacts(response.data);
      // Auto-select primary contact if available
      const primaryContact = response.data.find((c) => c.is_primary);
      if (primaryContact) {
        setFormData((prev) => ({
          ...prev,
          contact_ids: [primaryContact.id],
        }));
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  };

  const handleContactToggle = (contactId) => {
    setFormData((prev) => {
      const newContactIds = prev.contact_ids.includes(contactId)
        ? prev.contact_ids.filter((id) => id !== contactId)
        : [...prev.contact_ids, contactId];
      return { ...prev, contact_ids: newContactIds };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setResults([]);

    if (formData.contact_ids.length === 0) {
      setError('Please select at least one emergency contact');
      return;
    }

    try {
      setSending(true);
      const response = await notificationsAPI.sendAlert({
        patient_id: formData.patient_id,
        patient_name: formData.patient_name,
        temperature: parseFloat(formData.temperature),
        heart_rate: parseInt(formData.heart_rate),
        spo2: parseInt(formData.spo2),
        alert_level: formData.alert_level,
        contact_ids: formData.contact_ids,
      });

      setResults(response.data);
      setSuccess('Alert sent successfully!');
      fetchContacts(); // Refresh contacts to ensure data is up to date
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send alert');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 text-green-800';
      case 'SENDING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CREATING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertLevelColor = (level) => {
    return level === 'CRITICAL' ? 'bg-red-600' : 'bg-yellow-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Send Test Alert</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient ID *
            </label>
            <input
              type="text"
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="PATIENT001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient Name
            </label>
            <input
              type="text"
              value={formData.patient_name}
              onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alert Level *
            </label>
            <select
              value={formData.alert_level}
              onChange={(e) => setFormData({ ...formData, alert_level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature (°C) *
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="37.5"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Heart Rate (BPM) *
            </label>
            <input
              type="number"
              value={formData.heart_rate}
              onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="75"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SpO2 (%) *
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.spo2}
              onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="98"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Emergency Contacts *
          </label>
          {contacts.length === 0 ? (
            <p className="text-gray-500 text-sm">No contacts available. Please add contacts first.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {contacts.map((contact) => (
                <label
                  key={contact.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.contact_ids.includes(contact.id)}
                    onChange={() => handleContactToggle(contact.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3">
                    <span className="font-medium text-gray-800">{contact.name}</span>
                    {contact.is_primary && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        Primary
                      </span>
                    )}
                    <p className="text-sm text-gray-600">{contact.phone_number}</p>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={sending || contacts.length === 0}
          className={`w-full py-3 rounded-lg text-white font-semibold transition-colors ${
            sending || contacts.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : getAlertLevelColor(formData.alert_level) + ' hover:opacity-90'
          }`}
        >
          {sending ? 'Sending Alert...' : 'Send Test Alert'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Alert Results</h3>
          <div className="space-y-3">
            {results.map((result) => (
              <div key={result.notification_id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-800">
                      To: {result.recipient_phone}
                    </p>
                    <p className="text-sm text-gray-600">
                      Alert Level: {result.alert_level}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      result.delivery_status
                    )}`}
                  >
                    {result.delivery_status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                  {result.message_content}
                </p>
                {result.twilio_message_sid && (
                  <p className="text-xs text-gray-500 mt-2">
                    Message SID: {result.twilio_message_sid}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Sent: {new Date(result.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertSender;
