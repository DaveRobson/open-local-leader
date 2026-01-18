# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with HMR
npm run dev:emulator # Start dev server with Firebase emulators

# Build & Deploy
npm run build        # TypeScript check + Vite production build
npm run preview      # Preview production build locally

# Linting
npm run lint         # Run ESLint

# Firebase Deployment
firebase deploy      # Deploy to Firebase Hosting (builds to dist/)
```

## Architecture

This is a CrossFit Open-style leaderboard application built with React 19, TypeScript, Vite 7, and Firebase. It allows gyms to track athlete scores across three workouts (26.1, 26.2, 26.3) with rankings by division, gender, and age group.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 (using @tailwindcss/vite plugin)
- **Backend**: Firebase (Auth, Firestore)
- **Build**: Vite 7 with @vitejs/plugin-react
- **Hosting**: Firebase Hosting

### Key Data Flow
1. **Authentication**: `useAuth` hook wraps Firebase Auth state
2. **Data Loading**: `useApp` composes three hooks:
   - `useAthletes` - real-time Firestore subscription to `cf_leaderboard_athletes` collection
   - `useGyms` - real-time subscription to `gyms` collection
   - `useAdmin` - checks if current user is in gym's admins array
3. **Rankings**: `calculateRankings` in `src/utils/ranking.ts` computes per-workout ranks within each division+gender group, then calculates total points

### Firestore Collections
- `gyms` - Gym documents with `name` and `admins[]` (user UIDs)
- `cf_leaderboard_athletes` - Athlete documents keyed by user UID, containing scores (w1, w2, w3), verification flags, division, gender, age, gymId

### Application State
- `ViewState`: 'landing' | 'app' - controls whether showing auth/gym selection or main leaderboard
- `filterGym`: Empty string for global view, gym ID for gym-specific view
- URL param `?gymId=<id>` deep-links directly to a gym's leaderboard

### User Roles
- **Member**: Can edit own scores
- **Admin**: Can edit any athlete's scores, verify scores, delete athletes (determined by presence in gym's admins array)

## Environment Variables

Firebase config in `.env.local`:
```
VITE_API_KEY=
VITE_AUTH_DOMAIN=
VITE_PROJECT_ID=
VITE_STORAGE_BUCKET=
VITE_MESSAGING_SENDER_ID=
VITE_APP_ID=
VITE_MEASUREMENT_ID=
```
