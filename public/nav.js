// ===== Command Center Navigation Bar =====
(function() {
  const tabs = [
    { icon: '🏠', label: 'Home', href: '/mission.html' },
    { icon: '✅', label: 'Tasks',           href: '/index.html' },
    { icon: '🎫', label: 'Tickets',         href: '/tickets.html' },
    { icon: '📁', label: 'Projects',        href: '/projects.html' },
    { icon: '🧠', label: 'Memory',          href: '/memory.html' },
    { icon: '📄', label: 'Docs',            href: '/docs.html' },
    { icon: '⚡', label: 'Stanley',         href: '/stanley.html' },
    { icon: '📊', label: 'Dashboard', href: 'https://stanley-dashboard.vercel.app', external: true },
  ];

  const path = window.location.pathname;

  const nav = document.createElement('nav');
  nav.className = 'cc-nav';
  nav.innerHTML = `
    <a class="cc-nav-brand" href="/mission.html">⚡</a>
    <div class="cc-nav-tabs">
      ${tabs.map(t => {
        const isActive = !t.external && (path === t.href || (t.href === '/mission.html' && path === '/'));
        const target = t.external ? ' target="_blank"' : '';
        return `<a class="cc-nav-tab${isActive ? ' active' : ''}" href="${t.href}"${target}>
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
