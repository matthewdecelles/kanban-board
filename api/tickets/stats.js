const { getDb } = require('../_db');

const WIP_CAPS = {
  web_calls: 2,
  code_exec: 1,
  human_review: 3,
  db_reads: 4,
  general: 5,
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sql = await getDb();

  try {
    // Counts by status
    const statusCounts = await sql`
      SELECT status, COUNT(*) as count
      FROM tickets
      GROUP BY status
    `;

    const byStatus = {};
    for (const row of statusCounts) {
      byStatus[row.status] = parseInt(row.count);
    }

    // WIP utilization (executing tickets per wip_class)
    const wipRows = await sql`
      SELECT wip_class, COUNT(*) as count
      FROM tickets
      WHERE status = 'executing'
      GROUP BY wip_class
    `;

    const wipUtilization = {};
    for (const cls of Object.keys(WIP_CAPS)) {
      const row = wipRows.find(r => r.wip_class === cls);
      wipUtilization[cls] = {
        current: row ? parseInt(row.count) : 0,
        max: WIP_CAPS[cls],
      };
    }

    // Average time in each state (from history)
    // Pull all tickets with history, compute avg time per state
    const allTickets = await sql`SELECT history, status FROM tickets`;

    const stateDurations = {};
    const stateCounts = {};

    for (const ticket of allTickets) {
      let history;
      try {
        history = typeof ticket.history === 'string' ? JSON.parse(ticket.history) : ticket.history;
      } catch { continue; }
      if (!Array.isArray(history) || history.length < 1) continue;

      for (let i = 0; i < history.length - 1; i++) {
        const from = history[i];
        const to = history[i + 1];
        if (!from.timestamp || !to.timestamp) continue;
        const dur = new Date(to.timestamp) - new Date(from.timestamp);
        if (dur < 0) continue;
        const state = from.to || from.from;
        if (!state) continue;
        stateDurations[state] = (stateDurations[state] || 0) + dur;
        stateCounts[state] = (stateCounts[state] || 0) + 1;
      }
    }

    const avgTimePerState = {};
    for (const state of Object.keys(stateDurations)) {
      avgTimePerState[state] = Math.round(stateDurations[state] / stateCounts[state] / 1000); // seconds
    }

    // Total
    const totalResult = await sql`SELECT COUNT(*) as total FROM tickets`;

    return res.status(200).json({
      total: parseInt(totalResult[0].total),
      by_status: byStatus,
      wip_utilization: wipUtilization,
      avg_time_per_state_seconds: avgTimePerState,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
