const { getDb } = require('../../_db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sql = await getDb();
  const id = parseInt(req.query.id);
  const { status, position } = req.body;

  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const existing = await sql`SELECT * FROM tasks WHERE id = ${id}`;
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const old = existing.rows[0];
    let completed_at = old.completed_at;
    if (status === 'done' && old.status !== 'done') {
      completed_at = new Date().toISOString();
    } else if (status !== 'done') {
      completed_at = null;
    }

    const result = await sql`
      UPDATE tasks SET status = ${status}, position = ${position || 0}, updated_at = NOW(), completed_at = ${completed_at}
      WHERE id = ${id}
      RETURNING *
    `;

    const task = parseTags(result.rows[0]);
    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

function parseTags(task) {
  if (!task) return task;
  const obj = { ...task };
  if (typeof obj.tags === 'string') {
    try { obj.tags = JSON.parse(obj.tags); } catch { obj.tags = []; }
  }
  return obj;
}
