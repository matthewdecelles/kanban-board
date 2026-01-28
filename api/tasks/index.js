const { getDb } = require('../_db');

module.exports = async function handler(req, res) {
  const sql = await getDb();

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const status = req.query.status;
      let result;
      if (status) {
        result = await sql`SELECT * FROM tasks WHERE status = ${status} ORDER BY position, created_at DESC`;
      } else {
        result = await sql`SELECT * FROM tasks ORDER BY status, position, created_at DESC`;
      }
      const tasks = result.rows.map(parseTags);
      return res.status(200).json(tasks);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, description, priority, status, due_date, tags } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });

      const taskStatus = status || 'backlog';
      const maxPos = await sql`SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM tasks WHERE status = ${taskStatus}`;
      const nextPos = maxPos.rows[0].next_pos;

      const result = await sql`
        INSERT INTO tasks (title, description, priority, status, due_date, tags, position)
        VALUES (${title}, ${description || ''}, ${priority || 'medium'}, ${taskStatus}, ${due_date || null}, ${JSON.stringify(tags || [])}, ${nextPos})
        RETURNING *
      `;

      return res.status(201).json(parseTags(result.rows[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

function parseTags(task) {
  if (!task) return task;
  const obj = { ...task };
  if (typeof obj.tags === 'string') {
    try { obj.tags = JSON.parse(obj.tags); } catch { obj.tags = []; }
  }
  return obj;
}
