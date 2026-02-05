const API = '/api/tickets';
const _urlToken = new URLSearchParams(window.location.search).get('token');
const _apiQ = _urlToken ? `?token=${encodeURIComponent(_urlToken)}` : '';
function _withToken(url) {
  if (!_urlToken) return url;
  return url + (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(_urlToken)}`;
}
let tickets = [];
let stats = {};

const STATUSES = ['queued','triage','ready','executing','blocked','review','done','dropped'];

const STATUS_META = {
  queued:    { label: '📥 Queued',     color: '#8b949e' },
  triage:    { label: '🔍 Triage',     color: '#d29922' },
  ready:     { label: '🟦 Ready',      color: '#58a6ff' },
  executing: { label: '⚡ Executing',  color: '#3fb950' },
  blocked:   { label: '🚫 Blocked',    color: '#f85149' },
  review:    { label: '👁️ Review',     color: '#f0883e' },
  done:      { label: '✅ Done',       color: '#238636' },
  dropped:   { label: '🗑️ Dropped',   color: '#484f58' },
};

const PRIORITY_LABELS = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4', 5: 'P5' };
const PRIORITY_COLORS = { 1: '#f85149', 2: '#f0883e', 3: '#d29922', 4: '#58a6ff', 5: '#8b949e' };

const WIP_CAPS = { web_calls: 2, code_exec: 1, human_review: 3, db_reads: 4, general: 5 };

// ── Fetch ──
async function fetchTickets() {
  const res = await fetch(API + _apiQ);
  tickets = await res.json();
  renderBoard();
}

async function fetchStats() {
  const res = await fetch(`${API}/stats` + _apiQ);
  stats = await res.json();
  renderWipIndicators();
}

async function refresh() {
  await Promise.all([fetchTickets(), fetchStats()]);
}

// ── Render Board ──
function renderBoard() {
  const board = document.getElementById('ticket-board');
  board.innerHTML = STATUSES.map(status => {
    const meta = STATUS_META[status];
    const statusTickets = tickets.filter(t => t.status === status);
    return `
      <div class="ticket-column" data-status="${status}">
        <div class="ticket-column-header" style="border-bottom-color: ${meta.color}">
          <h2>${meta.label}</h2>
          <span class="count" style="background: ${meta.color}22; color: ${meta.color}">${statusTickets.length}</span>
        </div>
        <div class="ticket-cards">
          ${statusTickets.map(t => renderCard(t)).join('')}
          ${statusTickets.length === 0 ? '<div class="empty-col">No tickets</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderCard(t) {
  const pColor = PRIORITY_COLORS[t.priority] || '#8b949e';
  const pLabel = PRIORITY_LABELS[t.priority] || 'P?';
  const evidenceCount = (t.evidence || []).length;
  const isReview = t.status === 'review';

  let verifyBadge = '';
  if (t.verification_status === 'verified') {
    verifyBadge = '<span class="verify-badge verified">✅ Verified</span>';
  } else if (t.verification_status === 'failed') {
    verifyBadge = '<span class="verify-badge failed">❌ Failed</span>';
  } else if (isReview) {
    verifyBadge = '<span class="verify-badge awaiting">⏳ Awaiting Matt\'s Signoff</span>';
  }

  let signoffButtons = '';
  if (isReview) {
    signoffButtons = `
      <div class="signoff-actions">
        <button class="btn btn-approve btn-sm" onclick="event.stopPropagation(); openSignoffModal('${t.id}')">✅ Approve</button>
        <button class="btn btn-reject-sm btn-sm" onclick="event.stopPropagation(); openRejectModal('${t.id}')">🔄 Reject</button>
      </div>
    `;
  }

  return `
    <div class="ticket-card ${isReview ? 'ticket-review-glow' : ''}" onclick="openDetailModal('${t.id}')">
      <div class="ticket-card-top">
        <span class="ticket-priority" style="background: ${pColor}22; color: ${pColor}">${pLabel}</span>
        <span class="ticket-type">${t.type}</span>
        <span class="ticket-wip-class">${t.wip_class}</span>
      </div>
      <div class="ticket-title">${escapeHtml(t.title)}</div>
      <div class="ticket-card-bottom">
        <span class="ticket-owner">👤 ${escapeHtml(t.owner || 'unassigned')}</span>
        ${evidenceCount > 0 ? `<span class="ticket-evidence">📎 ${evidenceCount}</span>` : ''}
      </div>
      ${verifyBadge}
      ${signoffButtons}
    </div>
  `;
}

// ── WIP Indicators ──
function renderWipIndicators() {
  const el = document.getElementById('wip-indicators');
  if (!stats.wip_utilization) { el.innerHTML = ''; return; }

  el.innerHTML = Object.entries(stats.wip_utilization).map(([cls, data]) => {
    const pct = data.max > 0 ? (data.current / data.max) : 0;
    const color = pct >= 1 ? '#f85149' : pct >= 0.7 ? '#d29922' : '#3fb950';
    return `<span class="wip-chip" style="border-color: ${color}; color: ${color}">${cls.replace('_',' ')}: ${data.current}/${data.max}</span>`;
  }).join('');
}

// ── Detail Modal ──
function openDetailModal(id) {
  const t = tickets.find(x => x.id === id);
  if (!t) return;

  const modal = document.getElementById('detail-modal');
  document.getElementById('detail-modal-title').textContent = `${t.id}`;

  const meta = STATUS_META[t.status];
  const pColor = PRIORITY_COLORS[t.priority] || '#8b949e';
  const pLabel = PRIORITY_LABELS[t.priority] || 'P?';
  const isReview = t.status === 'review';

  // Definition of done checklist
  const dod = t.definition_of_done || [];
  const dodHtml = dod.length > 0
    ? `<div class="detail-section"><h4>Definition of Done</h4><ul class="dod-list">${dod.map(item => {
        if (typeof item === 'object') {
          return `<li class="${item.done ? 'dod-done' : ''}">${item.done ? '☑' : '☐'} ${escapeHtml(item.text || item)}</li>`;
        }
        return `<li>☐ ${escapeHtml(item)}</li>`;
      }).join('')}</ul></div>`
    : '';

  // Plan
  const plan = t.plan || [];
  const planHtml = plan.length > 0
    ? `<div class="detail-section"><h4>Plan</h4><ol class="plan-list">${plan.map(s => `<li>${escapeHtml(typeof s === 'string' ? s : s.step || JSON.stringify(s))}</li>`).join('')}</ol></div>`
    : '';

  // Evidence
  const evidence = t.evidence || [];
  const evidenceHtml = evidence.length > 0
    ? `<div class="detail-section"><h4>Evidence (${evidence.length})</h4><div class="evidence-list">${evidence.map(e => `
        <div class="evidence-item">
          <div class="evidence-meta">${escapeHtml(e.type || 'note')} · ${escapeHtml(e.source || '?')} · ${new Date(e.timestamp).toLocaleString()}</div>
          <div class="evidence-content">${escapeHtml(e.content)}</div>
        </div>
      `).join('')}</div></div>`
    : '';

  // History
  const history = t.history || [];
  const historyHtml = history.length > 0
    ? `<div class="detail-section"><h4>History</h4><div class="history-list">${history.map(h => `
        <div class="history-item">
          <span class="history-time">${new Date(h.timestamp).toLocaleString()}</span>
          <span class="history-transition">${h.from || '∅'} → ${h.to}</span>
          <span class="history-by">by ${h.by}</span>
          ${h.reason ? `<span class="history-reason">"${escapeHtml(h.reason)}"</span>` : ''}
        </div>
      `).join('')}</div></div>`
    : '';

  // Verification
  let verificationHtml = '';
  if (t.verification_status && t.verification_status !== 'unverified') {
    verificationHtml = `<div class="detail-section"><h4>Verification</h4>
      <div class="verify-detail">
        <span>Status: <strong>${t.verification_status}</strong></span>
        <span>Confidence: <strong>${Math.round((t.verification_confidence || 0) * 100)}%</strong></span>
        ${t.verification_method ? `<span>Method: ${t.verification_method}</span>` : ''}
        ${t.verification_verifier ? `<span>Verifier: ${t.verification_verifier}</span>` : ''}
        ${t.verification_notes ? `<span>Notes: ${escapeHtml(t.verification_notes)}</span>` : ''}
      </div>
    </div>`;
  }

  // Signoff section for review tickets
  let signoffHtml = '';
  if (isReview) {
    signoffHtml = `
      <div class="detail-section signoff-section">
        <div class="signoff-banner">
          <div class="signoff-banner-icon">⏳</div>
          <div class="signoff-banner-text">
            <strong>Awaiting Matt's Signoff</strong>
            <span>Agents cannot self-close tickets. Only Matt can approve the transition to done.</span>
          </div>
        </div>
        <div class="signoff-buttons">
          <button class="btn btn-approve" onclick="openSignoffModal('${t.id}')">✅ Approve & Close</button>
          <button class="btn btn-danger" onclick="openRejectModal('${t.id}')">🔄 Reject — Needs Rework</button>
        </div>
      </div>
    `;
  }

  // Budgets
  const budgetHtml = `
    <div class="detail-section"><h4>Budget</h4>
      <div class="budget-grid">
        <span>Tool calls: ${t.budget_max_tool_calls}</span>
        <span>Tokens: ${(t.budget_max_tokens || 0).toLocaleString()}</span>
        <span>Minutes: ${t.budget_max_minutes}</span>
        <span>Children: ${t.budget_max_children}</span>
      </div>
    </div>
  `;

  // Lease
  let leaseHtml = '';
  if (t.lease_holder) {
    const expires = t.lease_expires_at ? new Date(t.lease_expires_at).toLocaleString() : '—';
    leaseHtml = `<div class="detail-section"><h4>Lease</h4><span>Holder: ${escapeHtml(t.lease_holder)} · Expires: ${expires}</span></div>`;
  }

  // Blocked by / blocks
  const blockedBy = t.blocked_by || [];
  const blocks = t.blocks || [];
  let depsHtml = '';
  if (blockedBy.length > 0 || blocks.length > 0) {
    depsHtml = `<div class="detail-section"><h4>Dependencies</h4>
      ${blockedBy.length > 0 ? `<div>Blocked by: ${blockedBy.map(b => `<code>${escapeHtml(b)}</code>`).join(', ')}</div>` : ''}
      ${blocks.length > 0 ? `<div>Blocks: ${blocks.map(b => `<code>${escapeHtml(b)}</code>`).join(', ')}</div>` : ''}
    </div>`;
  }

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-header-info">
      <span class="ticket-status-badge" style="background: ${meta.color}22; color: ${meta.color}; border: 1px solid ${meta.color}">${meta.label}</span>
      <span class="ticket-priority" style="background: ${pColor}22; color: ${pColor}">${pLabel}</span>
      <span class="ticket-type">${t.type}</span>
      <span class="ticket-wip-class">${t.wip_class}</span>
      <span class="ticket-owner">👤 ${escapeHtml(t.owner || 'unassigned')}</span>
      ${t.intent ? `<span class="ticket-intent">${t.intent}</span>` : ''}
    </div>
    <h3 class="detail-title">${escapeHtml(t.title)}</h3>
    ${signoffHtml}
    ${verificationHtml}
    ${dodHtml}
    ${planHtml}
    ${evidenceHtml}
    ${budgetHtml}
    ${leaseHtml}
    ${depsHtml}
    ${historyHtml}
    <div class="detail-footer">
      <span>Created: ${new Date(t.created_at).toLocaleString()}</span>
      <span>Updated: ${new Date(t.updated_at).toLocaleString()}</span>
      ${t.status !== 'done' ? `<button class="btn btn-complete btn-sm" onclick="completeTicket('${t.id}')">✅ Complete</button>` : ''}
      <button class="btn btn-danger btn-sm" onclick="deleteTicket('${t.id}')">🗑 Delete</button>
    </div>
  `;

  modal.classList.add('active');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('active');
}

// ── Create Modal ──
function openCreateModal() {
  document.getElementById('create-modal').classList.add('active');
  document.getElementById('f-title').focus();
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('active');
  document.getElementById('ticket-form').reset();
  document.getElementById('f-owner').value = 'unassigned';
  document.getElementById('f-budget-minutes').value = '45';
}

async function saveTicket(event) {
  event.preventDefault();

  const dodText = document.getElementById('f-dod').value.trim();
  const dod = dodText ? dodText.split('\n').filter(Boolean).map(text => ({ text: text.trim(), done: false })) : [];

  const body = {
    title: document.getElementById('f-title').value.trim(),
    type: document.getElementById('f-type').value,
    priority: parseInt(document.getElementById('f-priority').value),
    intent: document.getElementById('f-intent').value || null,
    requester: document.getElementById('f-requester').value.trim() || null,
    owner: document.getElementById('f-owner').value.trim() || 'unassigned',
    wip_class: document.getElementById('f-wip-class').value,
    budget_max_minutes: parseInt(document.getElementById('f-budget-minutes').value) || 45,
    definition_of_done: dod,
  };

  await fetch(_withToken(API), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  closeCreateModal();
  await refresh();
}

// ── Signoff Modal ──
function openSignoffModal(id) {
  document.getElementById('signoff-ticket-id').value = id;
  document.getElementById('signoff-modal').classList.add('active');
}

function closeSignoffModal() {
  document.getElementById('signoff-modal').classList.remove('active');
  document.getElementById('signoff-form').reset();
}

async function submitSignoff(event) {
  event.preventDefault();
  const id = document.getElementById('signoff-ticket-id').value;
  const notes = document.getElementById('signoff-notes').value.trim() || 'Approved by Matt';
  const confidence = parseFloat(document.getElementById('signoff-confidence').value);

  const res = await fetch(_withToken(`${API}/${encodeURIComponent(id)}?action=signoff`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, confidence }),
  });

  if (!res.ok) {
    const err = await res.json();
    alert(`Signoff failed: ${err.error}`);
    return;
  }

  closeSignoffModal();
  closeDetailModal();
  await refresh();
}

// ── Reject Modal ──
function openRejectModal(id) {
  document.getElementById('reject-ticket-id').value = id;
  document.getElementById('reject-modal').classList.add('active');
}

function closeRejectModal() {
  document.getElementById('reject-modal').classList.remove('active');
  document.getElementById('reject-form').reset();
}

async function submitReject(event) {
  event.preventDefault();
  const id = document.getElementById('reject-ticket-id').value;
  const reason = document.getElementById('reject-reason').value.trim();

  const res = await fetch(_withToken(`${API}/${encodeURIComponent(id)}?action=reject`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const err = await res.json();
    alert(`Reject failed: ${err.error}`);
    return;
  }

  closeRejectModal();
  closeDetailModal();
  await refresh();
}

// ── Complete ──
async function completeTicket(id) {
  const res = await fetch(_withToken(`${API}/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  });
  
  if (!res.ok) {
    const err = await res.json();
    alert(`Complete failed: ${err.error}`);
    return;
  }
  
  closeDetailModal();
  await refresh();
}

// ── Delete ──
async function deleteTicket(id) {
  if (!confirm(`Delete ticket ${id}? This cannot be undone.`)) return;
  await fetch(_withToken(`${API}/${encodeURIComponent(id)}`), { method: 'DELETE' });
  closeDetailModal();
  await refresh();
}

// ── Utils ──
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Keyboard ──
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCreateModal();
    closeDetailModal();
    closeSignoffModal();
    closeRejectModal();
  }
  if (e.key === 'n' && !e.target.matches('input, textarea, select')) {
    e.preventDefault();
    openCreateModal();
  }
});

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  refresh();
  // Auto-refresh every 30s
  setInterval(refresh, 30000);
});
