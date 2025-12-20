# Project Coding Rules (Non-Obvious Only)

- Import alias `@/` maps to project root, not `src/` - use `@/src/...` for source files
- Constants are in `src/utls/constants.tsx` (folder misspelled as "utls")
- Zustand store uses optimistic updates - UI updates immediately, then syncs to backend
- Google Sheets API calls use `'text/plain;charset=utf-8'` headers to avoid CORS preflight issues
- Environment variables `VITE_GOOGLE_SCRIPT_URL` and `VITE_GEMINI_API_KEY` are required for full functionality