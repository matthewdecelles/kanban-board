const { getDb } = require('../_db');

module.exports = async function handler(req, res) {
  const db = await getDb();
  const id = parseInt(req.query.id);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const result = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(200).json(parseTags(result.rows[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const existing = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const old = existing.rows[0];
      const { title, description, priority, status, due_date, tags } = req.body;

      // Determine completed_at
      let completed_at = old.completed_at;
      if (status === 'done' && old.status !== 'done') {
        completed_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
      } else if (status && status !== 'done') {
        completed_at = null;
      }

      await db.execute({
        sql: `UPDATE tasks SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                priority = COALESCE(?, priority),
                status = COALESCE(?, status),
                due_date = COALESCE(?, due_date),
                tags = COALESCE(?, tags),
                updated_at = datetime('now'),
                completed_at = ?
              WHERE id = ?`,
        args: [
          title || null,
          description !== undefined ? description : null,
          priority || null,
          status || null,
          due_date !== undefined ? due_date : null,
          tags ? JSON.stringify(tags) : null,
          completed_at,
          id,
        ],
      });

      const updated = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
      return res.status(200).json(parseTags(updated.rows[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const existing = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      await db.execute({ sql: 'DELETE FROM tasks WHERE id = ?', args: [id] });
      return res.status(204).end();
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
