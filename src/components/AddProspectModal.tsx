import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Prospect, ContactStatus } from '../types';

export const AddProspectModal = ({
  isOpen,
  onClose,
  onSave,
  initialData
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prospect: Prospect) => Promise<void>;
  initialData?: Prospect | null;
}) => {
  const isEditing = !!initialData;

  const [formData, setFormData] = useState<Partial<Prospect>>({
    company: '',
    address: '',
    industry: '',
    contactStatus: ContactStatus.COLD,
    lat: 0,
    lng: 0,
    priorityScore: 50,
    closeProbability: 50
  });

  const [loading, setLoading] = useState(false);

  // Initialize form data when modal opens or initialData changes
  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        company: '',
        address: '',
        industry: '',
        contactStatus: ContactStatus.COLD,
        lat: 0,
        lng: 0,
        priorityScore: 50,
        closeProbability: 50
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company || !formData.industry) {
      alert('Please fill in Company Name and Industry');
      return;
    }

    setLoading(true);
    try {
      const prospectData = {
        ...formData,
        cid: isEditing ? formData.cid : `GEN-${Date.now()}`,
        // Set default values for required fields
        address: formData.address || '',
        contactStatus: formData.contactStatus || ContactStatus.COLD,
        lastOutcome: formData.lastOutcome || '',
        lastOutreachDate: formData.lastOutreachDate || '',
        nextStepDue: formData.nextStepDue || '',
        urgencyBand: formData.urgencyBand || 'Medium',
        competitorMentioned: formData.competitorMentioned || '',
        email: formData.email || '',
        zip: formData.zip || '',
        tags: formData.tags || []
      } as Prospect;

      await onSave(prospectData);
      onClose();
    } catch (error) {
      console.error('Error saving prospect:', error);
      alert('Failed to save prospect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">
            {isEditing ? 'Edit Prospect' : 'Add New Prospect'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="Close modal"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
              placeholder="e.g., ABC Manufacturing"
              value={formData.company || ''}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry *
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
              title="Select the industry for this prospect"
              value={formData.industry || ''}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              required
            >
              <option value="">Select an industry...</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Construction">Construction</option>
              <option value="Automotive">Automotive</option>
              <option value="Oil & Gas">Oil & Gas</option>
              <option value="Retail">Retail</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Food Service">Food Service</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
              placeholder="Street address, City, State"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Status
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
              title="Select the contact status for this prospect"
              value={formData.contactStatus || ContactStatus.COLD}
              onChange={(e) => setFormData({ ...formData, contactStatus: e.target.value as ContactStatus })}
            >
              <option value={ContactStatus.COLD}>Cold</option>
              <option value={ContactStatus.WARM}>Warm</option>
              <option value={ContactStatus.HOT}>Hot</option>
              <option value={ContactStatus.NEVER}>Never Contacted</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Score
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                title="Enter a priority score from 0 to 100"
                placeholder="0-100"
                value={formData.priorityScore || 50}
                onChange={(e) => setFormData({ ...formData, priorityScore: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Close Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                title="Enter the probability of closing this deal as a percentage"
                placeholder="0-100"
                value={formData.closeProbability || 50}
                onChange={(e) => setFormData({ ...formData, closeProbability: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#001F3F] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#003D7A] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                isEditing ? 'Update Prospect' : 'Add Prospect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
