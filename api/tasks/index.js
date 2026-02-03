const { getDb } = require('../_db');

module.exports = async function handler(req, res) {
  const sql = await getDb();

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const status = req.query.status;
      let rows;
      if (status) {
        rows = await sql`SELECT * FROM tasks WHERE status = ${status} ORDER BY position, created_at DESC`;
      } else {
        rows = await sql`SELECT * FROM tasks ORDER BY status, position, created_at DESC`;
      }
      const tasks = rows.map(parseTask);
      return res.status(200).json(tasks);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, description, priority, status, due_date, tags, blocked_by } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });

      const taskStatus = status || 'backlog';
      const maxPosResult = await sql`SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM tasks WHERE status = ${taskStatus}`;
      const nextPos = maxPosResult[0].next_pos;

      const result = await sql`
        INSERT INTO tasks (title, description, priority, status, due_date, tags, blocked_by, position)
        VALUES (${title}, ${description || ''}, ${priority || 'medium'}, ${taskStatus}, ${due_date || null}, ${JSON.stringify(tags || [])}, ${JSON.stringify(blocked_by || [])}, ${nextPos})
        RETURNING *
      `;

      return res.status(201).json(parseTask(result[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PATCH/PUT/DELETE with ?id= query param
  const taskId = parseInt(req.query.id);
  if (!taskId) return res.status(405).json({ error: 'Method not allowed' });

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const existing = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
      if (existing.length === 0) return res.status(404).json({ error: 'Task not found' });

      const old = existing[0];
      const { title, description, priority, status, due_date, tags, blocked_by, position } = req.body;

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
          blocked_by = COALESCE(${blocked_by ? JSON.stringify(blocked_by) : null}, blocked_by),
          position = COALESCE(${position !== undefined ? position : null}, position),
          updated_at = NOW(),
          completed_at = ${completed_at}
        WHERE id = ${taskId}
        RETURNING *
      `;

      return res.status(200).json(parseTask(result[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const existing = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
      if (existing.length === 0) return res.status(404).json({ error: 'Task not found' });
      await sql`DELETE FROM tasks WHERE id = ${taskId}`;
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

function parseTask(task) {
  if (!task) return task;
  const obj = { ...task };
  if (typeof obj.tags === 'string') {
    try { obj.tags = JSON.parse(obj.tags); } catch { obj.tags = []; }
  }
  if (typeof obj.blocked_by === 'string') {
    try { obj.blocked_by = JSON.parse(obj.blocked_by); } catch { obj.blocked_by = []; }
  }
  if (!obj.blocked_by) obj.blocked_by = [];
  return obj;
}

// Alias for backward compatibility
const parseTags = parseTask;
