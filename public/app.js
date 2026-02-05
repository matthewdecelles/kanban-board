const API_BASE = '/api';
let tasks = [];
let currentView = 'kanban';
let priorityFilter = 'all'; // 'all', 'urgent', 'important', 'normal'

// Priority order for sorting (higher = more urgent)
const PRIORITY_ORDER = {
  critical: 5,
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1
};

// Priority grouping for filter
function getPriorityGroup(task) {
  const p = task.priority;
  const hasImportantTag = task.tags && task.tags.includes('important');
  
  if (p === 'critical' || p === 'urgent') return 'urgent';
  if (p === 'high' || hasImportantTag) return 'important';
  return 'normal';
}

// Filter tasks by priority
function filterByPriority(taskList) {
  if (priorityFilter === 'all') return taskList;
  return taskList.filter(t => getPriorityGroup(t) === priorityFilter);
}

// Set priority filter
function setPriorityFilter(filter) {
  priorityFilter = filter;
  if (currentView === 'kanban') {
    renderBoard();
  } else {
    renderTableView();
  }
  updateCounts();
}

// Category definitions
const CATEGORIES = {
  wp: { name: 'William Painter', icon: '🕶️' },
  acquisitions: { name: 'Acquisitions', icon: '🎯' },
  personal: { name: 'Personal', icon: '🏠' },
  wedding: { name: 'Wedding', icon: '💒' },
  finance: { name: 'Finance', icon: '💰' },
  health: { name: 'Health', icon: '🏋️' },
  '': { name: 'Uncategorized', icon: '📦' }
};

const ASSIGNEES = {
  matt: { name: 'Matt', color: 'matt' },
  patrick: { name: 'Patrick', color: 'patrick' },
  amy: { name: 'Amy', color: 'amy' },
  stanley: { name: 'Stanley', color: 'stanley' },
  kelly: { name: 'Kelly', color: 'kelly' },
  brittany: { name: 'Brittany', color: 'brittany' }
};

// API Functions
async function fetchTasks() {
  const res = await fetch(`${API_BASE}/tasks`);
  tasks = await res.json();
  // Normalize tags to array
  tasks = tasks.map(t => ({
    ...t,
    tags: Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? (() => { try { return JSON.parse(t.tags); } catch { return t.tags.split(',').map(s => s.trim()).filter(Boolean); } })() : [])
  }));
  
  // Render the current view
  if (currentView === 'kanban') {
    renderBoard();
  } else {
    renderTableView();
  }
  updateCounts();
}

async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  const stats = await res.json();
  renderStats(stats);
}

async function createTask(task) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return res.json();
}

async function updateTask(id, updates) {
  const res = await fetch(`${API_BASE}/tasks?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

async function deleteTaskApi(id) {
  await fetch(`${API_BASE}/tasks?id=${id}`, { method: 'DELETE' });
}

async function moveTaskApi(id, status, position) {
  const res = await fetch(`${API_BASE}/tasks?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, position })
  });
  return res.json();
}

// View Toggle
function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  document.getElementById('board').style.display = view === 'kanban' ? 'flex' : 'none';
  document.getElementById('table-view').style.display = view === 'table' ? 'block' : 'none';
  
  if (view === 'kanban') {
    renderBoard();
  } else {
    renderTableView();
  }
}

// Render Functions
function renderBoard() {
  const columns = ['backlog', 'todo', 'in_progress', 'done'];

  columns.forEach(status => {
    const container = document.getElementById(`tasks-${status}`);
    let columnTasks = tasks
      .filter(t => t.status === status)
      .filter(t => !(t.tags && t.tags.includes('stanley')));
    
    // Apply priority filter
    columnTasks = filterByPriority(columnTasks);
    
    // Sort by priority (highest first), then by position
    columnTasks.sort((a, b) => {
      const priorityDiff = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return a.position - b.position;
    });

    container.innerHTML = columnTasks.map(task => createTaskCard(task)).join('');
  });

  setupDragAndDrop();
}

