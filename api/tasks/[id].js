const { getDb } = require('../_db');

module.exports = async function handler(req, res) {
  const sql = await getDb();
  const id = parseInt(req.query.id);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM tasks WHERE id = ${id}`;
      if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
      return res.status(200).json(parseTags(result.rows[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const existing = await sql`SELECT * FROM tasks WHERE id = ${id}`;
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

      const old = existing.rows[0];
      const { title, description, priority, status, due_date, tags } = req.body;

      let completed_at = old.completed_at;
      if (status === 'done' && old.status !== 'done') {
        completed_at = new Date().toISOString();
      } else if (status && status !== 'done') {
        completed_at = null;
      }

      const result = await sql`
        UPDATE tasks SET
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description !== undefined ? description : null}, description),
          priority = COALESCE(${priority || null}, priority),
          status = COALESCE(${status || null}, status),
          due_date = COALESCE(${due_date !== undefined ? due_date : null}, due_date),
          tags = COALESCE(${tags ? JSON.stringify(tags) : null}, tags),
          updated_at = NOW(),
          completed_at = ${completed_at}
        WHERE id = ${id}
        RETURNING *
      `;

      return res.status(200).json(parseTags(result.rows[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const existing = await sql`SELECT * FROM tasks WHERE id = ${id}`;
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
      await sql`DELETE FROM tasks WHERE id = ${id}`;
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
