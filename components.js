// ============================================================
//  components.js — the shared header + nav, defined once.
//  Drop <site-header></site-header> and
//  <site-nav active="exercise-list"></site-nav> onto any page.
//  To add a page to the menu, add one entry to LINKS below.
// ============================================================

const LINKS = [
  {
    key: 'exercise-list', href: 'exercise-list.html', label: 'Exercises',
    icon: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  },
  {
    key: 'workout-logs', href: 'workout-logs.html', label: 'Logs',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'
  },
  {
    key: 'analytics', href: 'analytics.html', label: 'Stats',
    icon: '<path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/>'
  },
]

class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="site-header">
        <a href="index.html" class="logo-link">
          <div class="logo-wrap">
            <img src="logo.png" alt="SweatSheet logo"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <span class="logo-fallback" style="display:none;">SS</span>
          </div>
        </a>
      </header>`
  }
}

class SiteNav extends HTMLElement {
  connectedCallback() {
    const active = this.getAttribute('active') || ''
    this.innerHTML = `
      <nav class="site-nav">
        ${LINKS.map(l => `
          <a href="${l.href}" class="${l.key === active ? 'active' : ''}">
            <svg viewBox="0 0 24 24">${l.icon}</svg>
            <span>${l.label}</span>
          </a>`).join('')}
      </nav>`
  }
}

customElements.define('site-header', SiteHeader)
customElements.define('site-nav', SiteNav)
