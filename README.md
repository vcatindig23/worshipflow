<a id="readme-top"></a>

<div align="center">
  <a href="https://github.com/vcatindig23/worshipflow">
    <img src="https://raw.githubusercontent.com/vcatindig23/worshipflow/main/public/worshipflow-mark.png" alt="WorshipFlow mark" width="88" height="88">
  </a>

  <h1>WorshipFlow</h1>

  <p><strong>Plan with purpose. Serve in unity.</strong></p>

  <p>A shared workspace for church worship teams to organize songs, prepare services, coordinate team members, and lead worship with confidence.</p>

  <p>
    <a href="https://github.com/vcatindig23/worshipflow"><strong>Explore the repository</strong></a>
    &middot;
    <a href="https://github.com/vcatindig23/worshipflow/issues/new/choose">Report a bug</a>
    &middot;
    <a href="https://github.com/vcatindig23/worshipflow/issues/new/choose">Request a feature</a>
  </p>

  <p>
    <a href="https://github.com/vcatindig23/worshipflow/graphs/contributors"><img src="https://img.shields.io/github/contributors/vcatindig23/worshipflow?style=for-the-badge" alt="Contributors"></a>
    <a href="https://github.com/vcatindig23/worshipflow/network/members"><img src="https://img.shields.io/github/forks/vcatindig23/worshipflow?style=for-the-badge" alt="Forks"></a>
    <a href="https://github.com/vcatindig23/worshipflow/stargazers"><img src="https://img.shields.io/github/stars/vcatindig23/worshipflow?style=for-the-badge" alt="Stars"></a>
    <a href="https://github.com/vcatindig23/worshipflow/issues"><img src="https://img.shields.io/github/issues/vcatindig23/worshipflow?style=for-the-badge" alt="Open issues"></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16.3.8-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16.3.8">
    <img src="https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white" alt="React 19">
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  </p>
</div>

---

## Table of Contents

