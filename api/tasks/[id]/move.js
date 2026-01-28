const { getDb } = require('../../_db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = await getDb();
  const id = parseInt(req.query.id);
  const { status, position } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const existing = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const old = existing.rows[0];
    let completed_at = old.completed_at;
    if (status === 'done' && old.status !== 'done') {
      completed_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    } else if (status !== 'done') {
      completed_at = null;
    }

    await db.execute({
      sql: `UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now'), completed_at = ? WHERE id = ?`,
      args: [status, position || 0, completed_at, id],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
    const task = updated.rows[0];
    if (typeof task.tags === 'string') {
      try { task.tags = JSON.parse(task.tags); } catch { task.tags = []; }
    }
    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
