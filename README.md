# 🦞 Matt's Command Center — Kanban Board

A serverless kanban board deployed on Vercel with Turso (cloud SQLite) backend.

## Features
- 🎨 Dark GitHub-style UI
- 🖱️ Drag-and-drop between columns
- ✏️ Full CRUD (create, edit, delete tasks)
- 🏷️ Tags, priorities, due dates
- 📊 Stats overview
- ⌨️ Keyboard shortcuts (`N` = new task, `Esc` = close modal)

## Setup

### 1. Create Turso Database
```bash
brew install tursodatabase/tap/turso
turso auth login
turso db create kanban-board
turso db show kanban-board --url    # save this URL
turso db tokens create kanban-board  # save this token
```

### 2. Deploy to Vercel
Connect this GitHub repo to Vercel and add these environment variables:

| Variable | Value |
|----------|-------|
| `TURSO_DATABASE_URL` | `libsql://kanban-board-<your-org>.turso.io` |
| `TURSO_AUTH_TOKEN` | Token from step 1 |

### 3. Initialize Database
```bash
npm install
TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> npm run setup-db
```

## Local Development
```bash
npm install
# Set env vars in .env.local:
# TURSO_DATABASE_URL=libsql://...
# TURSO_AUTH_TOKEN=...
npx vercel dev
```

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (no framework needed)
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** Turso (libSQL — cloud SQLite)
