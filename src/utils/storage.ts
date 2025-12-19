import { Prospect, Price } from '../types';

const STORAGE_KEYS = {
  PROSPECTS: 'crm_prospects',
  PRICES: 'crm_prices',
  LAST_SYNC: 'crm_last_sync'
};

export const StorageHelper = {
  // Save prospects to localStorage
  saveProspects: (prospects: Prospect[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROSPECTS, JSON.stringify(prospects));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Failed to save prospects to localStorage:', error);
    }
  },

  // Load prospects from localStorage
  loadProspects: (): Prospect[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROSPECTS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load prospects from localStorage:', error);
      return null;
    }
  },

  // Save prices to localStorage
  savePrices: (prices: Price[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(prices));
    } catch (error) {
      console.error('Failed to save prices to localStorage:', error);
    }
  },

  // Load prices from localStorage
  loadPrices: (): Price[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRICES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load prices from localStorage:', error);
      return null;
    }
  },

  // Get last sync timestamp
  getLastSync: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  },

  // Clear all stored data
  clearAll: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROSPECTS);
      localStorage.removeItem(STORAGE_KEYS.PRICES);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },

  // Check if data exists in storage
  hasData: (): boolean => {
    return !!(localStorage.getItem(STORAGE_KEYS.PROSPECTS) || localStorage.getItem(STORAGE_KEYS.PRICES));
  }
};
