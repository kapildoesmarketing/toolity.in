/* Designed by Kapil Pidhwani: Theme Management & Core Site Interactions for Toolity.in */

(function () {
  const THEME_STORAGE_KEY = 'toolity_theme';

  /**
   * Determine the initial theme from localStorage or system preference
   */
  function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Apply the theme to document and update toggle button icon
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.setAttribute('icon', theme === 'dark' ? 'lucide:sun' : 'lucide:moon');
    }
  }

  // Initial Theme Application before render to avoid flash
  const initialTheme = getPreferredTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);

  document.addEventListener('DOMContentLoaded', () => {
    // Sync icon state with applied theme
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      themeIcon.setAttribute('icon', currentTheme === 'dark' ? 'lucide:sun' : 'lucide:moon');
    }

    // Bind theme toggle button
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
      });
    }

    // Listen for OS theme changes if user hasn't explicitly set a preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });

    // Handle transparent header frosted effect on scroll
    const header = document.querySelector('.site-header');
    const handleScroll = () => {
      if (header) {
        header.classList.toggle('scrolled', window.scrollY > 20);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Linear-inspired Spotlight Glow Cards mouse tracking
    const categoryGrid = document.getElementById('category-cards');
    if (categoryGrid) {
      const cards = categoryGrid.getElementsByClassName('category-glow-card');
      categoryGrid.addEventListener('mousemove', (e) => {
        for (const card of cards) {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--mouse-x', `${x}px`);
          card.style.setProperty('--mouse-y', `${y}px`);
        }
      });
    }

    // Initialize Hero Section Breathe Waves
    initHeroWaves();

    // Initialize Hero Instant Search & Tool Finder
    initHeroSearch();
  });

  /**
   * Deisgned by Kapil Pidhwani: Hero Minimalist Fast Search & Tool Launcher
   * Background-free, ultra-fast top 3 results launcher with keyboard navigation.
   */
  function initHeroSearch() {
    const searchContainer = document.getElementById('hero-search-container');
    const searchInput = document.getElementById('hero-search-input');
    const resultsDropdown = document.getElementById('hero-search-results');
    const clearBtn = document.getElementById('search-clear-btn');
    const searchBtn = document.getElementById('minimal-search-btn');

    if (!searchInput || !resultsDropdown) return;

    const REGISTRY = [
      {
        id: 'video-to-gif',
        title: 'Video to GIF Converter',
        category: 'Convertors',
        url: 'convertors/video-to-gif/',
        icon: 'lucide:film',
        tags: ['video', 'gif', 'mp4', 'webm', 'mov', 'convert', 'animation', 'trim', 'clip', 'maker', 'generator']
      },
      {
        id: 'qr-generator',
        title: 'QR Code Generator',
        category: 'Utility',
        url: 'utility/qr-code-generator/',
        icon: 'lucide:qr-code',
        tags: ['qr', 'code', 'barcode', 'generator', 'wifi', 'url', 'png', 'svg', 'vcard', 'text']
      },
      {
        id: 'cat-dev',
        title: 'Developer Tools',
        category: 'Workspace',
        url: 'dev/',
        icon: 'lucide:code-2',
        tags: ['dev', 'developer', 'json', 'base64', 'hash', 'code', 'jwt', 'curl']
      },
      {
        id: 'cat-text',
        title: 'Text Utilities',
        category: 'Workspace',
        url: 'text/',
        icon: 'lucide:file-text',
        tags: ['text', 'case', 'words', 'diff', 'markdown', 'slug', 'strings', 'count']
      },
      {
        id: 'cat-math',
        title: 'Math & Calculations',
        category: 'Workspace',
        url: 'math/',
        icon: 'lucide:binary',
        tags: ['math', 'calculate', 'percentage', 'statistics', 'formula', 'number']
      },
      {
        id: 'cat-design',
        title: 'Design Tools',
        category: 'Workspace',
        url: 'design/',
        icon: 'lucide:palette',
        tags: ['design', 'color', 'contrast', 'palette', 'gradient', 'css', 'ui']
      },
      {
        id: 'cat-utility',
        title: 'Everyday Utilities',
        category: 'Workspace',
        url: 'utility/',
        icon: 'lucide:wrench',
        tags: ['utility', 'qr', 'uuid', 'timer', 'stopwatch', 'random', 'tools']
      },
      {
        id: 'cat-convertors',
        title: 'Convertors',
        category: 'Workspace',
        url: 'convertors/',
        icon: 'lucide:arrow-left-right',
        tags: ['convert', 'units', 'timestamp', 'base', 'transform', 'distance']
      },
      {
        id: 'cat-formatters',
        title: 'Formatters',
        category: 'Workspace',
        url: 'formatters/',
        icon: 'lucide:align-left',
        tags: ['format', 'beautify', 'minify', 'sql', 'xml', 'html', 'json', 'css', 'prettier']
      },
      {
        id: 'cat-others',
        title: 'Other Micro-Tools',
        category: 'Workspace',
        url: 'others/',
        icon: 'lucide:sparkles',
        tags: ['other', 'misc', 'experimental', 'niche', 'tools']
      }
    ];

    let selectedIndex = -1;
    let currentResults = [];

    function openDropdown() {
      resultsDropdown.style.display = 'flex';
    }

    function closeDropdown() {
      resultsDropdown.style.display = 'none';
      selectedIndex = -1;
    }

    function highlightSelected() {
      const items = resultsDropdown.querySelectorAll('.minimal-result-item');
      items.forEach((item, index) => {
        item.classList.toggle('selected', index === selectedIndex);
        if (index === selectedIndex) {
          item.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function renderResults(items) {
      currentResults = items;
      selectedIndex = -1;

      if (items.length === 0) {
        resultsDropdown.innerHTML = `
          <div class="minimal-search-empty">
            No tools found matching "<strong>${escapeHtml(searchInput.value)}</strong>"
          </div>
        `;
        openDropdown();
        return;
      }

      let html = '';
      items.forEach((item, index) => {
        html += `
          <a href="${item.url}" class="minimal-result-item" data-index="${index}">
            <div class="minimal-result-title">
              <iconify-icon icon="${item.icon}" width="16" height="16"></iconify-icon>
              <span>${escapeHtml(item.title)}</span>
            </div>
            <iconify-icon icon="lucide:arrow-right" class="minimal-result-arrow" width="15" height="15"></iconify-icon>
          </a>
        `;
      });

      resultsDropdown.innerHTML = html;
      openDropdown();
    }

    function handleSearch() {
      const query = searchInput.value.trim().toLowerCase();
      if (clearBtn) {
        clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
      }

      if (!query) {
        closeDropdown();
        currentResults = [];
        return;
      }

      const results = REGISTRY.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const categoryMatch = item.category.toLowerCase().includes(query);
        const tagMatch = item.tags.some((tag) => tag.toLowerCase().includes(query));
        return titleMatch || categoryMatch || tagMatch;
      });

      // Show strictly top 3 results
      renderResults(results.slice(0, 3));
    }

    searchInput.addEventListener('input', handleSearch);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        closeDropdown();
        searchInput.focus();
      });
    }

    function triggerNavigate() {
      if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
        window.location.href = currentResults[selectedIndex].url;
      } else if (currentResults.length > 0) {
        window.location.href = currentResults[0].url;
      } else if (searchInput.value.trim().length > 0) {
        // Jump to explore categories if nothing matches
        const categoriesSection = document.getElementById('categories');
        if (categoriesSection) {
          categoriesSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', triggerNavigate);
    }

    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentResults.length > 0) {
          selectedIndex = (selectedIndex + 1) % currentResults.length;
          highlightSelected();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentResults.length > 0) {
          selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
          highlightSelected();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerNavigate();
      } else if (e.key === 'Escape') {
        closeDropdown();
        searchInput.blur();
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (searchContainer && !searchContainer.contains(e.target)) {
        closeDropdown();
      }
    });

    // Global shortcut: ⌘K, Ctrl+K, or "/"
    window.addEventListener('keydown', (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      if (isCmdK || isSlash) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  /**
   * Deisgned by Kapil Pidhwani: Ambient Organic Waves for Hero Section
   * Adapted mathematical ribbon harmonics from Breathe mode with zero mouse tracking and battery-efficient offscreen throttling.
   */
  function initHeroWaves() {
    const canvas = document.getElementById('hero-waves-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let animId = null;
    let isVisible = true;

    // Harmonic wave parameters matching Breathe mode in inspiration
    // [yc, a (base amplitude), fm (frequency), sp (speed), hue, sat, darkLit, darkOp, lightHue, lightSat, lightLit, lightOp]
    const waveLayers = [
      [0.82, 115, 0.78, 0.000082, 20, 65, 10, 0.56, 18, 85, 86, 0.46],
      [0.76, 95,  1.02, 0.000115, 24, 68, 13, 0.47, 21, 88, 83, 0.40],
      [0.70, 76,  1.28, 0.000152, 21, 62, 16, 0.39, 19, 84, 80, 0.35],
      [0.64, 60,  1.58, 0.000192, 27, 60, 19, 0.32, 24, 82, 78, 0.30],
      [0.58, 48,  1.98, 0.000238, 19, 56, 22, 0.26, 18, 80, 76, 0.25],
      [0.53, 38,  2.48, 0.000285, 23, 52, 25, 0.20, 22, 78, 74, 0.20],
      [0.48, 28,  3.20, 0.000338, 20, 49, 28, 0.15, 19, 75, 72, 0.16],
      [0.44, 20,  4.10, 0.000398, 22, 45, 31, 0.11, 23, 72, 70, 0.12],
      [0.40, 13,  5.30, 0.000468, 18, 41, 34, 0.08, 18, 70, 68, 0.09]
    ];

    // Synth crest accent lines [yc, a, fm, sp, op, width]
    const synthLines = [
      [0.65, 0.062, 1.28, 0.000048, 0.20, 1.0],
      [0.55, 0.040, 2.00, 0.000065, 0.15, 0.7],
      [0.72, 0.048, 0.98, 0.000036, 0.13, 0.6],
      [0.48, 0.026, 2.70, 0.000082, 0.11, 0.5],
      [0.60, 0.068, 0.80, 0.000033, 0.16, 0.9],
      [0.78, 0.036, 1.50, 0.000043, 0.11, 0.55]
    ];

    function resize() {
      dpr = window.devicePixelRatio || 1;
      const hero = canvas.parentElement || canvas;
      const rect = hero.getBoundingClientRect();
      W = rect.width || window.innerWidth;
      H = rect.height || window.innerHeight;

      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    function render(time) {
      if (!isVisible) return;

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const bs = (Math.sin(time * 0.0005) + 1) * 0.5; // Smooth ~12s natural breathing cycle

      // Base background fill
      ctx.fillStyle = isDark ? "#0e0904" : "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      // 1. Primary Warm Amber Radial Glow (Centered around middle-lower hero)
      const gr = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, W * 0.72);
      if (isDark) {
        gr.addColorStop(0, `rgba(232, 96, 38, ${0.08 + bs * 0.22})`);
        gr.addColorStop(0.42, `rgba(135, 48, 8, ${0.04 + bs * 0.10})`);
        gr.addColorStop(1, "transparent");
      } else {
        gr.addColorStop(0, `rgba(244, 81, 30, ${0.09 + bs * 0.05})`);
        gr.addColorStop(0.45, `rgba(255, 140, 60, ${0.05 + bs * 0.03})`);
        gr.addColorStop(1, "transparent");
      }
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);

      // 2. Secondary Diffuse Core Glow
      const gr2 = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, W * 0.48);
      if (isDark) {
        gr2.addColorStop(0, `rgba(210, 72, 18, ${0.06 + bs * 0.10})`);
        gr2.addColorStop(0.35, `rgba(150, 45, 10, ${0.03 + bs * 0.05})`);
        gr2.addColorStop(1, "transparent");
      } else {
        gr2.addColorStop(0, `rgba(255, 106, 42, ${0.07 + bs * 0.04})`);
        gr2.addColorStop(0.38, `rgba(255, 200, 160, ${0.04 + bs * 0.02})`);
        gr2.addColorStop(1, "transparent");
      }
      ctx.fillStyle = gr2;
      ctx.fillRect(0, 0, W, H);

      // 3. Layered Wave Ribbon Fills (Balanced Polyline Baseline Closure)
      waveLayers.forEach(([yc, a, fm, sp, hue, sat, darkLit, darkOp, lHue, lSat, lLit, lOp], i) => {
        const amp = a * (0.62 + 0.38 * bs);
        const yB = H * yc;

        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const nx = x / W;
          const ph = time * sp;
          const y =
            yB +
            Math.sin(nx * Math.PI * 2 * fm + ph * 7 + i * 0.5) * amp +
            Math.sin(nx * Math.PI * 3 * fm * 0.73 + ph * 5.2 + i * 1.2) * amp * 0.4;

          if (x === 0) ctx.moveTo(0, y);
          else ctx.lineTo(x, y);
        }

        // Full baseline closure across bottom for left/right visual balance
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();

        if (isDark) {
          ctx.fillStyle = `hsla(${hue}, ${sat}%, ${darkLit + bs * 15}%, ${darkOp + bs * 0.1})`;
        } else {
          ctx.fillStyle = `hsla(${lHue}, ${lSat}%, ${lLit}%, ${lOp + bs * 0.06})`;
        }
        ctx.fill();
      });

      // 4. Synth Crest Accent Lines
      synthLines.forEach(([yc, a, fm, sp, op, w], li) => {
        const yB = H * yc;
        const amp = H * a * (0.52 + 0.48 * bs);
        const ph = time * sp;

        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const nx = x / W;
          const y =
            yB +
            Math.sin(nx * Math.PI * 2 * fm + ph * 6 + li * 0.6) * amp +
            Math.sin(nx * Math.PI * 4 * fm * 0.6 + ph * 3.8 + li * 0.9) * amp * 0.35;

          if (x === 0) ctx.moveTo(0, y);
          else ctx.lineTo(x, y);
        }

        if (isDark) {
          ctx.strokeStyle = `rgba(245, 232, 212, ${op * (0.45 + 0.55 * bs)})`;
          ctx.lineWidth = w;
        } else {
          ctx.strokeStyle = `rgba(232, 70, 20, ${op * 1.35 * (0.65 + 0.35 * bs)})`;
          ctx.lineWidth = w * 1.15;
        }
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    }

    // Battery & CPU optimization: pause render loop when off-screen
    const heroSection = document.querySelector('.hero-section');
    if (heroSection && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!isVisible) {
              isVisible = true;
              animId = requestAnimationFrame(render);
            }
          } else {
            isVisible = false;
            if (animId) cancelAnimationFrame(animId);
          }
        });
      }, { threshold: 0.05 });
      observer.observe(heroSection);
    }

    animId = requestAnimationFrame(render);
  }
})();
