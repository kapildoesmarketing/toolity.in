/* Designed by Kapil Pidhwani: Theme Management & Core Site Interactions for Toolity.in */

(function () {

  /**
   * Designed by Kapil Pidhwani: HTML Partial Include System
   * Fetches /components/*.html partials and replaces [data-include] placeholders.
   * Requires HTTPS or a local dev server (file:// will not work).
   */
  async function loadIncludes() {
    const targets = document.querySelectorAll('[data-include]');
    if (!targets.length) return;
    await Promise.all([...targets].map(async (el) => {
      try {
        const res = await fetch(el.dataset.include);
        if (!res.ok) throw new Error(`Failed to load ${el.dataset.include}`);
        const html = await res.text();
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const scripts = tmp.querySelectorAll('script');
        const nodes = Array.from(tmp.childNodes);
        const category = el.dataset.category;
        el.replaceWith(...nodes);
        if (category) fillToolCta(nodes, category);

        scripts.forEach((oldScript) => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          if (oldScript.parentNode) {
            oldScript.parentNode.replaceChild(newScript, oldScript);
          }
        });
      } catch (e) {
        console.warn('[Toolity] Include failed:', e.message);
      }
    }));
  }

  /**
   * Designed by Kapil Pidhwani: Category metadata for the shared tool CTA partial.
   * One source of truth; /components/tool-cta.html reads from this via data-category.
   */
  const CATEGORY_META = {
    media:  { label: 'Toolity Media', title: 'Explore All Media Tools', cta: 'Explore Media Tools', desc: 'Image, video, GIF and audio tools — compress, convert, resize and tweak, all in your browser.' },
    docs:   { label: 'Toolity Docs', title: 'Explore All Docs Tools', cta: 'Explore Docs Tools', desc: 'Tools to compress, merge, convert and manage documents.' },
    labs:   { label: 'Toolity Labs', title: 'Explore All Labs Tools', cta: 'Explore Labs', desc: 'Quick everyday utilities — QR codes, link builders, converters and experiments.' },
    dev:    { label: 'Toolity Dev', title: 'Explore All Dev Tools', cta: 'Explore Dev Tools', desc: 'Tools for software engineers to format, minify, inspect and validate.' },
    data:    { label: 'Toolity Data', title: 'Explore All Data Tools', cta: 'Explore Data Tools', desc: 'Tools to parse and manipulate data.' },
    games:   { label: 'Toolity Games', title: 'Explore All Games', cta: 'Play More Games', desc: 'Quick browser games that run instantly — no download, no account.' },
    widgets: { label: 'Toolity Widgets', title: 'Explore All Widgets', cta: 'Explore Widgets', desc: 'Free embeddable widgets for Notion and websites — customise everything via URL parameters.' }
  };

  function fillToolCta(nodes, category) {
    const meta = CATEGORY_META[category];
    const root = nodes.find((n) => n.nodeType === 1 && n.classList && n.classList.contains('category-workspace-cta'));
    if (!meta || !root) return;
    const set = (sel, val) => { const el = root.querySelector(sel); if (el) el.textContent = val; };
    set('[data-cta="label"]', meta.label);
    set('[data-cta="title"]', meta.title);
    set('[data-cta="desc"]', meta.desc);
    set('[data-cta="btn"]', meta.cta);
    const link = root.querySelector('a[data-cta="link"]');
    if (link) link.href = `/${category}/`;
  }

  /**
   * Designed by Kapil Pidhwani: Active Nav Link Highlighter
   * Sets .active on the correct nav link based on the first URL path segment.
   * Reads data-nav attributes injected by /components/header.html.
   */
  function setActiveNav() {
    const segment = location.pathname.split('/').filter(Boolean)[0] || '';
    const link = document.querySelector(`.nav-link[data-nav="${segment}"]`);
    if (link) link.classList.add('active');
  }

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

  function initSite() {
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

    // Set active nav link from injected header partial
    setActiveNav();

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

    // Initialize Mobile Hamburger Menu & Frosted Navigation Drawer (creates the drawer search block)
    initMobileNavigation();

    // Initialize site-wide search (header popover + mobile drawer)
    initSiteSearch();

    // /tools/ A–Z index (no-op on every other page)
    initToolsIndex();
    initBlogPost();

    // Designed by Kapil Pidhwani: any <button data-copy="text"> copies its value (Contact, Press). One delegated listener.
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;
      navigator.clipboard.writeText(btn.dataset.copy)
        .then(() => showGlobalToast('Copied: ' + btn.dataset.copy))
        .catch(() => showGlobalToast(btn.dataset.copy));
    });

    // WebMCP: expose Toolity to in-browser AI agents — loaded only when the browser supports it
    if (document.modelContext || navigator.modelContext) {
      const s = document.createElement('script');
      s.src = '/scripts/webmcp.js?v=1.0';
      document.head.appendChild(s);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadIncludes().then(initSite);
  });

  /**
   * Designed by Kapil Pidhwani: one search block markup, injected into the header
   * (#nav-search, inline on desktop) and the top of the mobile drawer.
   */
  const SEARCH_HTML = `
    <div class="site-search" role="search">
      <div class="minimal-search-bar">
        <input type="text" class="minimal-search-input" placeholder="Search for a tool or category..."
          autocomplete="off" spellcheck="false" aria-label="Search tools">
        <div class="minimal-search-actions">
          <button type="button" class="minimal-action-btn minimal-clear-btn" aria-label="Clear search" title="Clear search" hidden>
            <iconify-icon icon="lucide:x" width="16" height="16"></iconify-icon>
          </button>
          <button type="button" class="minimal-action-btn minimal-submit-btn" aria-label="Search" title="Search">
            <iconify-icon icon="lucide:search" width="19" height="19"></iconify-icon>
          </button>
        </div>
      </div>
      <div class="minimal-search-results" role="listbox" hidden></div>
    </div>`;

  /**
   * Deisgned by Kapil Pidhwani: Site-wide Minimalist Fast Search & Tool Launcher
   * Top 3 results launcher with keyboard navigation; binds every .site-search block.
   * Header block is a real inline input; results drop down under it (Esc / click-outside handled in bindSearch).
   */
  function initSiteSearch() {
    const navSearch = document.getElementById('nav-search');
    if (navSearch && !navSearch.firstElementChild) {
      navSearch.innerHTML = SEARCH_HTML;
      navSearch.querySelector('.minimal-search-input').placeholder = 'Search tools…'; // 200px pill; drawer keeps the long one
    }
    const roots = document.querySelectorAll('.site-search'); // may be empty; registry is still exposed for WebMCP

    const REGISTRY = [
      {
        id: 'image-to-favicon',
        title: 'Image to Favicon Converter',
        category: 'Media',
        url: 'media/image-to-favicon/',
        icon: 'lucide:sparkles',
        tags: ['favicon', 'ico', 'image to favicon', 'apple touch icon', 'png to ico', 'pwa', 'icon generator', 'website icon', 'convert', 'logo to favicon', 'favicon.ico']
      },
      {
        id: 'image-converter',
        title: 'Image Format Converter',
        category: 'Media',
        url: 'media/image-converter/',
        icon: 'lucide:image',
        tags: ['image', 'photo', 'picture', 'converter', 'format', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'bmp', 'ico', 'compress', 'scale', 'resize']
      },
      {
        id: 'video-converter',
        title: 'Video Format Converter',
        category: 'Media',
        url: 'media/video-converter/',
        icon: 'lucide:refresh-cw',
        tags: ['video', 'format', 'converter', 'transcode', 'mp4', 'webm', 'mov', 'mkv', 'avi', 'audio', 'extract', 'trim', 'compress', 'resolution', 'fps']
      },
      {
        id: 'video-to-gif',
        title: 'Video to GIF Converter',
        category: 'Media',
        url: 'media/video-to-gif/',
        icon: 'lucide:film',
        tags: ['video', 'gif', 'mp4', 'webm', 'mov', 'convert', 'animation', 'trim', 'clip', 'maker', 'generator']
      },
      {
        id: 'gif-to-video',
        title: 'GIF to Video Converter',
        category: 'Media',
        url: 'media/gif-to-video/',
        icon: 'lucide:video',
        tags: ['gif', 'video', 'mp4', 'webm', 'convert', 'animation', 'loop', 'instagram', 'tiktok', 'discord']
      },
      {
        id: 'qr-generator',
        title: 'QR Code Generator',
        category: 'Labs',
        url: 'labs/qr-code-generator/',
        icon: 'lucide:qr-code',
        tags: ['qr', 'code', 'barcode', 'generator', 'wifi', 'url', 'png', 'svg', 'vcard', 'text']
      },
      {
        id: 'audio-compressor',
        title: 'Audio Compressor',
        category: 'Media',
        url: 'media/audio-compressor/',
        icon: 'lucide:audio-lines',
        tags: ['audio', 'mp3', 'compress', 'compressor', 'shrink', 'reduce size', 'wav to mp3', 'm4a', 'ogg', 'flac', 'bitrate', 'podcast', 'voice memo']
      },
      {
        id: 'gif-compressor',
        title: 'GIF Compressor',
        category: 'Media',
        url: 'media/gif-compressor/',
        icon: 'lucide:image-down',
        tags: ['gif', 'compress', 'compressor', 'shrink', 'reduce size', 'animated gif', 'optimize gif', 'smaller gif', 'frames', 'colors']
      },
      {
        id: 'image-compressor',
        title: 'Image Compressor',
        category: 'Media',
        url: 'media/image-compressor/',
        icon: 'lucide:file-image',
        tags: ['image', 'compress', 'compressor', 'shrink', 'reduce size', 'jpg', 'jpeg', 'png', 'webp', 'optimize', 'photo', 'kb', 'target size', 'resize']
      },
      {
        id: 'pdf-compressor',
        title: 'PDF Compressor',
        category: 'Docs',
        url: 'docs/pdf-compressor/',
        icon: 'lucide:file-text',
        tags: ['pdf', 'compress', 'compressor', 'shrink', 'reduce size', 'scan', 'scanned pdf', 'optimize pdf', 'smaller pdf', 'dpi', 'email attachment']
      },
      {
        id: 'video-compressor',
        title: 'Video Compressor',
        category: 'Media',
        url: 'media/video-compressor/',
        icon: 'lucide:film',
        tags: ['video', 'compress', 'compressor', 'shrink', 'reduce size', 'mp4', 'mov', 'webm', 'bitrate', '720p', '480p', 'whatsapp video', 'email video', 'target size']
      },
      {
        id: 'organise-pdf',
        title: 'Organise PDF',
        category: 'Docs',
        url: 'docs/organise-pdf/',
        icon: 'lucide:layout-grid',
        tags: ['pdf', 'organise', 'organize', 'reorder', 'rearrange', 'move pages', 'delete pages', 'rotate pages', 'sort pages']
      },
      {
        id: 'pdf-merger',
        title: 'PDF Merger',
        category: 'Docs',
        url: 'docs/pdf-merger/',
        icon: 'lucide:files',
        tags: ['pdf', 'merge', 'merger', 'combine', 'join', 'append', 'concatenate', 'multiple pdfs']
      },
      {
        id: 'pdf-page-rotator',
        title: 'PDF Page Rotator',
        category: 'Docs',
        url: 'docs/pdf-page-rotator/',
        icon: 'lucide:rotate-cw',
        tags: ['pdf', 'rotate', 'rotator', 'rotation', 'sideways', 'landscape', 'portrait', 'fix orientation', 'scan']
      },
      {
        id: 'pdf-splitter',
        title: 'PDF Splitter',
        category: 'Docs',
        url: 'docs/pdf-splitter/',
        icon: 'lucide:scissors',
        tags: ['pdf', 'split', 'splitter', 'extract pages', 'page range', 'separate', 'zip', 'every page', 'divide']
      },
      {
        id: 'protect-pdf',
        title: 'Protect PDF',
        category: 'Docs',
        url: 'docs/protect-pdf/',
        icon: 'lucide:lock',
        tags: ['pdf', 'protect', 'password', 'encrypt', 'lock', 'secure', 'aes', 'permissions', 'no copy', 'no print']
      },
      {
        id: 'redact-pdf',
        title: 'Redact PDF',
        category: 'Docs',
        url: 'docs/redact-pdf/',
        icon: 'lucide:eye-off',
        tags: ['pdf', 'redact', 'redaction', 'black out', 'censor', 'hide text', 'remove sensitive', 'blackout', 'flatten']
      },
      {
        id: 'sign-pdf',
        title: 'Sign PDF',
        category: 'Docs',
        url: 'docs/sign-pdf/',
        icon: 'lucide:pen-line',
        tags: ['pdf', 'sign', 'signature', 'esign', 'e-signature', 'draw signature', 'initials', 'date stamp', 'fill and sign']
      },
      {
        id: 'unlock-pdf',
        title: 'Unlock PDF',
        category: 'Docs',
        url: 'docs/unlock-pdf/',
        icon: 'lucide:lock-open',
        tags: ['pdf', 'unlock', 'remove password', 'decrypt', 'restrictions', 'owner password', 'open password', 'unprotect']
      },
      {
        id: 'watermark-pdf',
        title: 'Watermark PDF',
        category: 'Docs',
        url: 'docs/watermark-pdf/',
        icon: 'lucide:stamp',
        tags: ['pdf', 'watermark', 'stamp', 'confidential', 'draft', 'logo', 'tiled', 'overlay text', 'brand']
      },
      {
        id: 'mailto-generator',
        title: 'Mailto Link Creator',
        category: 'Labs',
        url: 'labs/mailto-generator/',
        icon: 'lucide:mail',
        tags: ['mailto', 'email', 'link', 'generator', 'creator', 'html', 'href', 'contact', 'composer', 'message', 'support']
      },
      {
        id: 'gif-speed-changer',
        title: 'GIF Speed Changer',
        category: 'Media',
        url: 'media/gif-speed-changer/',
        icon: 'lucide:gauge',
        tags: ['gif', 'speed', 'changer', 'fast', 'slow', 'slowmo', 'hyper', 'fps', 'accelerate', 'playback', 'rate', 'multiplier', 'time', 'tempo']
      },
      {
        id: 'video-speed-changer',
        title: 'Video Speed Changer',
        category: 'Media',
        url: 'media/video-speed-changer/',
        icon: 'lucide:play-circle',
        tags: ['video', 'speed', 'changer', 'speed up video', 'slow motion', 'slowmo', 'timelapse', 'hyperlapse', 'fast forward', 'playback rate', 'tempo', 'accelerate', 'audio pitch', 'mp4', 'webm', 'mov']
      },
      {
        id: 'whatsapp-link-creator',
        title: 'WhatsApp Link Creator',
        category: 'Labs',
        url: 'labs/whatsapp-link-creator/',
        icon: 'lucide:message-circle',
        tags: ['whatsapp', 'wa.me', 'chat', 'link', 'generator', 'creator', 'message', 'click to chat', 'phone', 'contact', 'direct']
      },
      {
        id: 'online-notepad',
        title: 'Online Notepad',
        category: 'Docs',
        url: 'docs/online-notepad/',
        icon: 'lucide:file-edit',
        tags: ['notepad', 'online notepad', 'scratchpad', 'notes', 'text editor', 'memo', 'jotter', 'write', 'word count', 'character count', 'draft', 'clean text', 'pastebin', 'auto save', 'private note']
      },
      {
        id: 'json-visualizer',
        title: 'JSON Visualizer',
        category: 'Dev',
        url: 'dev/json-visualizer/',
        icon: 'lucide:binary',
        tags: ['json', 'visualizer', 'json visualizer', 'json tree', 'tree viewer', 'json explorer', 'json parser', 'json formatter', 'table', 'json to table', 'beautify', 'minify', 'repair', 'schema', 'api', 'path', 'jsonpath']
      },
      {
        id: 'cat-media',
        title: 'Media',
        category: 'Category',
        url: 'media/',
        icon: 'lucide:clapperboard',
        tags: ['media', 'image', 'photo', 'video', 'gif', 'audio', 'compress', 'convert', 'favicon', 'thumbnail']
      },
      {
        id: 'cat-docs',
        title: 'Docs',
        category: 'Category',
        url: 'docs/',
        icon: 'lucide:file-text',
        tags: ['docs', 'documents', 'pdf', 'merge', 'split', 'sign', 'watermark', 'notepad', 'text']
      },
      {
        id: 'cat-labs',
        title: 'Labs',
        category: 'Category',
        url: 'labs/',
        icon: 'lucide:flask-conical',
        tags: ['labs', 'utilities', 'qr', 'link', 'mailto', 'whatsapp', 'favicon', 'experiments', 'photo booth']
      },
      {
        id: 'cat-dev',
        title: 'Dev',
        category: 'Category',
        url: 'dev/',
        icon: 'lucide:code-2',
        tags: ['dev', 'developer', 'json', 'format', 'minify', 'validate', 'inspect', 'code']
      },
      {
        id: 'cat-data',
        title: 'Data',
        category: 'Category',
        url: 'data/',
        icon: 'lucide:database',
        tags: ['data', 'parse', 'url', 'parameters', 'query', 'csv', 'table', 'json', 'yaml', 'xml', 'convert', 'units', 'logs', 'extract']
      },
      {
        id: 'cat-games',
        title: 'Games',
        category: 'Category',
        url: 'games/',
        icon: 'lucide:gamepad-2',
        tags: ['games', 'play', 'arcade', 'puzzle', 'snake', 'tetris', '2048', 'pong', 'flappy', 'tic tac toe']
      },
      {
        id: 'image-color-extractor',
        title: 'Image Color Extractor',
        category: 'Media',
        url: 'media/image-color-extractor/',
        icon: 'lucide:palette',
        tags: ['color', 'colour', 'palette', 'extract', 'extractor', 'image colors', 'dominant color', 'color picker', 'eyedropper', 'hex', 'rgb', 'hsl', 'swatch', 'theme', 'brand colors', 'pipette']
      },
      {
        id: 'og-image-generator',
        title: 'OG Image Generator',
        category: 'Media',
        url: 'media/og-image-generator/',
        icon: 'lucide:share-2',
        tags: ['og', 'open graph', 'og image', 'social', 'social preview', 'twitter card', 'link preview', 'meta image', 'facebook', 'linkedin', '1200x630', 'thumbnail', 'share image', 'seo']
      },
      {
        id: 'placeholder-image-generator',
        title: 'Placeholder Image Generator',
        category: 'Media',
        url: 'media/placeholder-image-generator/',
        icon: 'lucide:image-plus',
        tags: ['placeholder', 'dummy image', 'mock image', 'image generator', 'blank image', 'sample image', 'png', 'jpg', 'webp', 'svg', 'banner', 'thumbnail', 'og image', 'lorem picsum', 'placehold']
      },
      {
        id: '2048',
        title: '2048',
        category: 'Games',
        url: 'games/2048/',
        icon: 'lucide:grid-2x2',
        tags: ['2048', 'puzzle', 'tiles', 'merge', 'numbers', 'slide', 'game', 'games', 'swipe']
      },
      {
        id: 'flappy-bird',
        title: 'Flappy Bird',
        category: 'Games',
        url: 'games/flappy-bird/',
        icon: 'lucide:bird',
        tags: ['flappy', 'flappy bird', 'bird', 'pipes', 'tap', 'arcade', 'game', 'games']
      },
      {
        id: 'snake',
        title: 'Snake',
        category: 'Games',
        url: 'games/snake/',
        icon: 'lucide:worm',
        tags: ['snake', 'nokia', 'arcade', 'grow', 'food', 'retro', 'game', 'games', 'swipe']
      },
      {
        id: 'tetris',
        title: 'Tetris',
        category: 'Games',
        url: 'games/tetris/',
        icon: 'lucide:layout-grid',
        tags: ['tetris', 'blocks', 'block puzzle', 'lines', 'tetromino', 'puzzle', 'game', 'games']
      },
      {
        id: 'tic-tac-toe',
        title: 'Tic Tac Toe',
        category: 'Games',
        url: 'games/tic-tac-toe/',
        icon: 'lucide:hash',
        tags: ['tic tac toe', 'tictactoe', 'noughts and crosses', 'xo', 'x and o', 'minimax', 'game', 'games', 'two player']
      },
      {
        id: 'pong',
        title: 'Pong',
        category: 'Games',
        url: 'games/pong/',
        icon: 'lucide:gamepad-2',
        tags: ['pong', 'game', 'games', 'arcade', 'ping pong', 'paddle', 'retro', 'two player', '2 player', 'play', 'fun']
      },
      {
        id: 'typing-speed-test',
        title: 'Typing Speed Test',
        category: 'Games',
        url: 'games/typing-speed-test/',
        icon: 'lucide:keyboard',
        tags: ["typing speed test","wpm test","typing test","words per minute","keyboard speed","touch typing","game","games"]
      },
      {
        id: 'sudoku',
        title: 'Sudoku',
        category: 'Games',
        url: 'games/sudoku/',
        icon: 'lucide:grid-3x3',
        tags: ["sudoku","number puzzle","9x9 sudoku","logic puzzle","daily sudoku","game","games"]
      },
      {
        id: 'minesweeper',
        title: 'Minesweeper',
        category: 'Games',
        url: 'games/minesweeper/',
        icon: 'lucide:bomb',
        tags: ["minesweeper","mine sweeper","logic game","puzzle game","windows minesweeper","game","games"]
      },
      {
        id: 'connect-four',
        title: 'Connect Four',
        category: 'Games',
        url: 'games/connect-four/',
        icon: 'lucide:circle-dot',
        tags: ["connect four","connect 4","four in a row","board game","2 player game","game","games"]
      },
      {
        id: 'checkers',
        title: 'Checkers',
        category: 'Games',
        url: 'games/checkers/',
        icon: 'lucide:disc-2',
        tags: ["checkers","draughts","board game","american checkers","2 player board game","game","games"]
      },
      {
        id: 'chess',
        title: 'Chess',
        category: 'Games',
        url: 'games/chess/',
        icon: 'lucide:crown',
        tags: ["chess","online chess","play chess vs computer","2 player chess","chess board","game","games"]
      },
      {
        id: 'sliding-puzzle',
        title: 'Sliding Puzzle',
        category: 'Games',
        url: 'games/sliding-puzzle/',
        icon: 'lucide:layout-grid',
        tags: ["sliding puzzle","15 puzzle","8 puzzle","tile puzzle","number slide game","game","games"]
      },
      {
        id: 'solitaire',
        title: 'Solitaire',
        category: 'Games',
        url: 'games/solitaire/',
        icon: 'lucide:spade',
        tags: ["solitaire","klondike solitaire","patience card game","playing cards","windows solitaire","game","games"]
      },
      {
        id: 'photo-booth',
        title: 'Photo Booth',
        category: 'Labs',
        url: 'labs/photo-booth/',
        icon: 'lucide:camera',
        tags: ['photo', 'booth', 'photobooth', 'strip', 'camera', 'selfie', 'stickers', 'frame', 'webcam', 'print', 'polaroid']
      },
      {
        id: 'url-parameter-separator',
        title: 'URL Parameter Separator',
        category: 'Data',
        url: 'data/url-parameter-separator/',
        icon: 'lucide:link-2',
        tags: ['url', 'parameter', 'cleaner', 'query', 'separator', 'utm', 'tracking', 'strip', 'link', 'sanitize']
      },
      {
        id: 'favicon-extractor',
        title: 'Website Favicon Extractor',
        category: 'Labs',
        url: 'labs/favicon-extractor/',
        icon: 'lucide:globe',
        tags: ['favicon', 'extractor', 'downloader', 'google', 'icon', 'website', 'touch icon', 'apple', 'grabber', 'pwa']
      },
      {
        id: 'image-metadata-remover',
        title: 'Image Metadata Remover',
        category: 'Media',
        url: 'media/image-metadata-remover/',
        icon: 'lucide:shield-off',
        tags: ['image', 'exif', 'remove exif', 'strip metadata', 'gps', 'location', 'privacy', 'clean photo', 'jpg', 'png', 'webp', 'scrub', 'anonymize']
      },
      {
        id: 'image-metadata-viewer',
        title: 'Image Metadata Viewer',
        category: 'Media',
        url: 'media/image-metadata-viewer/',
        icon: 'lucide:scan-search',
        tags: ['image', 'exif', 'exif viewer', 'metadata', 'gps', 'camera', 'photo info', 'inspect', 'xmp', 'iptc', 'jpg', 'png', 'webp']
      },
      {
        id: 'video-metadata-remover',
        title: 'Video Metadata Remover',
        category: 'Media',
        url: 'media/video-metadata-remover/',
        icon: 'lucide:shield-off',
        tags: ['video', 'metadata', 'remove', 'strip', 'gps', 'location', 'privacy', 'mp4', 'mov', 'webm', 'mkv', 'clean', 'anonymize']
      },
      {
        id: 'video-metadata-viewer',
        title: 'Video Metadata Viewer',
        category: 'Media',
        url: 'media/video-metadata-viewer/',
        icon: 'lucide:scan-search',
        tags: ['video', 'metadata', 'viewer', 'inspect', 'gps', 'codec', 'tracks', 'mp4', 'mov', 'webm', 'mkv', 'mediainfo']
      },
      {
        id: 'audio-metadata-remover',
        title: 'Audio Metadata Remover',
        category: 'Media',
        url: 'media/audio-metadata-remover/',
        icon: 'lucide:shield-off',
        tags: ['audio', 'id3', 'remove tags', 'strip', 'metadata', 'mp3', 'flac', 'wav', 'm4a', 'cover art', 'privacy', 'clean']
      },
      {
        id: 'audio-metadata-viewer',
        title: 'Audio Metadata Viewer',
        category: 'Media',
        url: 'media/audio-metadata-viewer/',
        icon: 'lucide:scan-search',
        tags: ['audio', 'id3', 'tag viewer', 'metadata', 'mp3', 'flac', 'wav', 'm4a', 'ogg', 'bitrate', 'inspect', 'cover art']
      },
      {
        id: 'pdf-metadata-remover',
        title: 'PDF Metadata Remover',
        category: 'Docs',
        url: 'docs/pdf-metadata-remover/',
        icon: 'lucide:shield-off',
        tags: ['pdf', 'metadata', 'remove author', 'strip', 'privacy', 'xmp', 'clean pdf', 'anonymize', 'document info']
      },
      {
        id: 'pdf-metadata-viewer',
        title: 'PDF Metadata Viewer',
        category: 'Docs',
        url: 'docs/pdf-metadata-viewer/',
        icon: 'lucide:scan-search',
        tags: ['pdf', 'metadata', 'viewer', 'author', 'producer', 'creator', 'inspect', 'document info', 'xmp', 'pdf properties']
      },
      {
        id: 'google-maps-embed-creator',
        title: 'Google Maps Embed Creator',
        category: 'Labs',
        url: 'labs/google-maps-embed-creator/',
        icon: 'lucide:map-pin',
        tags: ['google maps', 'embed', 'iframe', 'map', 'address', 'directions', 'responsive map', 'website map', 'location embed', 'no api key']
      },
      {
        id: 'add-to-calendar-link-creator',
        title: 'Add to Calendar Link Creator',
        category: 'Labs',
        url: 'labs/add-to-calendar-link-creator/',
        icon: 'lucide:calendar-plus',
        tags: ['calendar', 'add to calendar', 'google calendar link', 'outlook', 'office 365', 'yahoo', 'ics', 'ical', 'apple calendar', 'event link', 'invite', 'rrule']
      },
      {
        id: 'image-background-remover',
        title: 'Image Background Remover',
        category: 'Media',
        url: 'media/image-background-remover/',
        icon: 'lucide:scissors',
        tags: ['background remover', 'remove bg', 'transparent png', 'cut out', 'ai', 'matting', 'portrait', 'product photo', 'webgpu', 'transformers.js', 'modnet', 'birefnet']
      },
      {
        id: 'pomodoro-timer',
        title: 'Pomodoro Timer',
        category: 'Labs',
        url: 'labs/pomodoro-timer/',
        icon: 'lucide:timer',
        tags: ['pomodoro', 'timer', 'focus', 'productivity', 'tomato', 'study timer', 'work timer', 'break timer', 'task list', 'countdown']
      },
      {
        id: 'video-cropper',
        title: 'Video Cropper',
        category: 'Media',
        url: 'media/video-cropper/',
        icon: 'lucide:crop',
        tags: ['video', 'crop', 'cropper', 'aspect ratio', 'square', '9:16', 'reels', 'tiktok', 'shorts', 'instagram', '4:5', '16:9']
      },
      {
        id: 'video-looper',
        title: 'Video Looper',
        category: 'Media',
        url: 'media/video-looper/',
        icon: 'lucide:repeat',
        tags: ['video', 'loop', 'looper', 'repeat', 'boomerang', 'replay', 'seamless', 'gif-like']
      },
      {
        id: 'video-merger',
        title: 'Video Merger',
        category: 'Media',
        url: 'media/video-merger/',
        icon: 'lucide:combine',
        tags: ['video', 'merge', 'merger', 'join', 'combine', 'concatenate', 'stitch', 'clips', 'append']
      },
      {
        id: 'video-reverser',
        title: 'Video Reverser',
        category: 'Media',
        url: 'media/video-reverser/',
        icon: 'lucide:rewind',
        tags: ['video', 'reverse', 'reverser', 'backwards', 'rewind', 'boomerang', 'reverse audio', 'slow']
      },
      {
        id: 'video-rotator',
        title: 'Video Rotator',
        category: 'Media',
        url: 'media/video-rotator/',
        icon: 'lucide:rotate-cw',
        tags: ['video', 'rotate', 'rotator', '90 degrees', '180', 'flip', 'mirror', 'sideways', 'upside down', 'orientation']
      },
      {
        id: 'video-to-audio',
        title: 'Video to Audio Converter',
        category: 'Media',
        url: 'media/video-to-audio/',
        icon: 'lucide:music',
        tags: ['video to audio', 'video to mp3', 'extract audio', 'mp4 to mp3', 'mov to mp3', 'wav', 'soundtrack', 'audio extractor', 'rip audio']
      },
      {
        id: 'video-to-image-frames',
        title: 'Video to Image Frames',
        category: 'Media',
        url: 'media/video-to-image-frames/',
        icon: 'lucide:images',
        tags: ['video to image', 'frames', 'frame extractor', 'screenshot', 'stills', 'thumbnail', 'jpg', 'png', 'zip', 'contact sheet', 'video to jpg']
      },
      {
        id: 'video-trimmer',
        title: 'Video Trimmer',
        category: 'Media',
        url: 'media/video-trimmer/',
        icon: 'lucide:scissors',
        tags: ['video', 'trim', 'trimmer', 'cut', 'cutter', 'clip', 'shorten', 'start end', 'mp4 cutter', 'mov', 'webm']
      },
      {
        id: 'video-watermarker',
        title: 'Video Watermarker',
        category: 'Media',
        url: 'media/video-watermarker/',
        icon: 'lucide:stamp',
        tags: ['video', 'watermark', 'watermarker', 'logo', 'text overlay', 'brand', 'copyright', 'stamp', 'overlay', 'protect']
      },
      {
        id: 'gif-cropper',
        title: 'GIF Cropper',
        category: 'Media',
        url: 'media/gif-cropper/',
        icon: 'lucide:crop',
        tags: ['gif', 'crop', 'cropper', 'aspect ratio', 'square', '9:16', 'trim edges', 'animated']
      },
      {
        id: 'gif-looper',
        title: 'GIF Looper',
        category: 'Media',
        url: 'media/gif-looper/',
        icon: 'lucide:repeat',
        tags: ['gif', 'loop', 'looper', 'play once', 'repeat', 'loop count', 'netscape', 'infinite']
      },
      {
        id: 'gif-resizer',
        title: 'GIF Resizer',
        category: 'Media',
        url: 'media/gif-resizer/',
        icon: 'lucide:scaling',
        tags: ['gif', 'resize', 'resizer', 'scale', 'shrink', 'enlarge', 'width', 'height', 'percent', 'animated']
      },
      {
        id: 'gif-reverser',
        title: 'GIF Reverser',
        category: 'Media',
        url: 'media/gif-reverser/',
        icon: 'lucide:rewind',
        tags: ['gif', 'reverse', 'reverser', 'backwards', 'rewind', 'boomerang', 'loop']
      },
      {
        id: 'gif-splitter',
        title: 'GIF Splitter',
        category: 'Media',
        url: 'media/gif-splitter/',
        icon: 'lucide:split',
        tags: ['gif', 'split', 'splitter', 'cut', 'parts', 'chunks', 'divide', 'zip']
      },
      {
        id: 'gif-text-overlay',
        title: 'GIF Text Overlay',
        category: 'Media',
        url: 'media/gif-text-overlay/',
        icon: 'lucide:type',
        tags: ['gif', 'text', 'caption', 'meme', 'overlay', 'subtitle', 'impact', 'add text to gif', 'watermark']
      },
      {
        id: 'gif-to-images',
        title: 'GIF to Images',
        category: 'Media',
        url: 'media/gif-to-images/',
        icon: 'lucide:images',
        tags: ['gif', 'frames', 'gif to png', 'gif to jpg', 'extract frames', 'split frames', 'stills', 'zip', 'sprite']
      },
      {
        id: 'gif-trimmer',
        title: 'GIF Trimmer',
        category: 'Media',
        url: 'media/gif-trimmer/',
        icon: 'lucide:scissors',
        tags: ['gif', 'trim', 'trimmer', 'cut', 'shorten', 'frames', 'clip', 'animated']
      },
      {
        id: 'images-to-gif',
        title: 'Images to GIF Maker',
        category: 'Media',
        url: 'media/images-to-gif/',
        icon: 'lucide:film',
        tags: ['images to gif', 'gif maker', 'png to gif', 'jpg to gif', 'slideshow', 'animated gif', 'create gif', 'photos to gif']
      },
      {
        id: 'audio-converter',
        title: 'Audio Converter',
        category: 'Media',
        url: 'media/audio-converter/',
        icon: 'lucide:repeat',
        tags: ['audio', 'convert', 'converter', 'mp3', 'wav', 'm4a to mp3', 'flac to mp3', 'ogg', 'opus', 'sample rate', 'mono']
      },
      {
        id: 'audio-trimmer',
        title: 'Audio Trimmer',
        category: 'Media',
        url: 'media/audio-trimmer/',
        icon: 'lucide:scissors',
        tags: ['audio', 'trim', 'trimmer', 'cut', 'cutter', 'mp3 cutter', 'ringtone', 'clip', 'shorten']
      },
      {
        id: 'audio-merger',
        title: 'Audio Merger',
        category: 'Media',
        url: 'media/audio-merger/',
        icon: 'lucide:combine',
        tags: ['audio', 'merge', 'merger', 'join', 'joiner', 'combine', 'concatenate', 'mp3 joiner', 'playlist']
      },
      {
        id: 'audio-reverser',
        title: 'Audio Reverser',
        category: 'Media',
        url: 'media/audio-reverser/',
        icon: 'lucide:rewind',
        tags: ['audio', 'reverse', 'reverser', 'backwards', 'rewind', 'backmask', 'mp3']
      },
      {
        id: 'audio-speed-changer',
        title: 'Audio Speed Changer',
        category: 'Media',
        url: 'media/audio-speed-changer/',
        icon: 'lucide:gauge',
        tags: ['audio', 'speed', 'tempo', 'faster', 'slower', 'slow down', 'speed up', 'podcast', 'preserve pitch', 'time stretch']
      },
      {
        id: 'volume-booster',
        title: 'Volume Booster',
        category: 'Media',
        url: 'media/volume-booster/',
        icon: 'lucide:volume-2',
        tags: ['audio', 'volume', 'louder', 'boost', 'booster', 'normalize', 'normalise', 'gain', 'amplify', 'quiet']
      },
      {
        id: 'voice-recorder',
        title: 'Voice Recorder',
        category: 'Media',
        url: 'media/voice-recorder/',
        icon: 'lucide:mic',
        tags: ['voice', 'record', 'recorder', 'microphone', 'mic', 'dictation', 'memo', 'mp3 recorder', 'audio recorder']
      },
      {
        id: 'voice-changer',
        title: 'Voice Changer',
        category: 'Media',
        url: 'media/voice-changer/',
        icon: 'lucide:wand-2',
        tags: ['voice', 'changer', 'effects', 'pitch', 'deep voice', 'chipmunk', 'robot', 'echo', 'prank', 'disguise']
      },
      {
        id: 'audio-fade-in-out',
        title: 'Audio Fade In / Out',
        category: 'Media',
        url: 'media/audio-fade-in-out/',
        icon: 'lucide:trending-down',
        tags: ['audio', 'fade', 'fade in', 'fade out', 'crossfade', 'intro', 'outro', 'smooth ending', 'mp3']
      },
      {
        id: 'silence-remover',
        title: 'Silence Remover',
        category: 'Media',
        url: 'media/silence-remover/',
        icon: 'lucide:audio-lines',
        tags: ['audio', 'silence', 'remove silence', 'dead air', 'podcast', 'tighten', 'pauses', 'gaps', 'voice note', 'trim silence']
      },
      {
        id: 'youtube-thumbnail-downloader',
        title: 'YouTube Thumbnail Downloader',
        category: 'Media',
        url: 'media/youtube-thumbnail-downloader/',
        icon: 'lucide:youtube',
        tags: ['youtube', 'thumbnail', 'downloader', 'hd', '1080p', 'image', 'cover', 'shorts', 'video', 'download']
      },
      {
        id: 'images-to-pdf',
        title: 'Images to PDF',
        category: 'Docs',
        url: 'docs/images-to-pdf/',
        icon: 'lucide:images',
        tags: ['images to pdf', 'jpg to pdf', 'png to pdf', 'photo to pdf', 'webp to pdf', 'combine images', 'scan to pdf', 'picture to pdf', 'convert']
      },
      {
        id: 'pdf-to-images',
        title: 'PDF to Images',
        category: 'Docs',
        url: 'docs/pdf-to-images/',
        icon: 'lucide:image-down',
        tags: ['pdf to images', 'pdf to png', 'pdf to jpg', 'pdf to webp', 'export pages', 'render pdf', 'convert pdf', 'pdf to image']
      },
      {
        id: 'pdf-to-text',
        title: 'PDF to Text',
        category: 'Docs',
        url: 'docs/pdf-to-text/',
        icon: 'lucide:file-type',
        tags: ['pdf to text', 'extract text', 'pdf to txt', 'copy text from pdf', 'text layer', 'convert pdf to text', 'pdf text extractor']
      },
      {
        id: 'pdf-page-numberer',
        title: 'PDF Page Numberer',
        category: 'Docs',
        url: 'docs/pdf-page-numberer/',
        icon: 'lucide:list-ordered',
        tags: ['page numbers', 'number pages', 'pdf page numberer', 'add page numbers to pdf', 'pagination', 'footer', 'stamp numbers']
      },
      {
        id: 'pdf-metadata-editor',
        title: 'PDF Metadata Editor',
        category: 'Docs',
        url: 'docs/pdf-metadata-editor/',
        icon: 'lucide:file-pen-line',
        tags: ['pdf metadata editor', 'edit pdf title', 'change author', 'pdf properties', 'document info', 'keywords', 'xmp', 'edit metadata']
      },
      {
        id: 'pdf-cropper',
        title: 'PDF Cropper',
        category: 'Docs',
        url: 'docs/pdf-cropper/',
        icon: 'lucide:crop',
        tags: ['pdf cropper', 'crop pdf', 'trim margins', 'cropbox', 'cut pdf page', 'remove white space', 'crop pages']
      },
      {
        id: 'pdf-page-resizer',
        title: 'PDF Page Resizer',
        category: 'Docs',
        url: 'docs/pdf-page-resizer/',
        icon: 'lucide:scaling',
        tags: ['pdf page resizer', 'resize pdf', 'a4 to letter', 'letter to a4', 'change page size', 'scale pdf', 'paper size', 'a5 to a4']
      },
      {
        id: 'pdf-form-filler',
        title: 'PDF Form Filler',
        category: 'Docs',
        url: 'docs/pdf-form-filler/',
        icon: 'lucide:clipboard-pen',
        tags: ['pdf form filler', 'fill pdf form', 'acroform', 'fillable pdf', 'checkbox', 'dropdown', 'complete form', 'flatten form']
      },
      {
        id: 'pdf-flattener',
        title: 'PDF Flattener',
        category: 'Docs',
        url: 'docs/pdf-flattener/',
        icon: 'lucide:layers',
        tags: ['pdf flattener', 'flatten pdf', 'flatten form', 'merge annotations', 'rasterize pdf', 'lock pdf', 'non editable', 'print safe']
      },
      {
        id: 'grayscale-pdf',
        title: 'Grayscale PDF',
        category: 'Docs',
        url: 'docs/grayscale-pdf/',
        icon: 'lucide:contrast',
        tags: ['grayscale pdf', 'greyscale pdf', 'black and white pdf', 'convert pdf to grayscale', 'desaturate', 'monochrome', 'print friendly']
      },
      {
        id: 'url-cleaner',
        title: 'URL Cleaner',
        category: 'Labs',
        url: 'labs/url-cleaner/',
        icon: 'lucide:eraser',
        tags: ['url cleaner', 'remove utm', 'strip tracking parameters', 'fbclid', 'gclid', 'clean link', 'unshorten']
      },
      {
        id: 'url-encoder-decoder',
        title: 'URL Encoder Decoder',
        category: 'Labs',
        url: 'labs/url-encoder-decoder/',
        icon: 'lucide:code-2',
        tags: ['url encode', 'url decode', 'percent encoding', 'encodeURIComponent', 'urlencode', 'escape']
      },
      {
        id: 'open-graph-preview',
        title: 'Open Graph Preview',
        category: 'Labs',
        url: 'labs/open-graph-preview/',
        icon: 'lucide:share-2',
        tags: ['open graph preview', 'og preview', 'social share preview', 'twitter card', 'link preview', 'og:image', 'unfurl']
      },
      {
        id: 'meta-tag-extractor',
        title: 'Meta Tag Extractor',
        category: 'Labs',
        url: 'labs/meta-tag-extractor/',
        icon: 'lucide:tags',
        tags: ['meta tag extractor', 'meta tags checker', 'seo meta tags', 'canonical', 'robots meta', 'og tags', 'twitter card tags']
      },
      {
        id: 'redirect-checker',
        title: 'Redirect Checker',
        category: 'Labs',
        url: 'labs/redirect-checker/',
        icon: 'lucide:corner-down-right',
        tags: ['redirect checker', 'unshorten url', 'link expander', 'bit.ly expander', 'final url', '301 302 check', 'where does this link go']
      },
      {
        id: 'gradient-generator',
        title: 'Gradient Generator',
        category: 'Labs',
        url: 'labs/gradient-generator/',
        icon: 'lucide:blend',
        tags: ['gradient generator', 'css gradient', 'linear gradient', 'radial gradient', 'conic gradient', 'tailwind gradient', 'gradient png']
      },
      {
        id: 'color-palette-generator',
        title: 'Color Palette Generator',
        category: 'Labs',
        url: 'labs/color-palette-generator/',
        icon: 'lucide:palette',
        tags: ['color palette generator', 'colour palette', 'complementary colors', 'analogous', 'triadic', 'shades tints', 'css variables palette']
      },
      {
        id: 'contrast-checker',
        title: 'Contrast Checker',
        category: 'Labs',
        url: 'labs/contrast-checker/',
        icon: 'lucide:contrast',
        tags: ['contrast checker', 'wcag contrast', 'color contrast ratio', 'accessibility', 'aa aaa', 'a11y colors']
      },
      {
        id: 'color-converter',
        title: 'Color Converter',
        category: 'Labs',
        url: 'labs/color-converter/',
        icon: 'lucide:pipette',
        tags: ['color converter', 'hex to rgb', 'rgb to hex', 'hsl to hex', 'cmyk', 'oklch', 'hwb', 'color code converter']
      },
      {
        id: 'image-resizer',
        title: 'Image Resizer',
        category: 'Media',
        url: 'media/image-resizer/',
        icon: 'lucide:scaling',
        tags: ['image', 'resize', 'resizer', 'scale', 'dimensions', 'pixels', 'photo', 'shrink', 'enlarge', 'width', 'height', 'jpg', 'png', 'webp', 'instagram']
      },
      {
        id: 'image-cropper',
        title: 'Image Cropper',
        category: 'Media',
        url: 'media/image-cropper/',
        icon: 'lucide:crop',
        tags: ['image', 'crop', 'cropper', 'cut', 'trim', 'aspect ratio', 'square', 'photo', 'rotate', 'flip', 'instagram', 'profile picture']
      },
      {
        id: 'image-to-base64',
        title: 'Image to Base64',
        category: 'Media',
        url: 'media/image-to-base64/',
        icon: 'lucide:binary',
        tags: ['base64', 'data uri', 'data url', 'image to base64', 'encode', 'decode', 'base64 to image', 'css', 'html', 'embed', 'inline image', 'svg']
      },
      {
        id: 'image-negative-inverter',
        title: 'Image Negative Inverter',
        category: 'Media',
        url: 'media/image-negative-inverter/',
        icon: 'lucide:contrast',
        tags: ['invert', 'negative', 'inverter', 'invert colors', 'colour', 'photo negative', 'film negative', 'image', 'filter', 'grayscale', 'opposite colors']
      },
      {
        id: 'video-muter',
        title: 'Video Muter',
        category: 'Media',
        url: 'media/video-muter/',
        icon: 'lucide:volume-x',
        tags: ['video', 'mute', 'muter', 'remove audio', 'remove sound', 'silent video', 'no sound', 'strip audio', 'mp4', 'mov', 'webm', 'lossless']
      },
      {
        id: 'gif-rotator',
        title: 'GIF Rotator',
        category: 'Media',
        url: 'media/gif-rotator/',
        icon: 'lucide:rotate-cw',
        tags: ['gif', 'rotate', 'rotator', 'flip', 'mirror', 'turn', 'sideways', 'upside down', '90 degrees', 'animated gif', 'orientation']
      },
      {
        id: 'audio-normalizer',
        title: 'Audio Normalizer (LUFS)',
        category: 'Media',
        url: 'media/audio-normalizer/',
        icon: 'lucide:gauge',
        tags: ['lufs', 'normalize', 'normalizer', 'loudness', 'ebu r128', 'bs.1770', 'spotify', 'youtube', 'podcast', 'true peak', 'volume', 'mastering', 'gain']
      },
      {
        id: 'audio-equalizer',
        title: 'Audio Equalizer',
        category: 'Media',
        url: 'media/audio-equalizer/',
        icon: 'lucide:sliders-vertical',
        tags: ['equalizer', 'eq', 'bass boost', 'treble', 'vocals', 'frequency', 'audio', 'graphic eq', '10 band', 'tone', 'mp3', 'sound']
      },
      {
        id: 'audio-pitch-shifter',
        title: 'Audio Pitch Shifter',
        category: 'Media',
        url: 'media/audio-pitch-shifter/',
        icon: 'lucide:music-2',
        tags: ['pitch', 'pitch shifter', 'key change', 'transpose', 'semitone', 'cents', 'tuning', 'karaoke', 'voice', 'chipmunk', 'deep voice', 'audio']
      },
      {
        id: 'noise-reducer',
        title: 'Noise Reducer',
        category: 'Media',
        url: 'media/noise-reducer/',
        icon: 'lucide:audio-waveform',
        tags: ['noise', 'noise reduction', 'noise reducer', 'denoise', 'hiss', 'hum', 'background noise', 'podcast', 'voice', 'clean audio', 'remove noise', 'fan noise']
      },
      {
        id: 'audio-splitter',
        title: 'Audio Splitter',
        category: 'Media',
        url: 'media/audio-splitter/',
        icon: 'lucide:split',
        tags: ['split', 'splitter', 'cut', 'audio splitter', 'chunks', 'segments', 'silence', 'mp3 splitter', 'divide', 'zip', 'podcast', 'audiobook']
      },
      {
        id: 'audio-crossfader',
        title: 'Audio Crossfader',
        category: 'Media',
        url: 'media/audio-crossfader/',
        icon: 'lucide:blend',
        tags: ['crossfade', 'crossfader', 'blend', 'mix', 'transition', 'dj', 'fade', 'join songs', 'merge', 'audio', 'mixtape', 'segue']
      },
      {
        id: 'bpm-detector',
        title: 'Beat / BPM Detector',
        category: 'Media',
        url: 'media/bpm-detector/',
        icon: 'lucide:activity',
        tags: ['bpm', 'tempo', 'beat', 'bpm detector', 'beats per minute', 'tap tempo', 'dj', 'metronome', 'click track', 'song tempo', 'music', 'beat finder']
      },
      {
        id: 'audio-spectrum-visualizer',
        title: 'Audio Spectrum Visualizer',
        category: 'Media',
        url: 'media/audio-spectrum-visualizer/',
        icon: 'lucide:bar-chart-3',
        tags: ['spectrum', 'visualizer', 'audio visualizer', 'spectrogram', 'frequency', 'analyzer', 'fft', 'music video', 'waveform', 'equalizer bars', 'audiogram', 'video']
      },
      {
        id: 'text-to-speech',
        title: 'Text to Speech',
        category: 'Media',
        url: 'media/text-to-speech/',
        icon: 'lucide:speech',
        tags: ['text to speech', 'tts', 'read aloud', 'voice', 'speech', 'ai voice', 'narration', 'voiceover', 'mp3', 'kokoro', 'speak', 'audio']
      },
      {
        id: 'audio-waveform-image-generator',
        title: 'Audio Waveform Image Generator',
        category: 'Media',
        url: 'media/audio-waveform-image-generator/',
        icon: 'lucide:audio-lines',
        tags: ['waveform', 'waveform image', 'audio waveform', 'soundwave', 'png', 'svg', 'podcast art', 'audiogram', 'music art', 'visualization', 'sound wave', 'generator']
      },
      {
        id: 'camera',
        title: 'Camera',
        category: 'Labs',
        url: 'labs/camera/',
        icon: 'lucide:camera',
        tags: ['camera', 'webcam', 'take photo', 'selfie', 'record video', 'webcam recorder', 'online camera', 'front camera', 'mirror', 'timer', 'snapshot', 'phone camera']
      },
      {
        id: 'blob-maker',
        title: 'Blob Maker',
        category: 'Labs',
        url: 'labs/blob-maker/',
        icon: 'lucide:shapes',
        tags: ['blob maker', 'blob generator', 'svg blob', 'organic shape', 'animated blob', 'blob animation', 'svg shape', 'css blob', 'clip-path', 'background shape', 'hero background', 'morphing shape']
      },
      {
        id: 'json-converter',
        title: 'JSON Converter',
        category: 'Data',
        url: 'data/json-converter/',
        icon: 'lucide:braces',
        tags: ['json converter', 'json to csv', 'csv to json', 'json to yaml', 'yaml to json', 'xml to json', 'json to xml', 'toml', 'json to typescript', 'zod schema', 'markdown table', 'query string']
      },
      {
        id: 'unit-converter',
        title: 'Unit Converter',
        category: 'Data',
        url: 'data/unit-converter/',
        icon: 'lucide:ruler',
        tags: ['unit converter', 'length converter', 'weight converter', 'temperature converter', 'celsius to fahrenheit', 'km to miles', 'kg to lbs', 'mb to gb', 'area', 'volume', 'speed']
      },
      {
        id: 'csv-viewer-editor',
        title: 'CSV Viewer & Editor',
        category: 'Data',
        url: 'data/csv-viewer-editor/',
        icon: 'lucide:table',
        tags: ['csv viewer', 'csv editor', 'open csv online', 'csv to excel', 'csv to json', 'tsv viewer', 'remove duplicate rows', 'csv table', 'xlsx']
      },
      {
        id: 'text-extractor',
        title: 'Text Extractor',
        category: 'Data',
        url: 'data/text-extractor/',
        icon: 'lucide:scan-text',
        tags: ['email extractor', 'extract emails from text', 'phone number extractor', 'url extractor', 'link extractor', 'number extractor', 'hashtag extractor', 'text extractor']
      },
      {
        id: 'log-parser',
        title: 'Log Parser',
        category: 'Data',
        url: 'data/log-parser/',
        icon: 'lucide:scroll-text',
        tags: ['log parser', 'log viewer', 'log analyzer', 'nginx log analyzer', 'apache access log', 'syslog viewer', 'json logs', 'filter logs by level', 'log file viewer']
      },
      {
        id: 'share-link-generator',
        title: 'Share & Message Link Generator',
        category: 'Labs',
        url: 'labs/share-link-generator/',
        icon: 'lucide:share-2',
        tags: ['share link generator', 'social share links', 'whatsapp share link', 'telegram share link', 'twitter share link', 'facebook share link', 'linkedin share link', 'sms link', 'share buttons html']
      },
      {
        id: 'youtube-link-generator',
        title: 'YouTube Link & Embed Generator',
        category: 'Labs',
        url: 'labs/youtube-link-generator/',
        icon: 'lucide:youtube',
        tags: ['youtube timestamp link', 'youtube start time link', 'youtube embed code generator', 'youtube iframe', 'youtube embed autoplay', 'youtube loop embed', 'youtube-nocookie', 'youtube shorts embed', 'youtu.be link']
      },
      {
        id: 'password-generator',
        title: 'Password Generator',
        category: 'Labs',
        url: 'labs/password-generator/',
        icon: 'lucide:key-round',
        tags: ['password generator', 'strong password generator', 'random password', 'passphrase generator', 'diceware', 'pin generator', 'secure password', 'password strength']
      },
      {
        id: 'upi-qr-generator',
        title: 'UPI Payment QR Generator',
        category: 'Labs',
        url: 'labs/upi-qr-generator/',
        icon: 'lucide:indian-rupee',
        tags: ['upi qr code generator', 'upi qr', 'upi payment qr', 'google pay qr', 'phonepe qr', 'paytm qr', 'bhim upi qr', 'upi link generator', 'upi://pay', 'payment qr code']
      },
      {
        id: 'barcode-generator',
        title: 'Barcode Generator',
        category: 'Labs',
        url: 'labs/barcode-generator/',
        icon: 'lucide:barcode',
        tags: ['barcode generator', 'ean 13 generator', 'upc barcode generator', 'code 128 generator', 'code 39', 'itf-14', 'codabar', 'bulk barcode generator', 'barcode svg', 'barcode png']
      },
      {
        id: 'code-formatter',
        title: 'Code Formatter & Minifier',
        category: 'Dev',
        url: 'dev/code-formatter/',
        icon: 'lucide:wand-sparkles',
        tags: ['code formatter', 'code beautifier', 'prettier online', 'html formatter', 'css minifier', 'javascript minifier', 'js beautifier', 'sql formatter', 'xml formatter', 'json formatter', 'typescript formatter', 'minify code']
      },
      {
        id: 'markdown-studio',
        title: 'Markdown Studio',
        category: 'Dev',
        url: 'dev/markdown-studio/',
        icon: 'lucide:notebook-text',
        tags: ['markdown editor', 'markdown preview', 'markdown to html', 'html to markdown', 'markdown to pdf', 'md to html', 'readme preview', 'gfm', 'markdown converter', 'online markdown']
      },
      {
        id: 'regex-tester',
        title: 'Regex Tester',
        category: 'Dev',
        url: 'dev/regex-tester/',
        icon: 'lucide:regex',
        tags: ['regex tester', 'regular expression tester', 'regex online', 'javascript regex', 'regex match', 'regex replace', 'regex groups', 'named groups', 'regex cheat sheet', 'regexp']
      },
      {
        id: 'sql-on-csv',
        title: 'SQL on CSV',
        category: 'Data',
        url: 'data/sql-on-csv/',
        icon: 'lucide:database',
        tags: ['sql on csv', 'query csv with sql', 'csv sql', 'sqlite online', 'run sql on csv file', 'join csv files', 'csv group by', 'json sql query', 'csv to sqlite', 'sql playground']
      },
      {
        id: 'robots-sitemap-generator',
        title: 'Robots.txt & Sitemap Generator',
        category: 'Labs',
        url: 'labs/robots-sitemap-generator/',
        icon: 'lucide:bot',
        tags: ['robots.txt generator', 'sitemap generator', 'sitemap.xml', 'block ai crawlers', 'gptbot robots.txt', 'disallow', 'crawl-delay', 'xml sitemap', 'seo tools', 'robots txt']
      },
      {
        id: 'serp-snippet-preview',
        title: 'SERP Snippet Preview',
        category: 'Labs',
        url: 'labs/serp-snippet-preview/',
        icon: 'lucide:search',
        tags: ['serp preview', 'google snippet preview', 'meta title length', 'meta description length', 'title tag pixel width', 'serp simulator', 'search result preview', 'seo title checker', 'snippet optimizer']
      },
      {
        id: 'meta-tag-generator',
        title: 'Meta Tag Generator',
        category: 'Labs',
        url: 'labs/meta-tag-generator/',
        icon: 'lucide:code-xml',
        tags: ['meta tag generator', 'open graph generator', 'twitter card generator', 'meta tags', 'og tags', 'canonical tag', 'robots meta', 'head tags', 'seo meta tags', 'html meta generator']
      },
      {
        id: 'diff-checker',
        title: 'Diff Checker',
        category: 'Docs',
        url: 'docs/diff-checker/',
        icon: 'lucide:git-compare',
        tags: ['diff checker', 'text compare', 'compare two files', 'json diff', 'online diff tool', 'text difference', 'unified diff', 'side by side diff', 'compare text online', 'patch file']
      },
      {
        id: 'readability-scorer',
        title: 'Readability Scorer',
        category: 'Docs',
        url: 'docs/readability-scorer/',
        icon: 'lucide:glasses',
        tags: ['readability score', 'flesch reading ease', 'flesch kincaid grade', 'gunning fog', 'smog index', 'readability checker', 'reading level', 'passive voice checker', 'reading time calculator', 'text analysis']
      },
      {
        id: 'text-to-handwriting',
        title: 'Text to Handwriting',
        category: 'Labs',
        url: 'labs/text-to-handwriting/',
        icon: 'lucide:pen-line',
        tags: ['text to handwriting', 'handwriting converter', 'handwritten assignment', 'text to handwritten notes', 'handwriting generator', 'fake handwriting', 'handwriting font', 'ruled paper pdf', 'assignment writer', 'handwritten pdf']
      },
      {
        id: 'countdown-page-maker',
        title: 'Countdown Page Maker',
        category: 'Labs',
        url: 'labs/countdown-page-maker/',
        icon: 'lucide:timer',
        tags: ['countdown page', 'countdown timer link', 'event countdown', 'shareable countdown', 'launch countdown', 'exam countdown', 'wedding countdown', 'countdown qr code', 'countdown maker', 'days until']
      },
      {
        id: 'schema-markup-generator',
        title: 'Schema Markup Generator',
        category: 'Labs',
        url: 'labs/schema-markup-generator/',
        icon: 'lucide:braces',
        tags: ['schema markup generator', 'json-ld generator', 'structured data generator', 'faq schema', 'article schema', 'product schema', 'local business schema', 'breadcrumb schema', 'rich results', 'schema.org']
      },
      {
        id: 'html-css-js-playground',
        title: 'HTML / CSS / JS Playground',
        category: 'Dev',
        url: 'dev/html-css-js-playground/',
        icon: 'lucide:code',
        tags: ['html css js playground', 'online code editor', 'live html editor', 'javascript playground', 'codepen alternative', 'jsfiddle alternative', 'run html online', 'css sandbox', 'web playground', 'html preview']
      },
      {
        id: 'config-converter',
        title: 'Config Converter',
        category: 'Dev',
        url: 'dev/config-converter/',
        icon: 'lucide:settings-2',
        tags: ['env to json', 'json to env', 'yaml to env', 'env to yaml', 'dotenv converter', 'docker compose environment', 'kubernetes configmap generator', 'toml to json', 'ini to json', 'properties to yaml', 'config converter']
      },
      {
        id: 'hash-id-generator',
        title: 'Hash & ID Generator',
        category: 'Dev',
        url: 'dev/hash-id-generator/',
        icon: 'lucide:fingerprint',
        tags: ['hash generator', 'sha256 generator', 'md5 generator', 'sha512 hash', 'hmac generator', 'checksum verifier', 'uuid generator', 'uuid v7', 'ulid generator', 'nanoid', 'random id generator', 'file hash']
      },
      {
        id: 'sprite-sheet-studio',
        title: 'Sprite Sheet Studio',
        category: 'Media',
        url: 'media/sprite-sheet-studio/',
        icon: 'lucide:grid-3x3',
        tags: ['sprite sheet', 'spritesheet', 'sprite to gif', 'gif to sprite sheet', 'apng', 'pixel art', 'game dev', 'texture atlas', 'frames', 'animation', 'css sprite animation', 'steps()', 'phaser', 'godot', 'unity']
      },
      {
        id: 'dummy-text-data-generator',
        title: 'Dummy Text & Data Generator',
        category: 'Docs',
        url: 'docs/dummy-text-data-generator/',
        icon: 'lucide:text-cursor-input',
        tags: ['lorem ipsum', 'dummy text', 'placeholder text', 'fake data', 'mock data', 'test data', 'fake names', 'fake email', 'fake address', 'random data generator', 'csv generator', 'json generator', 'sql insert', 'seed', 'indian names']
      },
      {
        id: 'utm-link-builder',
        title: 'UTM Link Builder',
        category: 'Labs',
        url: 'labs/utm-link-builder/',
        icon: 'lucide:link-2',
        tags: ['utm', 'utm builder', 'utm link', 'campaign url builder', 'utm_source', 'utm_medium', 'utm_campaign', 'google analytics', 'ga4', 'tracking link', 'bulk utm', 'qr code', 'marketing']
      },
      {
        id: 'qr-barcode-scanner',
        title: 'QR & Barcode Scanner',
        category: 'Labs',
        url: 'labs/qr-barcode-scanner/',
        icon: 'lucide:scan-line',
        tags: ['qr scanner', 'qr code reader', 'barcode scanner', 'barcode reader', 'scan qr from image', 'scan screenshot', 'ean', 'upc', 'code 128', 'data matrix', 'pdf417', 'wifi qr', 'vcard', 'upi qr', 'camera']
      },
      {
        id: 'cron-builder',
        title: 'Cron Builder',
        category: 'Dev',
        url: 'dev/cron-builder/',
        icon: 'lucide:alarm-clock',
        tags: ['cron', 'crontab', 'cron expression', 'cron builder', 'cron generator', 'schedule', 'cron explainer', 'next run', 'quartz', 'kubernetes cronjob', 'github actions schedule', 'time zone', 'every 5 minutes']
      },
      {
        id: 'jwt-builder-verifier',
        title: 'JWT Builder & Verifier',
        category: 'Dev',
        url: 'dev/jwt-builder-verifier/',
        icon: 'lucide:shield-check',
        tags: ['jwt', 'json web token', 'jwt builder', 'jwt verifier', 'jwt decoder', 'hs256', 'rs256', 'es256', 'jwks', 'sign jwt', 'verify signature', 'exp', 'bearer token', 'oauth', 'oidc', 'web crypto']
      },
      {
        id: 'date-calculator',
        title: 'Date Calculator',
        category: 'Data',
        url: 'data/date-calculator/',
        icon: 'lucide:calendar-days',
        tags: ['date', 'calculator', 'days between', 'date difference', 'add days', 'subtract days', 'working days', 'business days', 'holidays', 'age calculator', 'duration', 'weeks', 'countdown', 'iso week']
      },
      {
        id: 'shape-crop',
        title: 'Shape Crop',
        category: 'Media',
        url: 'media/shape-crop/',
        icon: 'lucide:circle-dashed',
        tags: ['shape crop', 'circle crop', 'crop circle', 'round image', 'rounded corners', 'heart crop', 'star crop', 'squircle', 'hexagon', 'profile picture', 'avatar', 'transparent png', 'svg mask', 'cut out', 'photo']
      },
      {
        id: 'video-to-sticker',
        title: 'Video to Sticker',
        category: 'Media',
        url: 'media/video-to-sticker/',
        icon: 'lucide:sticker',
        tags: ['video to sticker', 'telegram sticker', 'whatsapp sticker', 'animated sticker', 'webm sticker', 'vp9', 'animated webp', '512x512', 'sticker maker', 'video sticker', 'gif to sticker', 'green screen', 'transparent sticker']
      },
      {
        id: 'chat-mockup',
        title: 'Chat Mockup',
        category: 'Media',
        url: 'media/chat-mockup/',
        icon: 'lucide:message-square-text',
        tags: ['chat mockup', 'fake chat', 'whatsapp chat generator', 'imessage generator', 'fake text message', 'instagram dm generator', 'telegram chat', 'discord message generator', 'slack message', 'fake conversation', 'chat screenshot', 'mockup', 'meme']
      },
      {
        id: 'social-post-mockup',
        title: 'Social Post Mockups',
        category: 'Media',
        url: 'media/social-post-mockup/',
        icon: 'lucide:layout-template',
        tags: ['tweet generator', 'fake tweet', 'x post mockup', 'instagram post generator', 'instagram story mockup', 'linkedin post generator', 'facebook post mockup', 'threads post', 'social media mockup', 'tweet to image', 'post to image', 'mockup', 'screenshot']
      },
      {
        id: 'audio-visualizer',
        title: 'Audio Visualizer',
        category: 'Media',
        url: 'media/audio-visualizer/',
        icon: 'lucide:audio-waveform',
        tags: ['audio visualizer', 'music visualizer', 'audio to video', 'mp3 to mp4', 'podcast video', 'audiogram', 'waveform video', 'spectrum video', 'youtube music video', 'instagram reel audio', 'tiktok audio video', 'cover art video']
      },
      {
        id: 'audio-to-text',
        title: 'Audio to Text',
        category: 'Media',
        url: 'media/audio-to-text/',
        icon: 'lucide:captions',
        tags: ['audio to text', 'speech to text', 'transcribe audio', 'mp3 to text', 'voice to text', 'whisper', 'transcription', 'subtitles', 'srt generator', 'vtt', 'video to text', 'podcast transcript', 'voice note to text', 'dictation']
      },
      {
        id: 'pdf-repair',
        title: 'PDF Repair',
        category: 'Docs',
        url: 'docs/pdf-repair/',
        icon: 'lucide:wrench',
        tags: ['pdf repair', 'fix pdf', 'repair pdf', 'corrupt pdf', 'damaged pdf', "pdf won't open", 'xref error', 'recover pdf', 'broken pdf', 'file is damaged', 'rebuild pdf']
      },
      {
        id: 'pdf-booklet-nup',
        title: 'Booklet & N-up Imposition',
        category: 'Docs',
        url: 'docs/pdf-booklet-nup/',
        icon: 'lucide:book-open',
        tags: ['booklet maker', 'pdf booklet', 'imposition', 'n-up', '2 pages per sheet', '4 pages per sheet', 'saddle stitch', 'print booklet', 'split pdf pages in half', 'halve pages', 'two page spread', 'handout', 'zine']
      },
      {
        id: 'zip-maker-extractor',
        title: 'ZIP Maker & Extractor',
        category: 'Docs',
        url: 'docs/zip-maker-extractor/',
        icon: 'lucide:folder-archive',
        tags: ['zip maker', 'create zip online', 'zip files online', 'unzip online', 'zip extractor', 'open zip file', 'extract zip', 'compress folder', 'zip folder', 'unzip without software']
      },
      {
        id: 'chronometer-lap-timer',
        title: 'Chronometer & Lap Timer',
        category: 'Labs',
        url: 'labs/chronometer-lap-timer/',
        icon: 'lucide:timer',
        tags: ['stopwatch online', 'lap timer', 'chronometer', 'online timer', 'split timer', 'countdown timer', 'stopwatch with laps', 'precise stopwatch', 'timer fullscreen', 'interval timer']
      },
      {
        id: 'chat-bubble',
        title: 'Chat Bubble Widget',
        category: 'Widgets',
        url: 'widgets/chat-bubble/',
        icon: 'lucide:message-circle',
        tags: ['chat bubble', 'speech bubble', 'message widget', 'testimonial widget', 'quote widget', 'imessage bubble', 'whatsapp bubble', 'notion widget', 'embed', 'chat ui', 'fake text message', 'notion chat']
      },
      {
        id: 'responsive-breakpoint-previewer',
        title: 'Responsive Breakpoint Previewer',
        category: 'Labs',
        url: 'labs/responsive-breakpoint-previewer/',
        icon: 'lucide:monitor-smartphone',
        tags: ['responsive design tester', 'breakpoint previewer', 'test website on different screen sizes', 'mobile preview', 'responsive checker', 'media query tester', 'viewport tester', 'multi device preview', 'screen size simulator', 'html preview responsive']
      },
      {
        id: 'accessibility-contrast-matrix',
        title: 'Accessibility Contrast Matrix',
        category: 'Labs',
        url: 'labs/accessibility-contrast-matrix/',
        icon: 'lucide:grid-3x3',
        tags: ['contrast matrix', 'palette contrast checker', 'wcag palette', 'color combinations accessibility', 'contrast grid', 'design system contrast', 'aa aaa matrix', 'accessible color palette', 'color pair contrast', 'wcag 2 contrast']
      },
      {
        id: 'keyboard-shortcut-cheat-sheet-maker',
        title: 'Keyboard Shortcut Cheat-Sheet Maker',
        category: 'Labs',
        url: 'labs/keyboard-shortcut-cheat-sheet-maker/',
        icon: 'lucide:keyboard',
        tags: ['keyboard shortcut cheat sheet', 'cheat sheet maker', 'shortcut cheat sheet generator', 'printable shortcuts', 'keycap generator', 'hotkey list', 'vs code shortcuts pdf', 'mac keyboard symbols', 'shortcut poster', 'notion shortcut table']
      },
      {
        id: 'spreadsheet-formula-converter',
        title: 'Spreadsheet Formula Converter',
        category: 'Data',
        url: 'data/spreadsheet-formula-converter/',
        icon: 'lucide:sigma',
        tags: ['excel to google sheets formula', 'google sheets to excel formula', 'formula converter', 'libreoffice formula', 'semicolon to comma formula', 'a1 to r1c1', 'arrayformula excel', 'textjoin vs join', 'spreadsheet function equivalents', 'formula compatibility']
      },
      {
        id: 'button-grid',
        title: 'Button Grid Widget',
        category: 'Widgets',
        url: 'widgets/button-grid/',
        icon: 'lucide:layout-grid',
        tags: ['button widget', 'notion buttons', 'link buttons', 'dashboard buttons', 'notion dashboard widget', 'quick links widget', 'start page', 'icon buttons', 'embed', 'notion']
      },
      {
        id: 'calculator',
        title: 'Mini Calculator Widget',
        category: 'Widgets',
        url: 'widgets/calculator/',
        icon: 'lucide:calculator',
        tags: ['calculator widget', 'notion calculator', 'embed calculator', 'tip calculator widget', 'bill splitter', 'mini calculator', 'dashboard calculator', 'notion widget', 'embed']
      },
      {
        id: 'world-clocks',
        title: 'World Clocks Widget',
        category: 'Widgets',
        url: 'widgets/world-clocks/',
        icon: 'lucide:globe',
        tags: ['world clock widget', 'notion world clock', 'time zone widget', 'team time zones', 'remote team clock', 'multiple clocks', 'working hours overlap', 'embed clock', 'notion widget', 'time zones']
      },
      {
        id: 'weather',
        title: 'Weather Widget',
        category: 'Widgets',
        url: 'widgets/weather/',
        icon: 'lucide:cloud-sun',
        tags: ['weather widget', 'notion weather widget', 'embed weather', 'weather forecast widget', 'free weather widget', 'open-meteo', 'weather for website', 'dashboard weather', 'notion widget', 'no api key']
      },
      {
        id: 'nonogram',
        title: 'Nonogram',
        category: 'Games',
        url: 'games/nonogram/',
        icon: 'lucide:grid-2x2-check',
        tags: ['nonogram', 'picross', 'griddler', 'hanjie', 'picture logic puzzle', 'nonogram online', 'nonogram generator', 'image to nonogram', 'logic puzzle', 'paint by numbers']
      },
      {
        id: 'number-formats-converter',
        title: 'Number Formats Converter',
        category: 'Data',
        url: 'data/number-formats-converter/',
        icon: 'lucide:hash',
        tags: ['number to words', 'number to words indian rupees', 'amount in words', 'lakh crore converter', 'indian number system converter', 'words to number', 'roman numerals converter', 'number to hindi words', 'scientific notation converter', 'ordinal number converter', 'cheque amount in words']
      },
      {
        id: 'tag-detector',
        title: 'Tag Detector',
        category: 'Labs',
        url: 'labs/tag-detector/',
        icon: 'lucide:radar',
        tags: ['tag detector', 'tracking tag scanner', 'what tags are on a website', 'gtm detector', 'ga4 detector', 'meta pixel checker', 'facebook pixel detector', 'tag audit', 'tracking pixel finder', 'google tag manager container scanner', 'website tracker checker']
      },
      {
        id: 'consent-mode-checker',
        title: 'Consent Mode Checker',
        category: 'Labs',
        url: 'labs/consent-mode-checker/',
        icon: 'lucide:shield-check',
        tags: ['consent mode checker', 'google consent mode v2', 'consent mode v2 checker', 'ad_user_data ad_personalization', 'gtag consent default', 'consent mode audit', 'cmp detector', 'cookie banner checker', 'gdpr google ads', 'consent mode test']
      },
      {
        id: 'ambient-focus-room',
        title: 'Ambient Focus Room',
        category: 'Labs',
        url: 'labs/ambient-focus-room/',
        icon: 'lucide:coffee',
        tags: ['focus room', 'study with me', 'ambient sounds for focus', 'rain sounds', 'brown noise', 'pomodoro with sounds', 'deep work timer', 'virtual study room', 'white noise generator', 'focus music alternative', 'fullscreen timer']
      },
      {
        id: 'cookie-header-decoder',
        title: 'Cookie Header Decoder',
        category: 'Dev',
        url: 'dev/cookie-header-decoder/',
        icon: 'lucide:cookie',
        tags: ['cookie header decoder', 'set-cookie parser', 'set-cookie header checker', 'cookie attributes explained', 'samesite none secure', '__host- cookie prefix', 'cookie max-age expires', 'httponly cookie checker', 'decode cookie value', 'document.cookie parser', 'partitioned cookie chips']
      },
      {
        id: 'security-txt-validator',
        title: 'security.txt Validator',
        category: 'Labs',
        url: 'labs/security-txt-validator/',
        icon: 'lucide:shield-check',
        tags: ['security.txt validator', 'security.txt checker', 'rfc 9116', 'well-known security.txt', 'security.txt expires', 'security.txt generator', 'vulnerability disclosure file', 'security txt format', 'securitytxt', 'responsible disclosure contact']
      },
      {
        id: 'ads-txt-validator',
        title: 'ads.txt Validator',
        category: 'Labs',
        url: 'labs/ads-txt-validator/',
        icon: 'lucide:badge-dollar-sign',
        tags: ['ads.txt validator', 'ads.txt checker', 'app-ads.txt validator', 'ads.txt not found adsense', 'earnings at risk ads.txt', 'ads.txt syntax', 'sellers.json checker', 'ownerdomain managerdomain', 'ads.txt direct reseller', 'iab ads.txt', 'google ads.txt line']
      },
      {
        id: 'sitemap-health-checker',
        title: 'Sitemap Health Checker',
        category: 'Labs',
        url: 'labs/sitemap-health-checker/',
        icon: 'lucide:map',
        tags: ['sitemap checker', 'sitemap validator', 'xml sitemap validator', 'sitemap.xml checker', 'validate sitemap', 'sitemap index checker', 'sitemap lastmod', 'sitemap 50000 urls', 'sitemap errors google search console', 'sitemap tester', 'sitemap url count']
      },
      {
        id: 'robots-txt-tester',
        title: 'Robots.txt Tester',
        category: 'Labs',
        url: 'labs/robots-txt-tester/',
        icon: 'lucide:bot',
        tags: ['robots.txt tester', 'robots.txt checker', 'robots.txt validator', 'test robots.txt', 'is url blocked by robots.txt', 'googlebot robots.txt test', 'robots txt syntax check', 'block gptbot', 'ai crawlers robots.txt', 'disallow allow precedence', 'robots.txt wildcard']
      },
      {
        id: 'cat-widgets',
        title: 'Widgets',
        category: 'Category',
        url: 'widgets/',
        icon: 'lucide:layout-dashboard',
        tags: ['widgets', 'notion', 'embed', 'notion widgets', 'iframe', 'flip clock', 'countdown', 'dashboard']
      },
      {
        id: 'countdown',
        title: 'Countdown Timer Widget',
        category: 'Widgets',
        url: 'widgets/countdown/',
        icon: 'lucide:hourglass',
        tags: ['countdown', 'timer', 'widget', 'notion', 'embed', 'notion countdown', 'days until', 'event timer', 'launch countdown', 'flip countdown']
      },
      {
        id: 'flip-clock',
        title: 'Flip Clock Widget',
        category: 'Widgets',
        url: 'widgets/flip-clock/',
        icon: 'lucide:clock',
        tags: ['flip clock', 'clock', 'widget', 'notion', 'embed', 'notion clock', 'digital clock', 'split flap', 'world clock', 'time']
      },
      {
        id: 'sunrise-sunset',
        title: 'Sunrise & Sunset Widget',
        category: 'Widgets',
        url: 'widgets/sunrise-sunset/',
        icon: 'lucide:sunrise',
        tags: ['sunrise', 'sunset', 'sun', 'day length', 'golden hour', 'twilight', 'widget', 'notion', 'embed', 'notion widget', 'daylight', 'weather']
      },
      {
        id: 'timer',
        title: 'Timer Widget',
        category: 'Widgets',
        url: 'widgets/timer/',
        icon: 'lucide:timer',
        tags: ['timer', 'pomodoro', 'stopwatch', 'days since', 'focus timer', 'count up', 'widget', 'notion', 'embed', 'notion timer', 'study timer', 'lap timer']
      }
    ];

    // Designed by Kapil Pidhwani: shared with /scripts/webmcp.js (agent tool search) — one registry, one scorer
    window.ToolityRegistry = {
      items: REGISTRY,
      search: (q, n = 8) => REGISTRY
        .map((item) => ({ item, score: calculateRelevanceScore(item, q) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, n)
        .map((r) => r.item)
    };

    /**
     * Stemming, spelling normalization, and synonym expansion dictionary
     */
    const SYNONYM_MAP = {
      'convertor': 'converter',
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
      
      let baseBonus = 0;
      if (titleLower === queryClean) baseBonus = 2500;
      else if (titleLower.startsWith(queryClean)) baseBonus = 1800;
      else if (titleLower.includes(queryClean)) baseBonus = 1400;

      const titleWords = titleLower.split(/[\s\-_\/]+/).filter(Boolean);
      const categoryWords = categoryLower.split(/[\s\-_\/]+/).filter(Boolean);
      const tagWords = (item.tags || []).map(t => t.toLowerCase());

      let totalTokenScore = baseBonus;
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
        totalTokenScore += 300;
      } else if (matchedTokensCount === 0 && baseBonus === 0) {
        return 0;
      }

      if (!item.id.startsWith('cat-')) {
        totalTokenScore += 25;
      }

      return totalTokenScore;
    }

    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function bindSearch(root) {
      const searchInput = root.querySelector('.minimal-search-input');
      const resultsDropdown = root.querySelector('.minimal-search-results');
      const clearBtn = root.querySelector('.minimal-clear-btn');
      const searchBtn = root.querySelector('.minimal-submit-btn');
      let selectedIndex = -1;
      let currentResults = [];

      function openDropdown() { resultsDropdown.hidden = false; }

      function closeDropdown() {
        resultsDropdown.hidden = true;
        selectedIndex = -1;
      }

      function highlightSelected() {
        resultsDropdown.querySelectorAll('.minimal-result-item').forEach((item, index) => {
          item.classList.toggle('selected', index === selectedIndex);
          if (index === selectedIndex) item.scrollIntoView({ block: 'nearest' });
        });
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

        // Registry URLs are root-relative ('media/x/'); prefix '/' so results work from any page
        resultsDropdown.innerHTML = items.map((item, index) => `
          <a href="/${item.url}" class="minimal-result-item" data-index="${index}">
            <div class="minimal-result-title">
              <iconify-icon icon="${item.icon}" width="16" height="16"></iconify-icon>
              <span>${escapeHtml(item.title)}</span>
            </div>
            <iconify-icon icon="lucide:arrow-right" class="minimal-result-arrow" width="15" height="15"></iconify-icon>
          </a>
        `).join('');
        openDropdown();
      }

      function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        clearBtn.hidden = query.length === 0;

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
      searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) handleSearch(); });
      searchInput.addEventListener('click', () => { if (searchInput.value.trim()) handleSearch(); });

      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.hidden = true;
        closeDropdown();
        searchInput.focus();
      });

      function triggerNavigate() {
        if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
          window.location.href = '/' + currentResults[selectedIndex].url;
        } else if (currentResults.length > 0) {
          window.location.href = '/' + currentResults[0].url;
        } else if (searchInput.value.trim().length > 0) {
          // Nothing matches: jump to the category list (home page)
          const categoriesSection = document.getElementById('categories');
          if (categoriesSection) categoriesSection.scrollIntoView({ behavior: 'smooth' });
          else window.location.href = '/#categories';
        }
      }

      searchBtn.addEventListener('click', triggerNavigate);

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

      // Close results on click outside this search block
      document.addEventListener('click', (e) => {
        if (!root.contains(e.target)) closeDropdown();
      });
    }

    roots.forEach(bindSearch);

    // Global shortcut: ⌘K, Ctrl+K, or "/" → inline header input on desktop, drawer search on mobile
    window.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) && !active.isContentEditable;
      if (!isCmdK && !isSlash) return;
      e.preventDefault();

      const navInput = navSearch && navSearch.querySelector('.minimal-search-input');
      if (navInput && navInput.offsetParent !== null) {
        navInput.focus();
        navInput.select();
        return;
      }
      const drawer = document.getElementById('mobile-nav-drawer');
      const drawerInput = drawer && drawer.querySelector('.minimal-search-input');
      if (!drawerInput) return;
      if (!drawer.classList.contains('open')) document.getElementById('mobile-menu-toggle').click();
      drawerInput.focus();
    });
  }

  /**
   * Deisgned by Kapil Pidhwani: Ambient Organic Waves for Hero Section
   * Adapted mathematical ribbon harmonics from Breathe mode with zero mouse tracking and battery-efficient offscreen throttling.
   */
  function initHeroWaves() {
    const canvas = document.getElementById('hero-waves-canvas');
    if (!canvas) return;
    // Designed by Kapil Pidhwani: the hero waves deliberately ignore prefers-reduced-motion (product call, 20 Oct 2026) —
    // it is slow ambient canvas motion with no parallax/flash. Everything else on the site still honours the setting.

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let animId = null;
    let isVisible = true;
    let refW = 900;
    let ampK = 1;

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

      // Designed by Kapil Pidhwani: wavelength is anchored to a 900px reference instead of the viewport, so a phone shows
      // a slice of the same calm wave rather than the whole wave squeezed 3x. Amplitude eases down with sqrt(W/900) so the
      // slope (amp / wavelength) stays roughly equal to desktop. Ceiling: phones narrower than ~320px get slightly flatter waves.
      refW = Math.max(W, 900);
      ampK = Math.min(1, Math.sqrt(W / 900));
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
        const amp = a * ampK * (0.62 + 0.38 * bs);
        const yB = H * yc;

        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const nx = x / refW;
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
        const amp = H * a * ampK * (0.52 + 0.48 * bs);
        const ph = time * sp;

        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const nx = x / refW;
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
      toggleBtn.setAttribute('aria-label', 'Search tools and browse categories');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = '<iconify-icon id="mobile-menu-icon" icon="lucide:search" width="18" height="18"></iconify-icon>';
      navRight.appendChild(toggleBtn);
    }

    // 2. Create or bind mobile drawer
    let drawer = document.getElementById('mobile-nav-drawer');
    let backdrop = document.getElementById('mobile-nav-backdrop');

    if (!drawer) {
      // Partials use root-relative paths — always use '/' as prefix
      const rootPrefix = '/';

      // Find active page via data-nav attribute (set by setActiveNav() from header partial)
      const segment = location.pathname.split('/').filter(Boolean)[0] || '';
      const activeHref = segment ? `/${segment}/` : '/';

      const categories = [
        { title: 'Home', href: rootPrefix === '' ? './' : rootPrefix, icon: 'lucide:home', key: 'home' },
        { title: 'Media', href: `${rootPrefix}media/`, icon: 'lucide:clapperboard', key: 'media' },
        { title: 'Docs', href: `${rootPrefix}docs/`, icon: 'lucide:file-text', key: 'docs' },
        { title: 'Labs', href: `${rootPrefix}labs/`, icon: 'lucide:flask-conical', key: 'labs' },
        { title: 'Dev', href: `${rootPrefix}dev/`, icon: 'lucide:code-2', key: 'dev' },
        { title: 'Data', href: `${rootPrefix}data/`, icon: 'lucide:database', key: 'data' },
        { title: 'Games', href: `${rootPrefix}games/`, icon: 'lucide:gamepad-2', key: 'games' },
        { title: 'Widgets', href: `${rootPrefix}widgets/`, icon: 'lucide:layout-dashboard', key: 'widgets' }
      ];

      drawer = document.createElement('div');
      drawer.id = 'mobile-nav-drawer';
      drawer.className = 'mobile-nav-drawer';
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-label', 'Mobile Navigation');

      let gridHtml = '';
      categories.forEach(cat => {
        let isActive = false;
        if (cat.key === '' || cat.key === 'home') {
          isActive = segment === '';
        } else {
          isActive = segment === cat.key;
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
          ${SEARCH_HTML}
          <div class="mobile-nav-grid">
            ${gridHtml}
          </div>
          <div class="mobile-nav-footer-links">
            <a href="${rootPrefix}about/" class="mobile-nav-sublink">About</a>
            <a href="${rootPrefix}blog/" class="mobile-nav-sublink">Blog</a>
            <a href="${rootPrefix}careers/" class="mobile-nav-sublink">Careers</a>
            <a href="${rootPrefix}contact/" class="mobile-nav-sublink">Contact</a>
            <a href="${rootPrefix}faq/" class="mobile-nav-sublink">FAQ</a>
            <a href="${rootPrefix}tools/" class="mobile-nav-sublink">All Tools</a>
            <a href="${rootPrefix}privacy/" class="mobile-nav-sublink">Privacy</a>
            <a href="${rootPrefix}terms/" class="mobile-nav-sublink">Terms</a>
          </div>
          <div class="mobile-nav-footer-links mobile-nav-social">
            <a href="https://www.instagram.com/toolity.in" target="_blank" rel="noopener" class="mobile-nav-sublink" aria-label="Toolity on Instagram"><iconify-icon icon="lucide:instagram" width="18" height="18"></iconify-icon></a>
            <a href="https://www.linkedin.com/company/toolity-in" target="_blank" rel="noopener" class="mobile-nav-sublink" aria-label="Toolity on LinkedIn"><iconify-icon icon="lucide:linkedin" width="18" height="18"></iconify-icon></a>
            <a href="mailto:hello@toolity.in" class="mobile-nav-sublink" aria-label="Email Toolity"><iconify-icon icon="lucide:mail" width="18" height="18"></iconify-icon></a>
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

    // a11y F7: native `inert` keeps Tab inside the drawer (no trap code); focus moves in on open and back out on close
    const inertTargets = () => document.querySelectorAll('main, footer, .site-header');

    function openMenu() {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      if (menuIcon) menuIcon.setAttribute('icon', 'lucide:x');
      document.body.style.overflow = 'hidden';
      inertTargets().forEach((el) => { if (!el.contains(toggleBtn)) el.inert = true; });
      const first = drawer.querySelector('input, a, button');
      if (first) first.focus();
    }

    function closeMenu() {
      const wasOpen = drawer.classList.contains('open');
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      if (menuIcon) menuIcon.setAttribute('icon', 'lucide:search');
      document.body.style.overflow = '';
      inertTargets().forEach((el) => { el.inert = false; });
      if (wasOpen && drawer.contains(document.activeElement)) toggleBtn.focus();
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
      if (window.innerWidth > 1023 && drawer.classList.contains('open')) { // matches main.css nav breakpoint
        closeMenu();
      }
    });

    // Initialize Mobile Floating Bottom Pill Nav on non-home pages
    initMobileBottomNav(toggleMenu);
  }

  /**
   * Designed by Kapil Pidhwani: Mobile Floating Bottom Pill Nav (Non-Home Pages)
   * Provides quick thumb-friendly actions: 1. Home, 2. Search drawer (search + categories, toggle), 3. Share URL, 4. Scroll to Top.
   */
  function initMobileBottomNav(toggleMenuFn) {
    const pathname = window.location.pathname;
    const isHome = pathname === '/' || pathname === '/index.html' || pathname === '';
    if (isHome) return; // Non-home pages only

    if (document.querySelector('.mobile-bottom-pill-nav')) return;

    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-pill-nav';
    nav.setAttribute('aria-label', 'Mobile Quick Navigation');
    nav.innerHTML = `
      <a href="/" class="pill-nav-item" aria-label="Go to Home">
        <iconify-icon icon="lucide:home"></iconify-icon>
        <span>Home</span>
      </a>
      <button type="button" class="pill-nav-item" id="pill-nav-tools" aria-label="Search tools and browse categories">
        <iconify-icon icon="lucide:search"></iconify-icon>
        <span>Search</span>
      </button>
      <button type="button" class="pill-nav-item" id="pill-nav-share" aria-label="Share this tool">
        <iconify-icon icon="lucide:share-2"></iconify-icon>
        <span>Share</span>
      </button>
      <button type="button" class="pill-nav-item" id="pill-nav-top" aria-label="Scroll to top of page">
        <iconify-icon icon="lucide:arrow-up"></iconify-icon>
        <span>Top</span>
      </button>
    `;

    document.body.appendChild(nav);

    const toolsBtn = document.getElementById('pill-nav-tools');
    if (toolsBtn && typeof toggleMenuFn === 'function') {
      toolsBtn.addEventListener('click', toggleMenuFn);
    }

    const shareBtn = document.getElementById('pill-nav-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const shareData = {
          title: document.title || 'Toolity.in',
          url: window.location.href
        };
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
          } catch (err) {
            if (err.name !== 'AbortError') {
              copyToolUrl();
            }
          }
        } else {
          copyToolUrl();
        }
      });
    }

    const topBtn = document.getElementById('pill-nav-top');
    if (topBtn) {
      topBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    function copyToolUrl() {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showGlobalToast('Tool link copied to clipboard!');
      }).catch(() => {
        showGlobalToast('Link: ' + window.location.href);
      });
    }
  }

  /**
   * Designed by Kapil Pidhwani: /tools/ A–Z index, rendered from the search REGISTRY so every new tool
   * appears automatically. Ceiling: links exist only after JS runs (Google renders JS; <noscript> points to
   * /sitemap.xml). Upgrade path if indexing suffers: a 20-line script that bakes this list into the HTML.
   */
  /**
   * Designed by Kapil Pidhwani: blog post helpers — builds the "On this page" list from the article's h2s (ids are
   * generated from the heading text, so authors never maintain anchors) and highlights the section in view.
   * Ceiling: h2 only; nested h3 navigation is deliberately out (posts stay scannable).
   */
  function initBlogPost() {
    const toc = document.getElementById('blog-toc'), article = document.querySelector('article.prose-card');
    if (!toc || !article) return;
    const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60), esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const heads = [...article.querySelectorAll('h2.prose-heading')].filter((h) => !h.closest('.blog-faq, .blog-related, .blog-takeaways'));
    if (heads.length < 3) { toc.hidden = true; return; }
    const used = new Set();
    heads.forEach((h) => { if (!h.id) { let id = slug(h.textContent) || 'section', n = 2; while (used.has(id) || document.getElementById(id)) id = `${slug(h.textContent)}-${n++}`; h.id = id; } used.add(h.id); });
    toc.innerHTML = `<p class="blog-toc-title">On this page</p><ol class="blog-toc-list">${heads.map((h) => `<li><a href="#${h.id}">${esc(h.textContent.trim())}</a></li>`).join('')}</ol>`;
    if ('IntersectionObserver' in window) {
      const links = new Map(heads.map((h) => [h.id, toc.querySelector(`a[href="#${h.id}"]`)]));
      const io = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { links.forEach((a) => a.classList.remove('is-active')); links.get(e.target.id).classList.add('is-active'); } }); }, { rootMargin: '-15% 0px -70% 0px' });
      heads.forEach((h) => io.observe(h));
    }
  }

  function initToolsIndex() {
    const root = document.getElementById('tools-index');
    if (!root || !window.ToolityRegistry) return;
    const filter = document.getElementById('tools-index-filter');
    const chips = document.getElementById('tools-index-chips');
    const count = document.getElementById('tools-index-count');
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tools = window.ToolityRegistry.items
      .filter((t) => t.category !== 'Category')
      .sort((a, b) => a.title.localeCompare(b.title));
    const cats = [...new Set(tools.map((t) => t.category))].sort();
    let cat = '';

    chips.innerHTML = ['All', ...cats].map((c, i) =>
      `<button type="button" class="tools-index-chip" data-cat="${i ? esc(c) : ''}" aria-pressed="${!i}">${esc(c)}</button>`).join('');
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      cat = b.dataset.cat;
      chips.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      render();
    });
    filter.addEventListener('input', render);

    function render() {
      const q = filter.value.trim().toLowerCase();
      const list = tools.filter((t) => (!cat || t.category === cat) &&
        (!q || t.title.toLowerCase().includes(q) || t.tags.some((g) => g.includes(q))));
      const groups = {};
      list.forEach((t) => { const k = /[a-z]/i.test(t.title[0]) ? t.title[0].toUpperCase() : '#'; (groups[k] = groups[k] || []).push(t); });
      count.textContent = `${list.length} of ${tools.length} tools`;
      root.classList.toggle('is-filtered-by-cat', !!cat); // category pill is redundant when one chip is active
      root.innerHTML = list.length ? Object.keys(groups).map((k) => `
        <section class="tools-index-group" aria-labelledby="letter-${k}">
          <h2 class="tools-index-letter" id="letter-${k}">${k}</h2>
          <ul class="tools-index-list">${groups[k].map((t) => `
            <li><a href="/${t.url}"><iconify-icon icon="${t.icon}" width="16" height="16" aria-hidden="true"></iconify-icon>${esc(t.title)}<span class="tools-index-cat">${esc(t.category)}</span></a></li>`).join('')}
          </ul>
        </section>`).join('') : '<p class="prose-text">No tools match. <a href="/contact/">Request one</a>.</p>';
    }
    render();
  }

  /**
   * Designed by Kapil Pidhwani: Global Toast Helper
   */
  function showGlobalToast(msg) {
    const toast = document.getElementById('tool-toast');
    if (!toast) return;
    const msgEl = document.getElementById('toast-message') || toast.querySelector('span');
    if (msgEl) msgEl.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showGlobalToast._t);
    showGlobalToast._t = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // Public API for tool pages — the ONLY toast implementation on the site.
  window.showToast = showGlobalToast;
})();

