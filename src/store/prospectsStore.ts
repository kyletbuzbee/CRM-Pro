import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Prospect } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';

interface ProspectsState {
  prospects: Prospect[];
  loading: boolean;
  error: string | null;
  fetchProspects: () => Promise<void>;
  addProspect: (prospect: Prospect) => Promise<void>;
  updateProspect: (id: string, updates: Partial<Prospect>) => Promise<void>;
  deleteProspect: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProspectsStore = create<ProspectsState>()(
  devtools(
    persist(
      (set, get) => ({
        prospects: [],
        loading: false,
        error: null,

        fetchProspects: async () => {
          set({ loading: true, error: null });
          try {
            const data = await GoogleSheetsService.getProspects();
            set({ prospects: data, loading: false });
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        },

        addProspect: async (prospect) => {
            // 1. Optimistic Update (Update UI immediately)
            set((state) => ({ prospects: [...state.prospects, prospect] }));

            // 2. API Call
            try {
                await GoogleSheetsService.addProspect(prospect);
            } catch (err) {
                console.error("Failed to sync new prospect to backend");
                // Optional: Rollback state if needed
            }
        },

        updateProspect: async (id, updates) => {
          // 1. Call backend API
          try {
            await GoogleSheetsService.updateProspect(id, updates);
          } catch (error) {
            console.error("Failed to update prospect in backend:", error);
            // Continue with local update even if backend fails
          }

          // 2. Update local state
          set((state) => ({
            prospects: state.prospects.map((p) =>
              p.cid === id ? { ...p, ...updates } : p
            )
          }));
        },

        deleteProspect: (id) =>
          set((state) => ({
            prospects: state.prospects.filter((p) => p.cid !== id)
          })),

        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error })
      }),
      { name: 'prospects-storage' }
    )
  )
);
