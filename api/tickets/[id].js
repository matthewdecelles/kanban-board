const { getDb } = require('../_db');

const WIP_CAPS = {
  web_calls: 2,
  code_exec: 1,
  human_review: 3,
  db_reads: 4,
  general: 5,
};

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
  const id = req.query.id;

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!id) return res.status(400).json({ error: 'Ticket ID required' });

  // ── GET /api/tickets/:id ──
  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT * FROM tickets WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
      return res.status(200).json(parseJsonFields(rows[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── PATCH /api/tickets/:id — update fields (no status change) ──
  if (req.method === 'PATCH') {
    try {
      const rows = await sql`SELECT * FROM tickets WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

      const {
        title, type, priority, owner, intent,
        definition_of_done, budget_max_tool_calls, budget_max_tokens,
        budget_max_minutes, budget_max_children, wip_class,
        blocked_by, blocks, plan,
        lease_holder, lease_expires_at,
      } = req.body;

      const result = await sql`
        UPDATE tickets SET
          title = COALESCE(${title || null}, title),
          type = COALESCE(${type || null}, type),
          priority = COALESCE(${priority != null ? priority : null}, priority),
          owner = COALESCE(${owner || null}, owner),
          intent = COALESCE(${intent || null}, intent),
          definition_of_done = COALESCE(${definition_of_done ? JSON.stringify(definition_of_done) : null}, definition_of_done),
          budget_max_tool_calls = COALESCE(${budget_max_tool_calls != null ? budget_max_tool_calls : null}, budget_max_tool_calls),
          budget_max_tokens = COALESCE(${budget_max_tokens != null ? budget_max_tokens : null}, budget_max_tokens),
          budget_max_minutes = COALESCE(${budget_max_minutes != null ? budget_max_minutes : null}, budget_max_minutes),
          budget_max_children = COALESCE(${budget_max_children != null ? budget_max_children : null}, budget_max_children),
          wip_class = COALESCE(${wip_class || null}, wip_class),
          blocked_by = COALESCE(${blocked_by ? JSON.stringify(blocked_by) : null}, blocked_by),
          blocks = COALESCE(${blocks ? JSON.stringify(blocks) : null}, blocks),
          plan = COALESCE(${plan ? JSON.stringify(plan) : null}, plan),
          lease_holder = COALESCE(${lease_holder || null}, lease_holder),
          lease_expires_at = COALESCE(${lease_expires_at || null}, lease_expires_at),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return res.status(200).json(parseJsonFields(result[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── DELETE /api/tickets/:id ──
  if (req.method === 'DELETE') {
    try {
      const rows = await sql`SELECT * FROM tickets WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
      await sql`DELETE FROM tickets WHERE id = ${id}`;
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── POST /api/tickets/:id — sub-actions via ?action= ──
  if (req.method === 'POST') {
    const action = req.query.action;

    // POST /api/tickets/:id?action=evidence — append evidence
    if (action === 'evidence') {
      try {
        const rows = await sql`SELECT * FROM tickets WHERE id = ${id}`;
        if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

        const ticket = parseJsonFields(rows[0]);
        const { type, content, source, confidence } = req.body;

        if (!content) return res.status(400).json({ error: 'Evidence content is required' });

        const entry = {
          timestamp: new Date().toISOString(),
          type: type || 'note',
          content,
          source: source || 'unknown',
          confidence: confidence != null ? confidence : null,
        };

        const evidence = [...(ticket.evidence || []), entry];

        const result = await sql`
          UPDATE tickets SET
            evidence = ${JSON.stringify(evidence)},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;

        return res.status(200).json(parseJsonFields(result[0]));
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    // POST /api/tickets/:id?action=transition — FSM state transition
    if (action === 'transition') {
      try {
        const rows = await sql`SELECT * FROM tickets WHERE id = ${id}`;
        if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

        const ticket = parseJsonFields(rows[0]);
        const { to, by, reason } = req.body;

        if (!to) return res.status(400).json({ error: '"to" status is required' });

        const from = ticket.status;
        const allowed = TRANSITIONS[from] || [];

        if (!allowed.includes(to)) {
          return res.status(400).json({
            error: `Invalid transition: ${from} → ${to}. Allowed: ${allowed.join(', ') || 'none (terminal)'}`,
          });
        }

        // ── Enforce: dropped must include reason ──
        if (to === 'dropped' && !reason) {
          return res.status(400).json({ error: 'Dropping a ticket requires a reason' });
        }

        // ── Enforce: ready→executing requires WIP slot ──
        if (from === 'ready' && to === 'executing') {
          const wipClass = ticket.wip_class || 'general';
          const cap = WIP_CAPS[wipClass] || 5;
          const executing = await sql`
            SELECT COUNT(*) as cnt FROM tickets
            WHERE status = 'executing' AND wip_class = ${wipClass}
          `;
          if (parseInt(executing[0].cnt) >= cap) {
            return res.status(409).json({
              error: `WIP cap reached for "${wipClass}" (${cap}/${cap}). Cannot start execution.`,
            });
          }
        }

        // ── Enforce: executing requires lease ──
        if (to === 'executing' && !ticket.lease_holder && !(req.body.lease_holder)) {
          return res.status(400).json({ error: 'Executing requires a lease_holder' });
        }

        // ── Enforce: review→done requires human_signoff ──
        if (from === 'review' && to === 'done') {
          if (ticket.verification_status !== 'verified') {
            return res.status(400).json({ error: 'Ticket must be verified before moving to done' });
          }
          if (!ticket.verification_method || !ticket.verification_method.includes('human_signoff')) {
            return res.status(400).json({ error: 'review → done requires verification_method to include "human_signoff". Agents cannot self-close tickets.' });
          }
        }

        // Build history entry
        const history = [...(ticket.history || []), {
          timestamp: new Date().toISOString(),
          from,
          to,
          by: by || 'system',
          reason: reason || null,
        }];

        // Build update
        const updates = {
          status: to,
          history: JSON.stringify(history),
        };

        // If transitioning to executing, set lease
        if (to === 'executing') {
          updates.lease_holder = req.body.lease_holder || ticket.lease_holder;
          const expiry = new Date(Date.now() + (ticket.budget_max_minutes || 45) * 60 * 1000);
          updates.lease_expires_at = expiry.toISOString();
        }

        // If leaving executing, clear lease
        if (from === 'executing' && to !== 'executing') {
          updates.lease_holder = null;
          updates.lease_expires_at = null;
        }

        const result = await sql`
          UPDATE tickets SET
            status = ${updates.status},
            history = ${updates.history},
            lease_holder = ${updates.lease_holder !== undefined ? updates.lease_holder : ticket.lease_holder},
            lease_expires_at = ${updates.lease_expires_at !== undefined ? updates.lease_expires_at : ticket.lease_expires_at},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;

        return res.status(200).json(parseJsonFields(result[0]));
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    // POST /api/tickets/:id?action=signoff — Matt's human signoff
    if (action === 'signoff') {
      try {
        const rows = await sql`SELECT * FROM tickets WHERE id = ${id}`;
        if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

        const ticket = parseJsonFields(rows[0]);

        if (ticket.status !== 'review') {
          return res.status(400).json({ error: 'Signoff only applies to tickets in review status' });
        }

        const { notes, confidence } = req.body;

        // Set verification fields
        const verificationMethod = 'human_signoff';
        const verificationStatus = 'verified';
        const verificationConfidence = confidence != null ? confidence : 1.0;
        const verificationVerifier = 'matt';
        const verificationNotes = notes || 'Approved by Matt';

        // Append to history
        const history = [...(ticket.history || []), {
          timestamp: new Date().toISOString(),
          from: 'review',
          to: 'done',
          by: 'matt',
          reason: verificationNotes,
        }];

        // Move to done in one shot
        const result = await sql`
          UPDATE tickets SET
            status = 'done',
            verification_status = ${verificationStatus},
            verification_confidence = ${verificationConfidence},
            verification_method = ${verificationMethod},
            verification_verifier = ${verificationVerifier},
            verification_notes = ${verificationNotes},
            history = ${JSON.stringify(history)},
            lease_holder = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;

        return res.status(200).json(parseJsonFields(result[0]));
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    // POST /api/tickets/:id?action=reject — Matt kicks back to executing
    if (action === 'reject') {
      try {
        const rows = await sql`SELECT * FROM tickets WHERE id = ${id}`;
        if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

        const ticket = parseJsonFields(rows[0]);

        if (ticket.status !== 'review') {
          return res.status(400).json({ error: 'Reject only applies to tickets in review status' });
        }

        const { reason, lease_holder } = req.body;

        const history = [...(ticket.history || []), {
          timestamp: new Date().toISOString(),
          from: 'review',
          to: 'executing',
          by: 'matt',
          reason: reason || 'Needs rework',
        }];

        // Reset verification
        const result = await sql`
          UPDATE tickets SET
            status = 'executing',
            verification_status = 'failed',
            verification_confidence = 0,
            verification_method = NULL,
            verification_verifier = NULL,
            verification_notes = ${reason || 'Rejected — needs rework'},
            history = ${JSON.stringify(history)},
            lease_holder = ${lease_holder || ticket.owner || 'unassigned'},
            lease_expires_at = ${new Date(Date.now() + (ticket.budget_max_minutes || 45) * 60 * 1000).toISOString()},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;

        return res.status(200).json(parseJsonFields(result[0]));
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    return res.status(400).json({ error: `Unknown action: ${action}. Use evidence, transition, signoff, or reject.` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