// Table View with Category Groups
function renderTableView() {
  const container = document.getElementById('table-container');
  let filteredTasks = tasks.filter(t => !(t.tags && t.tags.includes('stanley')));
  
  // Apply priority filter
  filteredTasks = filterByPriority(filteredTasks);
  
  // Group by category
  const grouped = {};
  filteredTasks.forEach(task => {
    const cat = task.category || '';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(task);
  });
  
  // Sort categories - uncategorized last
  const sortedCats = Object.keys(grouped).sort((a, b) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return (CATEGORIES[a]?.name || a).localeCompare(CATEGORIES[b]?.name || b);
  });
  
  let html = '';
  sortedCats.forEach(cat => {
    const catTasks = grouped[cat];
    const catInfo = CATEGORIES[cat] || { name: cat || 'Uncategorized', icon: '📦' };
    const done = catTasks.filter(t => t.status === 'done').length;
    const total = catTasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    
    html += `
      <div class="category-group${cat === '' ? ' uncategorized' : ''}" data-category="${cat}">
        <div class="category-header" onclick="toggleCategory('${cat}')">
          <div class="category-title">
            <span class="category-icon">${catInfo.icon}</span>
            <span>${catInfo.name}</span>
            <span style="color: var(--text-secondary); font-weight: 400; font-size: 0.85rem;">${total} tasks</span>
          </div>
          <div class="category-meta">
            <div class="progress-indicator">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${pct}%"></div>
              </div>
              <span>${done}/${total}</span>
            </div>
            <span class="collapse-icon">▼</span>
          </div>
        </div>
        <div class="category-content">
          <table class="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${catTasks.sort((a, b) => {
                // Sort by priority first (highest first), then by status
                const priorityDiff = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
                if (priorityDiff !== 0) return priorityDiff;
                const statusOrder = { in_progress: 0, todo: 1, backlog: 2, done: 3 };
                return (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
              }).map(task => `
                <tr>
                  <td class="task-title-cell" onclick="openModal(${task.id})">${escapeHtml(task.title)}</td>
                  <td><span class="status-badge ${task.status}">${formatStatus(task.status)}</span></td>
                  <td>${task.assignee ? `<span class="assignee-badge ${task.assignee}">${ASSIGNEES[task.assignee]?.name || task.assignee}</span>` : '<span style="color: var(--text-secondary)">—</span>'}</td>
                  <td><span class="priority-badge priority-${task.priority}">${task.priority}</span></td>
                  <td>${task.due_date ? formatDueDateShort(task.due_date) : '<span style="color: var(--text-secondary)">—</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html || '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No tasks yet. Click "+ New Task" to get started.</p>';
}

function toggleCategory(cat) {
  const group = document.querySelector(`.category-group[data-category="${cat}"]`);
  if (group) {
    group.classList.toggle('collapsed');
  }
}

function formatStatus(status) {
  const labels = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
  return labels[status] || status;
}

function formatDueDateShort(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isOverdue = date < today;
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  return `<span class="due-date${isOverdue ? ' overdue' : ''}">${formatted}</span>`;
}

function createTaskCard(task) {
  const priorityClass = `priority-${task.priority}`;
  const dueDateHtml = task.due_date ? formatDueDate(task.due_date) : '';

  // Check if task has "important" tag
  const hasImportant = task.tags && task.tags.includes('important');
  const importantBadge = hasImportant ? '<span class="priority-badge priority-important">important</span>' : '';

  // Add priority class for tinted cards
  // Urgent/Critical = red, High/Important = yellow
  let cardClass = '';
  if (task.priority === 'critical' || task.priority === 'urgent') cardClass = ' urgent';
  else if (task.priority === 'high' || hasImportant) cardClass = ' important';
  
  // Assignee badge
  const assigneeHtml = task.assignee && ASSIGNEES[task.assignee] 
    ? `<span class="assignee-badge ${task.assignee}">${ASSIGNEES[task.assignee].name}</span>` 
    : '';
  
  // Filter out "important" from regular tags display
  const regularTags = task.tags ? task.tags.filter(t => t !== 'important') : [];
  const tagsHtml = regularTags.length > 0
    ? `<div class="task-tags">${regularTags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';


  return `
    <div class="task-card${cardClass}" draggable="true" data-id="${task.id}" onclick="openModal(${task.id})">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-meta">
        <span class="priority-badge ${priorityClass}">${task.priority}</span>
        ${importantBadge}
        ${assigneeHtml}
        ${dueDateHtml}
      </div>
      ${tagsHtml}
    </div>
  `;
}

function formatDueDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const dueDate = new Date(dateStr + 'T00:00:00');
  let className = '';
  let label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (dueDate < today) {
    className = 'overdue';
  } else if (dueDate < nextWeek) {
    className = 'due-soon';
  }

  return `<span class="due-date ${className}">${label}</span>`;
}

function updateCounts() {
  const columns = ['backlog', 'todo', 'in_progress', 'done'];
  columns.forEach(status => {
    let columnTasks = tasks
      .filter(t => t.status === status)
      .filter(t => !(t.tags && t.tags.includes('stanley')));
    columnTasks = filterByPriority(columnTasks);
    document.getElementById(`count-${status}`).textContent = columnTasks.length;
  });
}

function renderStats(stats) {
  const statsEl = document.getElementById('stats');
  let html = `
    <span class="stat-item">Total: ${stats.total}</span>
    <span class="stat-item">Backlog: ${stats.backlog}</span>
    <span class="stat-item">To Do: ${stats.todo}</span>
    <span class="stat-item">In Progress: ${stats.in_progress}</span>
    <span class="stat-item">Done: ${stats.done}</span>
  `;

  if (stats.overdue > 0) {
    html += `<span class="stat-item overdue">Overdue: ${stats.overdue}</span>`;
  }

  if (stats.urgent > 0) {
    html += `<span class="stat-item urgent">Urgent: ${stats.urgent}</span>`;
  }

  statsEl.innerHTML = html;
}

// Modal Functions
function openModal(taskId = null) {
  const modal = document.getElementById('modal-overlay');
  const form = document.getElementById('task-form');
  const title = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('delete-btn');
  const completeBtn = document.getElementById('complete-btn');

  form.reset();
  document.getElementById('task-id').value = '';

  if (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      title.textContent = 'Edit Task';
      deleteBtn.style.display = 'block';
      completeBtn.style.display = task.status !== 'done' ? 'block' : 'none';
      document.getElementById('task-id').value = task.id;
      document.getElementById('title').value = task.title;
      document.getElementById('description').value = task.description || '';
      document.getElementById('priority').value = task.priority;
      document.getElementById('status').value = task.status;
      document.getElementById('due_date').value = task.due_date || '';
      document.getElementById('tags').value = (task.tags || []).join(', ');
      document.getElementById('assignee').value = task.assignee || '';
      document.getElementById('category').value = task.category || '';
    }
  } else {
    title.textContent = 'New Task';
    deleteBtn.style.display = 'none';
    completeBtn.style.display = 'none';
  }

  modal.classList.add('active');
  document.getElementById('title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

async function saveTask(event) {
  event.preventDefault();

  const taskId = document.getElementById('task-id').value;
  const taskData = {
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    priority: document.getElementById('priority').value,
    status: document.getElementById('status').value,
    due_date: document.getElementById('due_date').value || null,
    assignee: document.getElementById('assignee').value || null,
    category: document.getElementById('category').value || null,
    tags: document.getElementById('tags').value
      .split(',')
      .map(t => t.trim())
      .filter(t => t)
  };

  if (taskId) {
    await updateTask(taskId, taskData);
  } else {
    await createTask(taskData);
  }

  closeModal();
  await fetchTasks();
  await fetchStats();
}

async function completeTask() {
  const taskId = document.getElementById('task-id').value;
  if (taskId) {
    await updateTask(taskId, { status: 'done' });
    closeModal();
    await fetchTasks();
    await fetchStats();
  }
}

async function deleteTask() {
  const taskId = document.getElementById('task-id').value;
  if (taskId && confirm('Are you sure you want to delete this task?')) {
    await deleteTaskApi(taskId);
    closeModal();
    await fetchTasks();
    await fetchStats();
  }
}

// Drag and Drop
let columnsInitialized = false;

function setupDragAndDrop() {
  // Attach drag listeners to new cards (cards get recreated on each render)
  const cards = document.querySelectorAll('.task-card');
  cards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });

  // Only attach column listeners once (columns are stable DOM elements)
  if (!columnsInitialized) {
    const columns = document.querySelectorAll('.tasks');
    columns.forEach(column => {
      column.addEventListener('dragover', handleDragOver);
      column.addEventListener('dragenter', handleDragEnter);
      column.addEventListener('dragleave', handleDragLeave);
      column.addEventListener('drop', handleDrop);
    });
    columnsInitialized = true;
  }
}

let draggedCard = null;

function handleDragStart(e) {
  draggedCard = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.tasks').forEach(col => {
    col.classList.remove('active');
  });
  draggedCard = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  this.classList.add('active');
}

function handleDragLeave(e) {
  if (!this.contains(e.relatedTarget)) {
    this.classList.remove('active');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('active');

  const taskId = e.dataTransfer.getData('text/plain');
  const column = this.closest('.column');
  const newStatus = column.dataset.status;

  // Calculate new position
  const cards = Array.from(this.querySelectorAll('.task-card'));
  const dropY = e.clientY;
  let newPosition = 0;

  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    const cardMiddle = rect.top + rect.height / 2;
    if (dropY > cardMiddle) {
      newPosition = i + 1;
    }
  }

  await moveTaskApi(taskId, newStatus, newPosition);
  await fetchTasks();
  await fetchStats();
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
  if (e.key === 'n' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    openModal();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchTasks();
  fetchStats();
});
