const { neon } = require('@neondatabase/serverless');

let initialized = false;

function getSql() {
  return neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

async function initDb() {
  if (initialized) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent', 'critical')),
      status TEXT DEFAULT 'backlog' CHECK(status IN ('backlog', 'todo', 'in_progress', 'done')),
      due_date TEXT,
      tags TEXT DEFAULT '[]',
      blocked_by TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      position INTEGER DEFAULT 0,
      assignee TEXT,
      category TEXT
    )
  `;
  // Add columns if they don't exist (for existing tables)
  try {
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_by TEXT DEFAULT '[]'`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee TEXT`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT`;
    // Update priority constraint to include 'critical'
    await sql`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check`;
    await sql`ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check CHECK(priority IN ('low', 'medium', 'high', 'urgent', 'critical'))`;
  } catch (e) {
    // Columns might already exist or constraint updates might fail silently
  }
  await sql`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'task' CHECK(type IN ('task','bug','improvement','investigation')),
      priority INTEGER DEFAULT 3,
      status TEXT DEFAULT 'queued' CHECK(status IN ('queued','triage','ready','executing','blocked','review','done','dropped')),
      requester TEXT,
      owner TEXT DEFAULT 'unassigned',
      intent TEXT CHECK(intent IN ('produce','decide','investigate','fix','draft')),
      definition_of_done TEXT DEFAULT '[]',
      budget_max_tool_calls INTEGER DEFAULT 12,
      budget_max_tokens INTEGER DEFAULT 50000,
      budget_max_minutes INTEGER DEFAULT 45,
      budget_max_children INTEGER DEFAULT 6,
      wip_class TEXT DEFAULT 'general' CHECK(wip_class IN ('web_calls','db_reads','code_exec','human_review','general')),
      lease_holder TEXT,
      lease_expires_at TIMESTAMP,
      blocked_by TEXT DEFAULT '[]',
      blocks TEXT DEFAULT '[]',
      plan TEXT DEFAULT '[]',
      evidence TEXT DEFAULT '[]',
      verification_status TEXT DEFAULT 'unverified' CHECK(verification_status IN ('unverified','verified','failed')),
      verification_confidence REAL DEFAULT 0,
      verification_method TEXT,
      verification_verifier TEXT,
      verification_notes TEXT,
      history TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  initialized = true;
}

async function getDb() {
  await initDb();
  return getSql();
}

module.exports = { getDb };
