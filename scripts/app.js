/* Designed by Kapil Pidhwani: Main Application Controller for Toolity.in */

import { CATEGORIES, TOOL_REGISTRY } from './tools/tool-registry.js';
import { Utils } from './utils.js';

class ToolityApp {
  constructor() {
    this.tools = TOOL_REGISTRY;
    this.categories = CATEGORIES;
    this.activeCategory = 'all';
    this.searchQuery = '';

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderCategories();
    this.renderTools();
  }

  setupEventListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTools();
      }, 150));
    }

    // Global keyboard shortcut for search (⌘K or Ctrl+K)
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInput?.focus();
      }
    });
  }

  renderCategories() {
    const categoryBar = document.getElementById('category-filter-bar');
    if (!categoryBar) return;

    categoryBar.innerHTML = this.categories.map(cat => `
      <button 
        class="filter-chip ${cat.id === this.activeCategory ? 'active' : ''}" 
        data-category="${cat.id}"
      >
        <span>${cat.icon}</span> ${cat.label}
      </button>
    `).join('');

    categoryBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      
      this.activeCategory = chip.dataset.category;
      
      categoryBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      this.renderTools();
    });
  }

  getFilteredTools() {
    return this.tools.filter(tool => {
      const matchesCategory = this.activeCategory === 'all' || tool.category === this.activeCategory;
      const matchesSearch = !this.searchQuery || 
        tool.title.toLowerCase().includes(this.searchQuery) ||
        tool.description.toLowerCase().includes(this.searchQuery) ||
        tool.tags.some(tag => tag.toLowerCase().includes(this.searchQuery));

      return matchesCategory && matchesSearch;
    });
  }

  renderTools() {
    const toolsGrid = document.getElementById('tools-grid');
    if (!toolsGrid) return;

    const filtered = this.getFilteredTools();

    if (filtered.length === 0) {
      toolsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No tools matched your search query</p>
          <small>Try searching for json, base64, hash, or formatters</small>
        </div>
      `;
      return;
    }

    toolsGrid.innerHTML = filtered.map(tool => `
      <a href="/tools/${tool.id}.html" class="tool-card">
        <div class="tool-card-header">
          <div class="tool-icon-wrapper">${tool.icon}</div>
          <span class="tool-category-tag">${tool.category}</span>
        </div>
        <h3 class="tool-title">${Utils.escapeHTML(tool.title)}</h3>
        <p class="tool-description">${Utils.escapeHTML(tool.description)}</p>
      </a>
    `).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.Toolity = new ToolityApp();
});
