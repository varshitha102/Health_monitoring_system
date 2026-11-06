import React, { useCallback, useEffect, useState } from 'react';
import { Phone, User, Plus, Edit, Trash2, Star, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { contactsAPI } from '../services/api';

const EMPTY_FORM = { name: '', phone_number: '', is_primary: false };

const ContactManager = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await contactsAPI.getAll();
      setContacts(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    if (!success && !error) return undefined;
    const t = setTimeout(() => {
      setSuccess('');
      setError('');
    }, 4000);
    return () => clearTimeout(t);
  }, [success, error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const name = formData.name.trim();
    const phone = formData.phone_number.trim();

    if (!name) {
      setError('Contact name is required');
      return;
    }
    // Twilio needs E.164: a leading + followed by 8-15 digits.
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      setError('Phone number must be in E.164 format, e.g. +919876543210');
      return;
    }

    const payload = { name, phone_number: phone, is_primary: formData.is_primary };

    try {
      setSaving(true);
      if (editingContact) {
        await contactsAPI.update(editingContact.id, payload);
        setSuccess('Contact updated successfully');
      } else {
        await contactsAPI.create(payload);
        setSuccess('Contact added successfully');
      }
      setFormData(EMPTY_FORM);
      setShowForm(false);
      setEditingContact(null);
      await fetchContacts();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || '',
      phone_number: contact.phone_number || '',
      is_primary: !!contact.is_primary,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await contactsAPI.delete(id);
      setSuccess('Contact deleted successfully');
      await fetchContacts();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to delete contact');
    }
  };

  const handleSetPrimary = async (contact) => {
    try {
      // Send the full record: a PUT with only `is_primary` failed schema validation
      // on backends that require name/phone_number.
      await contactsAPI.update(contact.id, {
        name: contact.name,
        phone_number: contact.phone_number,
        is_primary: true,
      });
      setSuccess('Primary contact updated');
      await fetchContacts();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to set primary contact');
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingContact(null);
    setShowForm(false);
    setError('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Emergency Contacts</h2>
            <p className="text-sm text-slate-500">Manage contacts for SMS alerts</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            if (showForm) {
              setEditingContact(null);
              setFormData(EMPTY_FORM);
            }
          }}
          className="bg-[#1F06AC] hover:bg-[#0F42C0] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 rounded-xl mb-6 border border-slate-200"
        >
          <h3 className="font-bold text-slate-800 mb-4">
            {editingContact ? 'Edit Contact' : 'Add New Contact'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 mb-2">
                Contact Name *
              </label>
              <input
                id="contact-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1F06AC] focus:border-transparent transition-all"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number (E.164) *
              </label>
              <input
                id="contact-phone"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1F06AC] focus:border-transparent transition-all"
                placeholder="+1234567890"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Include the country code, e.g. +919876543210</p>
            </div>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="w-4 h-4 text-[#1F06AC] border-slate-300 rounded focus:ring-[#1F06AC]"
              />
              <label htmlFor="is_primary" className="ml-2 text-sm text-slate-700 cursor-pointer">
                Set as Primary Contact
              </label>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1F06AC] hover:bg-[#0F42C0] disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingContact ? 'Update Contact' : 'Add Contact'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No emergency contacts added yet</p>
          <p className="text-sm text-slate-400 mt-1">Click &quot;Add Contact&quot; to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all hover:border-[#5882E8]"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{contact.name}</h3>
                      {contact.is_primary && (
                        <span className="inline-flex items-center gap-1 bg-[#E3EF4F] text-[#1F06AC] text-xs px-2 py-1 rounded-full font-semibold mt-1">
                          <Star className="w-3 h-3" />
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-600 font-medium truncate">{contact.phone_number}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Added:{' '}
                    {contact.created_at
                      ? new Date(contact.created_at).toLocaleDateString()
                      : 'Unknown'}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!contact.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(contact)}
                      className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
                      title="Set as Primary"
                      aria-label="Set as Primary"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEdit(contact)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                    title="Edit"
                    aria-label="Edit contact"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                    title="Delete"
                    aria-label="Delete contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactManager;
