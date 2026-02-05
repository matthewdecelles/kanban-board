# Task Board (Kanban)

## Current State
- **URL:** https://kanban-vercel-kappa.vercel.app (auth: token=matt2026stanley)
- **Stack:** Vanilla HTML/CSS/JS frontend, Vercel serverless API, Turso (cloud SQLite) backend
- **Hosting:** Vercel
- **Status:** Functional, actively used

### Features
- Drag-and-drop columns (desktop)
- Full CRUD: create, edit, delete tasks
- Tags, priorities, due dates
- Stats overview
- Keyboard shortcuts (N = new task, Esc = close)
- External link from Command Center dashboard

### Columns
- Backlog, Todo, In Progress, Done
- (UX audit suggested renaming: Backlog → "Later", Todo → "Up Next" — NOT YET DONE)

## Last Changes
- Initial build and deploy (2026-01-27)
- Connected as Tasks panel in Command Center dashboard

## Known Issues
- **No mobile touch drag** — phone users can't drag tasks between columns (core UX broken on mobile)
- **Column names use dev jargon** — "Backlog" and "Todo" should be "Later" and "Up Next"
- **No toast notifications** on task move
- **No mobile status dropdown** alternative to drag
- **Drag-and-drop was broken at one point** — may need regression testing

## Key Decisions
- Vanilla JS (no React) — lightweight, fast
- Turso for persistence — cloud SQLite, serverless-friendly
- Auth via same middleware pattern as Command Center

## Architecture
```
public/           # Static frontend (HTML/CSS/JS)
api/              # Vercel serverless functions (CRUD endpoints)
scripts/          # DB setup scripts
middleware.js     # Auth
```

## Env Vars (Vercel)
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