- [About the Project](#about-the-project)
  - [Features](#features)
  - [Built With](#built-with)
  - [How It Fits Together](#how-it-fits-together)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Security and Data Access](#security-and-data-access)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

---

## About the Project

WorshipFlow is a worship-team planning workspace designed to bring the practical work behind a church service into one organized place. Teams can maintain a shared song catalog, build service plans, assign and confirm team members, share resources, communicate, and review completed services.

The goal is to make preparation easier and help every member know **what is planned, where they need to be, and how to prepare**.

### Features

#### Song library and chord charts
- Maintain a shared catalog of worship songs.
- Organize lyrics and chords with song details such as key, tempo, capo, and arrangement notes.
- Display chord diagrams for supported chord shapes.
- Import and export ChordPro files, including `.cho`, `.chopro`, and `.chordpro` formats.
- Transpose chords, adjust chart text size, and show or hide chords while practicing.

#### Service and setlist planning
- Create and manage services with dates, times, descriptions, notes, and announcements.
- Organize songs and service elements in a setlist.
- Customize song order, sections, keys, capo, tempo, and arrangement notes.
- Build a run of show with timed service elements and links to setlist songs.
- Save reusable service templates and create new drafts from them.
- Attach workspace files as service resources.
- Review service readiness, team assignments, and confirmations.
- Duplicate an existing service plan while resetting its date, completion state, and team confirmations.
- Schedule rehearsals with their own date, start/end time, location, and preparation notes.
- Maintain service-specific preparation tasks and flag overlapping service/rehearsal commitments for shared team members.
- Track which assigned members have acknowledged the current service announcements; acknowledgments reset when announcement text changes.
- Print a dedicated service plan with the worship order, run of show, team assignments, rehearsal details, preparation tasks, and linked resource names; use the browser print dialog to save it as PDF.

#### Team and workspace coordination
- Set up a church workspace and invite team members.
- Manage role-based access for administrators, worship leaders, song editors, team members, and viewers.
- Assign team members to worship and production positions.
- Let assigned members confirm or decline assignments with an optional note.
- Let members request an assignment swap, the proposed substitute accept or decline, and a worship leader approve or decline the final change.
- Review upcoming assignments in My Schedule and add scheduled services to Google Calendar.
- Coordinate in Team Chat with message updates, typing indicators, replies, pinned messages, mentions, message search, and unread indicators.
- Search relevant workspace content from the dashboard and access notifications and workspace activity.

#### Live Stage
- Present song lyrics and chords in a focused, screen-filling performance view.
- Move through the service's songs without leaving the stage interface.
- Transpose chords, adjust chart text size, show or hide chords, and use fullscreen.
- Save a service's song-chart snapshot for offline access on the current device.

> **Offline limitation:** Live Stage can reopen chart snapshots that were saved on the device. The rest of the WorshipFlow workspace still requires an internet connection. Open a service's Live Stage while online and wait for **Saved for offline** before relying on its charts offline.

#### Notifications, activity, and insights
- Receive in-app notifications for service assignment changes, team chat messages, announcement updates, and swap-request decisions.
- Receive scheduled in-app reminders roughly 24 hours and one hour before upcoming services when a service date and start time are set.
- Review workspace activity relating to songs, services, teams, and membership.
- Record completed services with attendance, actual duration, and after-service notes.
- Browse completed services and review insights such as attendance trends, completion rate, service duration, and frequently used songs.

### Built With

| Area | Technology |
| --- | --- |
| Framework and routing | [Next.js App Router](https://nextjs.org/) |
| UI | [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Authentication and backend | [Supabase Auth](https://supabase.com/auth), [Supabase PostgreSQL](https://supabase.com/database), Supabase Storage |
| Server/client Supabase integration | `@supabase/ssr`, `@supabase/supabase-js` |
| Validation | [Zod](https://zod.dev/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Unit testing | [Vitest](https://vitest.dev/) |

### How It Fits Together

```text
Song Library
    |
    v
Service Plan -----> Team Assignments and Confirmations
    |                            |
    v                            v
Resources and Run of Show   Team Coordination
    |
    v
Live Stage
    |
    v
Completed Services, History, and Insights
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

Follow these steps to run WorshipFlow locally.

### Prerequisites

- [Node.js](https://nodejs.org/) **20.9 or later**
- npm (included with Node.js)
- A [Supabase](https://supabase.com/) project

### Installation

1. **Clone the repository.**

   ```bash
   git clone https://github.com/vcatindig23/worshipflow.git
   cd worshipflow
   ```

2. **Install dependencies.**

   ```bash
   npm install
   ```

3. **Configure the environment variables.**

   Create a `.env.local` file in the project root as described in [Environment Variables](#environment-variables).

4. **Set up the Supabase database.**

   Apply the migrations in `supabase/migrations/` in filename/timestamp order as described in [Database Setup](#database-setup).

5. **Run the development server.**

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

In your Supabase project, open the API settings and copy the project URL and publishable key. Add them to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Replace the example values with your project's actual values. These are the two Supabase environment variables currently read by the application. Never commit real credentials to Git.

### Database Setup

- For a new database, apply the SQL migration files in `supabase/migrations/` in filename/timestamp order using your preferred Supabase migration workflow or the Supabase SQL Editor.
- For an existing database, verify which migrations have already been applied before proceeding. Do not blindly rerun migrations against a database with live data.
- Configure Supabase Auth URL settings for the local application and each deployed domain used for sign-in, email confirmation, invitations, and password recovery.
- Ensure the deployed Supabase project has the policies, storage configuration, and database functions required by the migrations.

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite |
| `npm run test:watch` | Run Vitest in watch mode |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Usage

A typical workflow in WorshipFlow looks like this:

1. **Set up your workspace.** Create or join a church workspace and invite the people who serve on the team.
2. **Prepare the song catalog.** Add songs and maintain their lyrics, chords, keys, tempos, and arrangement details.
3. **Plan the service.** Create a service, arrange the setlist and run of show, add notes and resources, and assign team positions.
4. **Confirm assignments.** Team members review My Schedule and respond to their assignments.
5. **Rehearse and lead.** Use the song charts and Live Stage during practice or the service.
6. **Review the service.** Record completion details and use history and insights to help prepare for future services.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Project Structure

The primary application code is organized as follows:

```text
.
├── public/                  # Branding, icons, manifest assets, and static files
├── src/
│   ├── app/                 # App Router pages, layouts, and server actions
│   ├── components/          # Shared UI and feature components
│   ├── features/            # Feature-specific logic, including ChordPro
│   └── lib/                 # Supabase clients and application utilities
├── supabase/
│   └── migrations/          # Ordered database and policy migrations
├── tests/                   # Automated tests
├── package.json
└── README.md
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Security and Data Access

- Supabase Auth manages authenticated sessions.
- Workspace membership and assigned roles determine which team and workspace actions members can perform.
- Supabase Row Level Security policies restrict database access where configured by the migrations.
- Only use the Supabase publishable key in `NEXT_PUBLIC_*` variables. **Never put a Supabase secret or service-role key in browser code.**
- Do not commit `.env.local`, credentials, access tokens, or other secrets.
- Offline chart snapshots are stored in the browser and scoped to the signed-in account. Signing out clears stored snapshots.

Review the database policies and authentication redirect settings before deploying to a live church workspace.

---

## Deployment

WorshipFlow is a Next.js application and can be deployed to a compatible Node.js hosting platform such as [Vercel](https://vercel.com/).

Before deploying:

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the hosting provider's environment variables.
2. Apply the required database migrations to the production Supabase project.
3. Configure Supabase Auth redirect URLs for the production domain.
4. Deploy over HTTPS to support the installable app experience and service-worker features.
5. Verify sign-in, password recovery, invitation acceptance, permissions, service planning, file access, chat, and Live Stage in the deployed environment.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Roadmap

The checklist below tracks potential improvements; it is not a promise that every item is currently in progress.

- [x] Shared song catalog with lyrics and chord charts
- [x] Service plans, setlists, team assignments, and confirmations
- [x] Team chat, notifications, and workspace activity
- [x] Live Stage with chart controls and saved offline snapshots
- [x] Service history and insights
- [x] Service announcement acknowledgments and assignment swap workflow
- [x] Scheduled in-app service reminders
- [x] Print-ready service plan with browser Save as PDF support
- [ ] Expand automated test coverage for key service and team workflows
- [ ] Add end-to-end tests for critical user journeys
- [ ] Continue accessibility and responsive-layout testing across screen sizes
- [ ] Expand contributor and deployment documentation

For bugs, ideas, and current discussions, visit the [GitHub Issues](https://github.com/vcatindig23/worshipflow/issues) page.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contributing

Bug reports, feature ideas, and security reports are welcome through [GitHub Issues](https://github.com/vcatindig23/worshipflow/issues).

WorshipFlow is currently distributed under a proprietary license. Making the source repository public on GitHub does not grant general permission to reuse, modify, deploy, or redistribute the project code. Please describe proposed improvements in an issue first. Do not publish modified copies or submit code contributions unless the repository owner has provided prior written permission and any required contribution terms.

Never include real environment variables, credentials, access tokens, or private church data in issues, patches, tests, or screenshots.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## License

WorshipFlow is proprietary software. Project code and other materials owned by the repository owner are covered by the [WorshipFlow Proprietary Software License](LICENSE). No general permission is granted to reuse, modify, deploy, or redistribute those materials without prior written permission.

Third-party dependencies and external assets remain subject to their own licenses. User-provided content and third-party song materials are not claimed by the project license.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contact

- **Project repository:** [vcatindig23/worshipflow](https://github.com/vcatindig23/worshipflow)
- **Bug reports and feature requests:** [GitHub Issues](https://github.com/vcatindig23/worshipflow/issues)
- **Project discussions:** Use GitHub Issues to start a discussion about a proposed change.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Acknowledgments

- [Next.js](https://nextjs.org/) and [React](https://react.dev/) for the application framework and UI.
- [Supabase](https://supabase.com/) for authentication, database, and storage.
- [Tailwind CSS](https://tailwindcss.com/) for styling.
- [Lucide](https://lucide.dev/) for interface icons.
- [Zod](https://zod.dev/) for validation.
- [Vitest](https://vitest.dev/) for testing tools.
- [Best-README-Template](https://github.com/othneildrew/Best-README-Template) for the README layout inspiration.

---

<div align="center">
  <p><strong>WorshipFlow</strong></p>
  <p>Built to help worship teams prepare thoughtfully and serve together.</p>
  <p><a href="https://github.com/vcatindig23/worshipflow">View the repository</a></p>
</div>

<p align="right">(<a href="#readme-top">back to top</a>)</p>
