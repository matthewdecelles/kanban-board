// ===== Command Center Navigation Bar =====
(function() {
  const tabs = [
    { icon: '🏠', label: 'Mission Control', href: '/mission.html' },
    { icon: '✅', label: 'Tasks',           href: '/index.html' },
    { icon: '🎫', label: 'Tickets',         href: '/tickets.html' },
    { icon: '📁', label: 'Projects',        href: '/projects.html' },
    { icon: '🧠', label: 'Memory',          href: '/memory.html' },
    { icon: '📄', label: 'Docs',            href: '/docs.html' },
    { icon: '⚡', label: 'Stanley',         href: '/stanley.html' },
  ];

  const path = window.location.pathname;

  const nav = document.createElement('nav');
  nav.className = 'cc-nav';
  nav.innerHTML = `
    <a class="cc-nav-brand" href="https://stanley-dashboard.vercel.app" target="_blank">⚡ Command Center</a>
    <div class="cc-nav-tabs">
      ${tabs.map(t => {
        const isActive = path === t.href || (t.href === '/mission.html' && path === '/');
        return `<a class="cc-nav-tab${isActive ? ' active' : ''}" href="${t.href}">
          <span class="tab-icon">${t.icon}</span>
          <span class="tab-label">${t.label}</span>
        </a>`;
      }).join('')}
    </div>
  `;

  // Load nav CSS if not already loaded
  if (!document.querySelector('link[href="/nav.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/nav.css';
    document.head.appendChild(link);
  }

  // Insert at top of body
  document.body.insertBefore(nav, document.body.firstChild);
})();
