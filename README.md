<div align="center">
  <img src="https://raw.githubusercontent.com/vcatindig23/worshipflow/main/public/worshipflow-mark.png" alt="WorshipFlow mark" width="88" />
  <h1>WorshipFlow</h1>
  <p><strong>Plan with purpose. Serve in unity.</strong></p>
  <p>A shared workspace for church worship teams to organize songs, prepare services, coordinate musicians, and lead worship with confidence.</p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16.3.8-000000?logo=next.js&logoColor=white" alt="Next.js 16.3.8" />
    <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  </p>
</div>

---

## Overview

WorshipFlow brings the practical work behind a worship service into one organized space. Teams can maintain a shared song catalog, build a service plan, assign and confirm team members, prepare resources, follow a run of show, and keep a record after the service.

The goal is to make preparation easier and help every member know **what is planned, where they need to be, and how to prepare**.

## Features

### Song library
- Keep the church's songs and charts in a shared catalog.
- Store lyrics and chord charts alongside song details such as key, tempo, capo, and arrangement notes.
- View guitar chord diagrams for supported chord shapes.
- Import and export **ChordPro** files (`.cho`, `.chopro`, and `.chordpro`).
- Maintain song versions and song-specific preferences.

### Service planning
- Create and manage service plans with dates, times, and descriptions.
- Organize songs into a setlist and customize sections, keys, capo, tempo, and notes.
- Add service notes and announcements.
- Build a run of show with timed service elements, notes, and links to setlist songs.
- Attach workspace files as service resources without duplicating the original files.
- Review a service-readiness summary for scheduling, songs, team assignments, and confirmations.

### Worship team coordination
- Set up a church workspace and invite members.
- Manage access through roles, including administrators, worship leaders, song editors, team members, and viewers.
- Assign members to worship-team positions for a service.
- Let assigned members confirm or decline, with an optional note.
- Review assignments in **My Schedule** and add scheduled services to Google Calendar.

### Live Stage
- Present service song charts in a focused performance view.
- Navigate through setlist songs, transpose chords, adjust chart text size, show or hide chords, and use fullscreen.
- Save a service's chart snapshot for offline use on the current device.

> **Offline note:** Live Stage can reopen previously saved chart snapshots. The rest of the WorshipFlow workspace still requires an internet connection. Open the service's Live Stage while online and wait for **Saved for offline** before relying on it offline.

### Notifications, history, and insights
- Receive in-app notifications when service-team assignments change.
- Review organization activity for song, service, team, and membership updates.
- Record a completed service with attendance, actual duration, and after-service notes.
- Browse completed services and review service insights such as attendance trends, completion rate, service duration, and frequently used songs.

## How it fits together

```text
Song Library
    ↓
Service Plan → Team Assignments & Confirmations
    ↓
Resources & Run of Show
    ↓
Live Stage
    ↓
After-Service History & Insights
```

## Tech stack

| Area | Technology |
| --- | --- |
| Application framework | Next.js App Router |
| UI | React, TypeScript, Tailwind CSS |
| Authentication and backend | Supabase Auth, PostgreSQL, Storage |
| Server/client Supabase integration | `@supabase/ssr`, `@supabase/supabase-js` |
| Validation | Zod |
| Icons | Lucide React |
| Testing | Vitest |

## Getting started

### Prerequisites

- Node.js **20.9 or later**
- npm
- A Supabase project

### 1. Clone the repository

```bash
git clone https://github.com/vcatindig23/worshipflow.git
cd worshipflow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Supabase

Create or select a project in [Supabase](https://supabase.com/). In the project's API settings, copy the project URL and **publishable key**.

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Replace the sample values with your project's real values. These are the two environment variables currently read by the application.

Apply the SQL files in `supabase/migrations/` to a **new** database in filename/timestamp order. Use your normal Supabase migration workflow, or run the files one at a time in the Supabase SQL Editor. These migrations create the application's tables, policies, storage configuration, and database functions.

If you're connecting an existing database, check which migrations have already been applied first; do not blindly re-run migrations against a database with live data.

In Supabase Auth settings, configure the local and deployed application URLs used by sign-in, email confirmation, and password reset flows.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite |
| `npm run test:watch` | Run Vitest in watch mode |

## Project structure

```text
src/
├── app/                  # App Router pages, layouts, and server actions
├── components/           # Shared UI and service/song components
└── lib/                  # Supabase clients, workspace logic, and utilities
public/                   # App icons, manifest assets, and offline-stage files
supabase/
└── migrations/           # Ordered database and policy migrations
tests/                    # Automated tests
```

## Access and data safety

- Supabase authentication is used to manage signed-in sessions.
- Organization membership and roles determine which workspace actions members can perform.
- Database access is protected with Supabase Row Level Security policies where configured by the migrations.
- Use only the publishable Supabase key in `NEXT_PUBLIC_*` variables. **Never expose a Supabase secret or service-role key in browser code or commit credentials to the repository.**
- Offline chart snapshots are stored in the browser and scoped to the signed-in account. Signing out clears the stored snapshots.

## Deployment

WorshipFlow is a Next.js application and can be deployed to a compatible Node.js hosting platform, such as [Vercel](https://vercel.com/).

Before deploying:

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the host's environment variables.
2. Apply all required database migrations to the production Supabase project.
3. Configure Supabase Auth redirect URLs for the production domain.
4. Deploy over HTTPS to support the installable app experience and service-worker features.
5. Verify sign-in, invitations, service planning, file access, and password recovery in the deployed environment.

## Development notes

- Keep database changes in timestamped SQL files under `supabase/migrations/`.
- Validate changes with `npm run lint` and `npm run build` before merging.
- Live Stage offline support is intentionally limited to previously saved chart snapshots; it is not a full offline copy of the application.

---

<div align="center">
  <p>Built to help worship teams prepare thoughtfully and serve together.</p>
  <p><a href="https://github.com/vcatindig23/worshipflow">Repository</a></p>
</div>
