const { neon } = require('@neondatabase/serverless');

async function setup() {
  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  console.log('Creating tasks table...');
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'backlog' CHECK(status IN ('backlog', 'todo', 'in_progress', 'done')),
      due_date TEXT,
      tags TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      position INTEGER DEFAULT 0
    )
  `;
  console.log('✅ Database initialized!');
  process.exit(0);
}

setup().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
