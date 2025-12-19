import { Prospect, Price, ContactStatus } from '../types';
import { INITIAL_PROSPECT_DATA, SCRAP_PRICES } from '../utls/constants';

// API URL from environment variables
const API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export const GoogleSheetsService = {
  getProspects: async (): Promise<Prospect[]> => {
    try {
      if (!API_URL) return INITIAL_PROSPECT_DATA;
      const response = await fetch(`${API_URL}?action=getProspects`);
      const data = await response.json();
      if (data.status === 'error' || !Array.isArray(data)) return INITIAL_PROSPECT_DATA;

      return data.map((row: any) => ({
        cid: row.cid || `gen-${Math.random()}`,
        company: row.company || 'Unknown',
        address: row.address || '',
        industry: row.industry || 'General',
        lat: Number(row.lat) || 0,
        lng: Number(row.lng) || 0,
        priorityScore: Number(row.priorityScore) || 0,
        contactStatus: (row.contactStatus as ContactStatus) || ContactStatus.NEVER,
        lastOutcome: row.lastOutcome || '',
        lastOutreachDate: row.lastOutreachDate || '',
        daysSinceContact: 0,
        nextStepDue: row.nextStepDue || '',
        competitorMentioned: row.competitorMentioned,
        email: '',
        zip: '',
        tags: [],
        urgencyBand: row.urgencyBand || 'Medium',
        closeProbability: 50
      }));
    } catch (e) {
      console.error("API Error", e);
      return INITIAL_PROSPECT_DATA;
    }
  },

  getPrices: async (): Promise<Price[]> => {
    try {
      if (!API_URL) return SCRAP_PRICES;
      const response = await fetch(`${API_URL}?action=getPricing`);
      const data = await response.json();
      if (!Array.isArray(data)) return SCRAP_PRICES;
      
      return data.map((row: any) => ({
        category: row.category || 'General',
        item: row.item,
        min: Number(row.min) || 0,
        max: Number(row.max) || 0
      }));
    } catch (e) { return SCRAP_PRICES; }
  },

  getInsights: async () => {
    try {
      if (!API_URL) return null;
      const response = await fetch(`${API_URL}?action=getInsights`);
      const json = await response.json();
      return json.status === 'success' ? json.data : null;
    } catch (e) { return null; }
  },

  logVisit: async (visitData: any) => {
    try {
      if (!API_URL) return { success: false, message: 'API URL not configured' };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'logVisit',
          payload: visitData
        })
      });

      const result = await response.json();
      return result;
    } catch (e) {
      console.error('logVisit error:', e);
      return { success: false, message: e instanceof Error ? e.message : String(e) };
    }
  },

  addProspect: async (prospect: Prospect) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // 'text/plain' avoids CORS preflight issues in GAS
        body: JSON.stringify({ action: 'addProspect', payload: prospect })
      });
      return await response.json();
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  },

  updateProspect: async (cid: string, updates: Partial<Prospect>) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateProspect', payload: { cid, updates } })
      });
      return await response.json();
    } catch (e) { return { success: false }; }
  },

  syncProspects: async (prospects: Prospect[]) => {
    try {
       const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'syncProspects', payload: prospects })
      });
      return await response.json();
    } catch (e) { return { success: false }; }
  }
};
