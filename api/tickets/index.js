const { getDb } = require('../_db');

// WIP caps per class
const WIP_CAPS = {
  web_calls: 2,
  code_exec: 1,
  human_review: 3,
  db_reads: 4,
  general: 5,
};

// Valid FSM transitions
const TRANSITIONS = {
  queued:    ['triage', 'dropped'],
  triage:    ['ready', 'blocked', 'dropped'],
  ready:     ['executing', 'blocked', 'dropped'],
  executing: ['review', 'blocked'],
  blocked:   ['ready'],
  review:    ['done', 'executing'],
  done:      [],
  dropped:   [],
};

function generateId() {
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const rand = Math.random().toString(36).substring(2, 6);
  return `T-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${rand}`;
}

function parseJsonFields(ticket) {
  if (!ticket) return ticket;
  const obj = { ...ticket };
  for (const field of ['definition_of_done', 'blocked_by', 'blocks', 'plan', 'evidence', 'history']) {
    if (typeof obj[field] === 'string') {
      try { obj[field] = JSON.parse(obj[field]); } catch { obj[field] = []; }
    }
  }
  return obj;
}

module.exports = async function handler(req, res) {
  const sql = await getDb();

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/tickets — list all, filterable
  if (req.method === 'GET') {
    try {
      const { status, owner } = req.query;
      let rows;
      if (status && owner) {
        rows = await sql`SELECT * FROM tickets WHERE status = ${status} AND owner = ${owner} ORDER BY priority ASC, created_at DESC`;
      } else if (status) {
        rows = await sql`SELECT * FROM tickets WHERE status = ${status} ORDER BY priority ASC, created_at DESC`;
      } else if (owner) {
        rows = await sql`SELECT * FROM tickets WHERE owner = ${owner} ORDER BY priority ASC, created_at DESC`;
      } else {
        rows = await sql`SELECT * FROM tickets ORDER BY priority ASC, created_at DESC`;
      }
      return res.status(200).json(rows.map(parseJsonFields));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST /api/tickets — create ticket
  if (req.method === 'POST') {
    try {
      const {
        title, type, priority, requester, owner, intent,
        definition_of_done, budget_max_tool_calls, budget_max_tokens,
        budget_max_minutes, budget_max_children, wip_class,
      } = req.body;

      if (!title) return res.status(400).json({ error: 'Title is required' });

      const id = generateId();
      const historyEntry = JSON.stringify([{
        timestamp: new Date().toISOString(),
        from: null,
        to: 'queued',
        by: requester || 'system',
        note: 'Ticket created',
      }]);

      const result = await sql`
        INSERT INTO tickets (
          id, title, type, priority, requester, owner, intent,
          definition_of_done, budget_max_tool_calls, budget_max_tokens,
          budget_max_minutes, budget_max_children, wip_class, history
        ) VALUES (
          ${id},
          ${title},
          ${type || 'task'},
          ${priority != null ? priority : 3},
          ${requester || null},
          ${owner || 'unassigned'},
          ${intent || null},
          ${JSON.stringify(definition_of_done || [])},
          ${budget_max_tool_calls != null ? budget_max_tool_calls : 12},
          ${budget_max_tokens != null ? budget_max_tokens : 50000},
          ${budget_max_minutes != null ? budget_max_minutes : 45},
          ${budget_max_children != null ? budget_max_children : 6},
          ${wip_class || 'general'},
          ${historyEntry}
        )
        RETURNING *
      `;

      return res.status(201).json(parseJsonFields(result[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

module.exports.WIP_CAPS = WIP_CAPS;
module.exports.TRANSITIONS = TRANSITIONS;
module.exports.parseJsonFields = parseJsonFields;
