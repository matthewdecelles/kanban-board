const { getDb } = require('../_db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = await getDb();
  const { tasks } = req.body;

  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Tasks array is required' });
  }

  try {
    // libSQL doesn't have transactions in the same way, batch the updates
    const statements = tasks.map(task => ({
      sql: 'UPDATE tasks SET position = ? WHERE id = ?',
      args: [task.position, task.id],
    }));

    await db.batch(statements);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
