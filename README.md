# Open Local Leader

A CrossFit Open-style leaderboard application for gyms to track athlete scores, rankings, and competition results.

## Features

- **Multi-gym support** - Each gym has its own leaderboard, or view the global leaderboard across all gyms
- **Three workout tracking** - Log scores for workouts 26.1, 26.2, and 26.3
- **Filtering** - Filter by division (Rx/Scaled/Foundations), gender, and age group
- **Rankings** - Automatic ranking within division and gender groups
- **Score verification** - Admins can verify athlete scores
- **Deep linking** - Share direct links to gym leaderboards via `?gymId=<id>`

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- Firebase (Auth + Firestore + Hosting)

## Getting Started

### Prerequisites

- Node.js
- Firebase project with Auth and Firestore enabled

### Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` with your Firebase config:
   ```
   VITE_API_KEY=your_api_key
   VITE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_PROJECT_ID=your_project_id
   VITE_STORAGE_BUCKET=your_project.appspot.com
   VITE_MESSAGING_SENDER_ID=your_sender_id
   VITE_APP_ID=your_app_id
   VITE_MEASUREMENT_ID=your_measurement_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Deployment

The app is configured for Firebase Hosting. To deploy:

```bash
npm run build
firebase deploy
```
