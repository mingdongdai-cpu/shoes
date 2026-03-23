# TOP STAR SHOES Inventory System

A React, Vite, and TypeScript inventory management app for TOP STAR SHOES.

## Features

- Firebase authentication
- Product management
- Stock-in and stock-out records
- Sales summaries
- Expense tracking
- Inventory warnings

## Tech Stack

- React 19
- Vite 6
- TypeScript
- Firebase Auth
- Cloud Firestore
- Tailwind CSS 4

## Local Development

Prerequisites:
- Node.js 24+
- Access to the configured Firebase project
- A valid user in Firebase Auth

### Isolation Mode (default)

- The app now starts in isolated mode by default to protect production data.
- In isolated mode, login/data CRUD are local-memory only and do not read/write Firebase.
- To reconnect Firebase explicitly, set `VITE_ISOLATED_MODE=false` before running the app.

Install dependencies:
- npm install

Start the dev server:
- npm run dev

Default local URL:
- http://localhost:3000

## Production Build

Build the app:
- npm run build

Build output:
- dist/

## Project Structure

- src/main.tsx: React entry point
- src/App.tsx: app state, auth flow, Firestore reads and writes, view switching
- src/components/Views.tsx: page-level UI components
- src/types.ts: shared type definitions
- src/firebase.ts: Firebase initialization
- vite.config.ts: Vite config and bundle splitting

## Notes

- The project currently reads Firebase settings from src/firebase.ts.
- No GEMINI_API_KEY is required.
- The project is not an AI Studio app.
- If you switch Firebase projects, update auth, Firestore, and security rules together.
