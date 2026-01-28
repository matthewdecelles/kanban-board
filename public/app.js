const API_BASE = '/api';
let tasks = [];

// API Functions
async function fetchTasks() {
  const res = await fetch(`${API_BASE}/tasks`);
  tasks = await res.json();
  // Convert tags string to array
  tasks = tasks.map(t => ({
    ...t,
    tags: t.tags ? t.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
  }));
  renderBoard();
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
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

async function deleteTaskApi(id) {
  await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
}

async function moveTaskApi(id, status, position) {
  const res = await fetch(`${API_BASE}/tasks/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, position })
  });
  return res.json();
}

// Render Functions
function renderBoard() {
  const columns = ['backlog', 'todo', 'in_progress', 'done'];

  columns.forEach(status => {
    const container = document.getElementById(`tasks-${status}`);
    const columnTasks = tasks
      .filter(t => t.status === status)
      .sort((a, b) => a.position - b.position);

    container.innerHTML = columnTasks.map(task => createTaskCard(task)).join('');
  });

  setupDragAndDrop();
}

function createTaskCard(task) {
  const priorityClass = `priority-${task.priority}`;
  const dueDateHtml = task.due_date ? formatDueDate(task.due_date) : '';
  const tagsHtml = task.tags && task.tags.length > 0
    ? `<div class="task-tags">${task.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  return `
    <div class="task-card" draggable="true" data-id="${task.id}" onclick="openModal(${task.id})">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-meta">
        <span class="priority-badge ${priorityClass}">${task.priority}</span>
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
    const count = tasks.filter(t => t.status === status).length;
    document.getElementById(`count-${status}`).textContent = count;
  });
}

function renderStats(stats) {
  const statsEl = document.getElementById('stats');
  let html = `
    <span class="stat-item">Total: ${stats.total}</span>
  `;

  if (stats.overdue > 0) {
    html += `<span class="stat-item overdue">Overdue: ${stats.overdue}</span>`;
  }

  if (stats.urgent > 0) {
    html += `<span class="stat-item">Urgent: ${stats.urgent}</span>`;
  }

  statsEl.innerHTML = html;
}

// Modal Functions
function openModal(taskId = null) {
  const modal = document.getElementById('modal-overlay');
  const form = document.getElementById('task-form');
  const title = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('delete-btn');

  form.reset();
  document.getElementById('task-id').value = '';

  if (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      title.textContent = 'Edit Task';
      deleteBtn.style.display = 'block';
      document.getElementById('task-id').value = task.id;
      document.getElementById('title').value = task.title;
      document.getElementById('description').value = task.description || '';
      document.getElementById('priority').value = task.priority;
      document.getElementById('status').value = task.status;
      document.getElementById('due_date').value = task.due_date || '';
      document.getElementById('tags').value = (task.tags || []).join(', ');
    }
  } else {
    title.textContent = 'New Task';
    deleteBtn.style.display = 'none';
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
function setupDragAndDrop() {
  const cards = document.querySelectorAll('.task-card');
  const columns = document.querySelectorAll('.tasks');

  cards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });

  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragenter', handleDragEnter);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
  });
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
