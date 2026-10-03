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

    // Linear-inspired Spotlight Glow Cards mouse tracking (Homepage & Category Hubs)
    const glowGrids = document.querySelectorAll('#category-cards, .tools-grid');
    glowGrids.forEach((grid) => {
      const cards = grid.querySelectorAll('.category-glow-card, .tool-card');
      grid.addEventListener('mousemove', (e) => {
        for (const card of cards) {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--mouse-x', `${x}px`);
          card.style.setProperty('--mouse-y', `${y}px`);
        }
      });
    });

    // Initialize Hero Section Breathe Waves
    initHeroWaves();

    // Initialize Hero Instant Search & Tool Finder
    initHeroSearch();

    // Initialize Mobile Hamburger Menu & Frosted Navigation Drawer
    initMobileNavigation();
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
        id: 'image-converter',
        title: 'Image Format Converter',
        category: 'Convertors',
        url: 'convertors/image-converter/',
        icon: 'lucide:image',
        tags: ['image', 'photo', 'picture', 'converter', 'format', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'bmp', 'ico', 'compress', 'scale', 'resize']
      },
      {
        id: 'video-converter',
        title: 'Video Format Converter',
        category: 'Convertors',
        url: 'convertors/video-converter/',
        icon: 'lucide:refresh-cw',
        tags: ['video', 'format', 'converter', 'transcode', 'mp4', 'webm', 'mov', 'mkv', 'avi', 'audio', 'extract', 'trim', 'compress', 'resolution', 'fps']
      },
      {
        id: 'video-to-gif',
        title: 'Video to GIF Converter',
        category: 'Convertors',
        url: 'convertors/video-to-gif/',
        icon: 'lucide:film',
        tags: ['video', 'gif', 'mp4', 'webm', 'mov', 'convert', 'animation', 'trim', 'clip', 'maker', 'generator']
      },
      {
        id: 'gif-to-video',
        title: 'GIF to Video Converter',
        category: 'Convertors',
        url: 'convertors/gif-to-video/',
        icon: 'lucide:video',
        tags: ['gif', 'video', 'mp4', 'webm', 'convert', 'animation', 'loop', 'instagram', 'tiktok', 'discord']
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
        id: 'mailto-generator',
        title: 'Mailto Link Creator',
        category: 'Utility',
        url: 'utility/mailto-generator/',
        icon: 'lucide:mail',
        tags: ['mailto', 'email', 'link', 'generator', 'creator', 'html', 'href', 'contact', 'composer', 'message', 'support']
      },
      {
        id: 'gif-speed-changer',
        title: 'GIF Speed Changer',
        category: 'Utility',
        url: 'utility/gif-speed-changer/',
        icon: 'lucide:gauge',
        tags: ['gif', 'speed', 'changer', 'fast', 'slow', 'slowmo', 'hyper', 'fps', 'accelerate', 'playback', 'rate', 'multiplier', 'time', 'tempo']
      },
      {
        id: 'whatsapp-link-creator',
        title: 'WhatsApp Link Creator',
        category: 'Utility',
        url: 'utility/whatsapp-link-creator/',
        icon: 'lucide:message-circle',
        tags: ['whatsapp', 'wa.me', 'chat', 'link', 'generator', 'creator', 'message', 'click to chat', 'phone', 'contact', 'direct']
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
        id: 'cat-web',
        title: 'Web Tools',
        category: 'Workspace',
        url: 'web/',
        icon: 'lucide:globe',
        tags: ['web', 'url', 'cleaner', 'parameter', 'query', 'separator', 'link', 'http', 'dns']
      },
      {
        id: 'url-parameter-separator',
        title: 'URL Parameter Separator',
        category: 'Web',
        url: 'web/url-parameter-separator/',
        icon: 'lucide:link-2',
        tags: ['url', 'parameter', 'cleaner', 'query', 'separator', 'utm', 'tracking', 'strip', 'link', 'sanitize']
      },
      {
        id: 'favicon-extractor',
        title: 'Website Favicon Extractor',
        category: 'Web',
        url: 'web/favicon-extractor/',
        icon: 'lucide:globe',
        tags: ['favicon', 'extractor', 'downloader', 'google', 'icon', 'website', 'touch icon', 'apple', 'grabber', 'pwa']
      },
      {
        id: 'youtube-thumbnail-downloader',
        title: 'YouTube Thumbnail Downloader',
        category: 'Web',
        url: 'web/youtube-thumbnail-downloader/',
        icon: 'lucide:youtube',
        tags: ['youtube', 'thumbnail', 'downloader', 'hd', '1080p', 'image', 'cover', 'shorts', 'video', 'download']
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

    /**
     * Stemming, spelling normalization, and synonym expansion dictionary
     */
    const SYNONYM_MAP = {
      'convertor': 'converter',
      'convertors': 'converter',
      'convert': 'converter',
      'converting': 'converter',
      'downloader': 'download',
      'downloading': 'download',
      'extractor': 'extract',
      'extracting': 'extract',
      'generator': 'generate',
      'generating': 'generate',
      'creator': 'create',
      'creating': 'create',
      'separator': 'separate',
      'separating': 'separate',
      'changer': 'change',
      'changing': 'change',
      'formatter': 'format',
      'formatting': 'format',
      'yt': 'youtube',
      'wa': 'whatsapp',
      'qr': 'qr code',
      'pic': 'image',
      'picture': 'image',
      'photo': 'image',
      'vid': 'video',
      'icon': 'favicon',
      'ico': 'favicon',
      'cleaner': 'separator',
      'params': 'parameter',
      'utm': 'parameter'
    };

    function normalizeWord(word) {
      const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      return SYNONYM_MAP[clean] || clean;
    }

    /**
     * Calculate Levenshtein Distance for typo tolerance (e.g. "convertr" -> "converter")
     */
    function levenshteinDistance(a, b) {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    }

    /**
     * Check if token fuzzy matches any target word in target list
     */
    function fuzzyMatchToken(queryToken, targetWords) {
      const normQuery = normalizeWord(queryToken);
      if (!normQuery) return 0;

      for (const target of targetWords) {
        const normTarget = normalizeWord(target);
        if (!normTarget) continue;

        if (normTarget === normQuery) return 100;
        if (normTarget.startsWith(normQuery) || normQuery.startsWith(normTarget)) return 80;
        if (normTarget.includes(normQuery)) return 60;
        
        if (normQuery.length >= 4 && normTarget.length >= 4) {
          const dist = levenshteinDistance(normQuery, normTarget);
          if (dist === 1) return 50;
          if (dist === 2 && normQuery.length >= 6) return 30;
        }
      }
      return 0;
    }

    /**
     * Calculate multi-token relevance score for a tool against a search query
     */
    function calculateRelevanceScore(item, rawQuery) {
      const queryClean = rawQuery.toLowerCase().trim();
      const rawTokens = queryClean.split(/\s+/).filter(Boolean);
      if (rawTokens.length === 0) return 0;

      const titleLower = item.title.toLowerCase();
      const categoryLower = item.category.toLowerCase();
      
      if (titleLower === queryClean) return 1000;
      if (titleLower.startsWith(queryClean)) return 800;

      const titleWords = titleLower.split(/[\s\-_\/]+/).filter(Boolean);
      const categoryWords = categoryLower.split(/[\s\-_\/]+/).filter(Boolean);
      const tagWords = (item.tags || []).map(t => t.toLowerCase());

      let totalTokenScore = 0;
      let matchedTokensCount = 0;

      for (const token of rawTokens) {
        const titleScore = fuzzyMatchToken(token, titleWords);
        if (titleScore > 0) {
          totalTokenScore += titleScore * 2.5;
          matchedTokensCount++;
          continue;
        }

        const tagScore = fuzzyMatchToken(token, tagWords);
        if (tagScore > 0) {
          totalTokenScore += tagScore * 1.8;
          matchedTokensCount++;
          continue;
        }

        const catScore = fuzzyMatchToken(token, categoryWords);
        if (catScore > 0) {
          totalTokenScore += catScore * 1.2;
          matchedTokensCount++;
          continue;
        }
      }

      if (rawTokens.length > 1 && matchedTokensCount === rawTokens.length) {
        totalTokenScore += 200;
      } else if (matchedTokensCount === 0) {
        return 0;
      }

      if (!item.id.startsWith('cat-')) {
        totalTokenScore += 15;
      }

      return totalTokenScore;
    }

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

      const results = REGISTRY
        .map(item => ({ item, score: calculateRelevanceScore(item, query) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(r => r.item);

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

  /**
   * Designed by Kapil Pidhwani: Mobile Navigation & Frosted Drawer Controller
   * Seamlessly provides a frosted slide-down category drawer for mobile devices across all pages.
   */
  function initMobileNavigation() {
    const navRight = document.querySelector('.nav-right');
    const header = document.querySelector('.site-header');
    if (!navRight || !header) return;

    // 1. Create or bind mobile menu toggle button in header
    let toggleBtn = document.getElementById('mobile-menu-toggle');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'mobile-menu-toggle';
      toggleBtn.className = 'btn-icon-pill';
      toggleBtn.type = 'button';
      toggleBtn.setAttribute('aria-label', 'Toggle mobile navigation menu');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = '<iconify-icon id="mobile-menu-icon" icon="lucide:menu" width="18" height="18"></iconify-icon>';
      navRight.appendChild(toggleBtn);
    }

    // 2. Create or bind mobile drawer
    let drawer = document.getElementById('mobile-nav-drawer');
    let backdrop = document.getElementById('mobile-nav-backdrop');

    if (!drawer) {
      // Find relative root path based on desktop links
      const sampleLink = document.querySelector('.nav-links a');
      let rootPrefix = '';
      if (sampleLink) {
        const href = sampleLink.getAttribute('href') || '';
        if (href.startsWith('../../')) rootPrefix = '../../';
        else if (href.startsWith('../')) rootPrefix = '../';
        else if (href.startsWith('/')) rootPrefix = '/';
      }

      // Find active page
      const activeLink = document.querySelector('.nav-links a.active');
      const activeHref = activeLink ? (activeLink.getAttribute('href') || '') : '';

      const categories = [
        { title: 'Home', href: rootPrefix === '' ? './' : rootPrefix, icon: 'lucide:home', key: 'home' },
        { title: 'Dev', href: `${rootPrefix}dev/`, icon: 'lucide:code-2', key: 'dev' },
        { title: 'Text', href: `${rootPrefix}text/`, icon: 'lucide:file-text', key: 'text' },
        { title: 'Web', href: `${rootPrefix}web/`, icon: 'lucide:globe', key: 'web' },
        { title: 'Design', href: `${rootPrefix}design/`, icon: 'lucide:palette', key: 'design' },
        { title: 'Utility', href: `${rootPrefix}utility/`, icon: 'lucide:wrench', key: 'utility' },
        { title: 'Convertors', href: `${rootPrefix}convertors/`, icon: 'lucide:arrow-left-right', key: 'convertors' },
        { title: 'Formatters', href: `${rootPrefix}formatters/`, icon: 'lucide:align-left', key: 'formatters' },
        { title: 'Others', href: `${rootPrefix}others/`, icon: 'lucide:sparkles', key: 'others' }
      ];

      drawer = document.createElement('div');
      drawer.id = 'mobile-nav-drawer';
      drawer.className = 'mobile-nav-drawer';
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-label', 'Mobile Navigation');

      let gridHtml = '';
      categories.forEach(cat => {
        let isActive = false;
        if (activeHref.includes(cat.key)) {
          isActive = true;
        } else if (cat.key === 'home' && (activeHref === '/' || activeHref === './' || activeHref === '' || activeHref.endsWith('index.html') && !activeHref.includes('/'))) {
          isActive = true;
        }

        gridHtml += `
          <a href="${cat.href}" class="mobile-nav-link ${isActive ? 'active' : ''}">
            <iconify-icon icon="${cat.icon}"></iconify-icon>
            <span>${cat.title}</span>
          </a>
        `;
      });

      drawer.innerHTML = `
        <div class="mobile-nav-content">
          <div class="mobile-nav-grid">
            ${gridHtml}
          </div>
          <div class="mobile-nav-footer-links">
            <a href="${rootPrefix}about/" class="mobile-nav-sublink">About</a>
            <a href="${rootPrefix}web/url-parameter-separator/" class="mobile-nav-sublink">URL Cleaner</a>
            <a href="${rootPrefix}utility/qr-code-generator/" class="mobile-nav-sublink">QR Generator</a>
            <a href="${rootPrefix}utility/mailto-generator/" class="mobile-nav-sublink">Mailto Creator</a>
            <a href="${rootPrefix}utility/whatsapp-link-creator/" class="mobile-nav-sublink">WhatsApp Link</a>
            <a href="${rootPrefix}utility/gif-speed-changer/" class="mobile-nav-sublink">GIF Speed</a>
            <a href="${rootPrefix}convertors/video-to-gif/" class="mobile-nav-sublink">Video to GIF</a>
            <a href="${rootPrefix}convertors/gif-to-video/" class="mobile-nav-sublink">GIF to Video</a>
            <a href="${rootPrefix}privacy/" class="mobile-nav-sublink">Privacy</a>
            <a href="${rootPrefix}credits/" class="mobile-nav-sublink">Credits</a>
          </div>
        </div>
      `;

      header.after(drawer);

      backdrop = document.createElement('div');
      backdrop.id = 'mobile-nav-backdrop';
      backdrop.className = 'mobile-nav-backdrop';
      drawer.after(backdrop);
    }

    const menuIcon = document.getElementById('mobile-menu-icon');

    function openMenu() {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      if (menuIcon) menuIcon.setAttribute('icon', 'lucide:x');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      if (menuIcon) menuIcon.setAttribute('icon', 'lucide:menu');
      document.body.style.overflow = '';
    }

    function toggleMenu() {
      if (drawer.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    toggleBtn.addEventListener('click', toggleMenu);
    backdrop.addEventListener('click', closeMenu);

    // Close when clicking any nav link
    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeMenu();
      }
    });

    // Close on resize to desktop width
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && drawer.classList.contains('open')) {
        closeMenu();
      }
    });
  }
})();
