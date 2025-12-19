# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project-Specific Patterns

- **Import alias**: `@/` maps to project root (`.`), not `src/` - use `@/src/...` for source files
- **Constants location**: Project constants are in `src/utls/constants.tsx` (note: folder misspelled as "utls")
- **Environment validation**: App validates `VITE_GOOGLE_SCRIPT_URL` and `VITE_GEMINI_API_KEY` on startup, shows warnings if missing
- **API headers**: Google Sheets service uses `'text/plain;charset=utf-8'` headers to avoid CORS preflight issues
- **Store pattern**: Zustand store uses optimistic updates - UI updates immediately, then syncs to backend
- **Security**: `.env` file contains actual API keys (should be moved to `.env.local` and added to `.gitignore`)

## Build Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Setup

Required environment variables:
- `VITE_GOOGLE_SCRIPT_URL` - Google Apps Script deployment URL
- `VITE_GEMINI_API_KEY` - Google Gemini API key

## Architecture

- **Frontend**: React + TypeScript + Vite
- **State**: Zustand with persistence
- **Backend**: Google Sheets (via Apps Script)
- **AI**: Google Gemini integration
- **Maps**: Google Maps React integration