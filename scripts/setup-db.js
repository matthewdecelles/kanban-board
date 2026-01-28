#!/usr/bin/env node
/**
 * Setup script — initializes the Turso database with the tasks table.
 * Run: TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/setup-db.js
 */

const { createClient } = require('@libsql/client');

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error('Error: TURSO_DATABASE_URL is required');
    console.log('\nSetup instructions:');
    console.log('1. Install Turso CLI: brew install tursodatabase/tap/turso');
    console.log('2. Login: turso auth login');
    console.log('3. Create DB: turso db create kanban-board');
    console.log('4. Get URL: turso db show kanban-board --url');
    console.log('5. Get token: turso db tokens create kanban-board');
    console.log('6. Run: TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> node scripts/setup-db.js');
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  console.log('Creating tasks table...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'backlog' CHECK(status IN ('backlog', 'todo', 'in_progress', 'done')),
      due_date TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      position INTEGER DEFAULT 0
    )
  `);

  console.log('✅ Database setup complete!');

  // Check if there are existing tasks
  const result = await client.execute('SELECT COUNT(*) as count FROM tasks');
  console.log(`Current tasks: ${result.rows[0].count}`);
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
