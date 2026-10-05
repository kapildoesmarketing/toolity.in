/* Designed by Kapil Pidhwani: Interactive JSON Visualizer & Explorer Engine */

(function () {
  'use strict';

  var STORAGE_KEY = 'toolity_json_visualizer_input';
  var SETTINGS_KEY = 'toolity_json_visualizer_settings';

  var parsedJsonData = null;
  var lastClearedJson = null;
  var filterQuery = '';

  var settings = {
    indentSize: '2',
    defaultDepth: 'all',
    sortKeys: 'natural',
    showBadges: 'on'
  };

  // Preset Sample Datasets
  var SAMPLES = {
    user: {
      id: "usr_94821a0",
      username: "alex_developer",
      fullName: "Alex Rivera",
      email: "alex.rivera@example.com",
      role: "Lead Engineer",
      verified: true,
      score: 98.4,
      accountStats: {
        projectsCreated: 14,
        totalCommits: 1420,
        reputationRank: 1
      },
      tags: ["typescript", "fullstack", "cloud", "ui-design"],
      address: {
        street: "420 Innovation Way",
        suite: "Building 4B",
        city: "San Francisco",
        state: "CA",
        zip: "94107",
        country: "United States"
      },
      preferences: {
        theme: "dark",
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      },
      lastLogin: "2026-10-04T09:15:22Z",
      notes: null
    },
    ecommerce: [
      {
        orderId: "ORD-8941",
        customer: "Sophia Chen",
        date: "2026-10-02",
        status: "Delivered",
        itemsCount: 3,
        total: 249.99,
        paymentMethod: "Apple Pay",
        isGift: false
      },
      {
        orderId: "ORD-8942",
        customer: "Marcus Vance",
        date: "2026-10-03",
        status: "Processing",
        itemsCount: 1,
        total: 89.50,
        paymentMethod: "Credit Card",
        isGift: true
      },
      {
        orderId: "ORD-8943",
        customer: "Elena Rostova",
        date: "2026-10-04",
        status: "Shipped",
        itemsCount: 5,
        total: 512.00,
        paymentMethod: "PayPal",
        isGift: false
      },
      {
        orderId: "ORD-8944",
        customer: "David Kim",
        date: "2026-10-04",
        status: "Delivered",
        itemsCount: 2,
        total: 135.20,
        paymentMethod: "Google Pay",
        isGift: false
      }
    ],
    api: {
      status: "success",
      statusCode: 200,
      timestamp: 1791105600,
      query: {
        endpoint: "/v2/analytics/reports",
        filters: {
          dateRange: "last_30_days",
          dimension: "device_category",
          metrics: ["pageviews", "sessions", "bounceRate"]
        }
      },
      pagination: {
        currentPage: 1,
        perPage: 25,
        totalRecords: 142,
        hasMore: true
      },
      results: [
        {
          device: "Mobile",
          sessions: 45210,
          bounceRate: 0.342,
          conversionRate: 0.048,
          activeUsers: 38900
        },
        {
          device: "Desktop",
          sessions: 31200,
          bounceRate: 0.281,
          conversionRate: 0.065,
          activeUsers: 28400
        },
        {
          device: "Tablet",
          sessions: 4180,
          bounceRate: 0.412,
          conversionRate: 0.029,
          activeUsers: 3900
        }
      ]
    }
  };

  // Toast Notification Helper
  function showToast(message, actionText, actionCallback) {
    var existing = document.getElementById('visualizer-custom-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'visualizer-custom-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '2rem';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    toast.style.background = 'var(--surface-elevated)';
    toast.style.color = 'var(--text-primary)';
    toast.style.border = '1px solid var(--border)';
    toast.style.padding = '0.75rem 1.25rem';
    toast.style.borderRadius = 'var(--radius-pill)';
    toast.style.boxShadow = 'var(--shadow-lg)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.85rem';
    toast.style.fontSize = '0.85rem';
    toast.style.zIndex = '9999';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

    var textSpan = document.createElement('span');
    textSpan.innerHTML = message;
    toast.appendChild(textSpan);

    if (actionText && actionCallback) {
      var btnAction = document.createElement('button');
      btnAction.type = 'button';
      btnAction.textContent = actionText;
      btnAction.style.background = 'var(--brand)';
      btnAction.style.color = '#fff';
      btnAction.style.border = 'none';
      btnAction.style.padding = '0.25rem 0.65rem';
      btnAction.style.borderRadius = 'var(--radius-pill)';
      btnAction.style.fontSize = '0.75rem';
      btnAction.style.fontWeight = '600';
      btnAction.style.cursor = 'pointer';
      btnAction.addEventListener('click', function () {
        actionCallback();
        toast.remove();
      });
      toast.appendChild(btnAction);
    }

    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(function () {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(function () { toast.remove(); }, 250);
      }
    }, 4500);
  }

  // HTML Escape Helper
  function escapeHtml(str) {
    if (typeof str !== 'string') str = String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Format Bytes Utility
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Main Initializer
  function initVisualizer() {
    var textarea = document.getElementById('json-input-textarea');
    var statusBadge = document.getElementById('validation-status-badge');
    var statusMeta = document.getElementById('status-meta-info');

    var treeMount = document.getElementById('json-tree-mount');
    var tableMount = document.getElementById('json-table-mount');
    var tableSummaryText = document.getElementById('table-summary-text');
    var codeMount = document.getElementById('json-code-mount');
    var breakdownMount = document.getElementById('stats-breakdown-mount');

    var searchInput = document.getElementById('tree-search-input');
    var searchClear = document.getElementById('tree-search-clear');

    var btnExpandAll = document.getElementById('btn-tree-expand-all');
    var btnCollapseAll = document.getElementById('btn-tree-collapse-all');
    var btnDepth1 = document.getElementById('btn-tree-depth-1');
    var btnDepth2 = document.getElementById('btn-tree-depth-2');

    var btnFormat = document.getElementById('btn-format-json');
    var btnMinify = document.getElementById('btn-minify-json');
    var btnRepair = document.getElementById('btn-repair-json');
    var btnClear = document.getElementById('btn-clear-json');
    var btnCopy = document.getElementById('btn-copy-json');
    var btnDownload = document.getElementById('btn-download-json');
    var btnExportCsv = document.getElementById('btn-export-csv');

    var btnUploadTrigger = document.getElementById('btn-upload-json-trigger');
    var fileInput = document.getElementById('json-file-input');

    var sampleUser = document.getElementById('sample-user');
    var sampleEcommerce = document.getElementById('sample-ecommerce');
    var sampleApi = document.getElementById('sample-api');

    var tabBtns = document.querySelectorAll('.pane-tab-btn');
    var viewports = document.querySelectorAll('.output-viewport');

    var segIndentSize = document.getElementById('seg-indent-size');
    var segDefaultDepth = document.getElementById('seg-default-depth');
    var segSortKeys = document.getElementById('seg-sort-keys');
    var segShowBadges = document.getElementById('seg-show-badges');
    var settingsSummaryBadge = document.getElementById('settings-summary-badge');

    if (!textarea) return;

    // 1. Settings Management
    function loadSettings() {
      try {
        var saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
          var parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            for (var k in parsed) {
              if (parsed.hasOwnProperty(k)) {
                settings[k] = parsed[k];
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load JSON visualizer settings', e);
      }
      applySettingsToDOM();
    }

    function saveSettings() {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn('Failed to save JSON visualizer settings', e);
      }
      updateSettingsSummaryBadge();
    }

    function applySettingsToDOM() {
      updateSegmentedActive(segIndentSize, settings.indentSize);
      updateSegmentedActive(segDefaultDepth, settings.defaultDepth);
      updateSegmentedActive(segSortKeys, settings.sortKeys);
      updateSegmentedActive(segShowBadges, settings.showBadges);
      updateSettingsSummaryBadge();
    }

    function updateSegmentedActive(groupEl, value) {
      if (!groupEl) return;
      var pills = groupEl.querySelectorAll('.seg-pill');
      for (var i = 0; i < pills.length; i++) {
        var pill = pills[i];
        if (pill.getAttribute('data-val') === String(value)) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      }
    }

    function updateSettingsSummaryBadge() {
      if (!settingsSummaryBadge) return;
      var indentLabel = settings.indentSize === 'tab' ? 'Tab' : settings.indentSize + ' Spaces';
      var depthLabel = settings.defaultDepth === 'all' ? 'Expand All' : settings.defaultDepth === 'collapse' ? 'Collapsed' : 'Depth ' + settings.defaultDepth;
      var orderLabel = settings.sortKeys === 'alpha' ? 'A-Z Sorted' : 'Natural Order';
      settingsSummaryBadge.textContent = '(' + indentLabel + ' • ' + depthLabel + ' • ' + orderLabel + ')';
    }

    function setupSegmentedGroup(groupEl, key) {
      if (!groupEl) return;
      var pills = groupEl.querySelectorAll('.seg-pill');
      pills.forEach(function (pill) {
        pill.addEventListener('click', function () {
          var val = this.getAttribute('data-val');
          settings[key] = val;
          saveSettings();
          applySettingsToDOM();
          renderVisualizations();
        });
      });
    }

    setupSegmentedGroup(segIndentSize, 'indentSize');
    setupSegmentedGroup(segDefaultDepth, 'defaultDepth');
    setupSegmentedGroup(segSortKeys, 'sortKeys');
    setupSegmentedGroup(segShowBadges, 'showBadges');

    // 2. Sub-Tabs Navigation Switcher
    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = this.getAttribute('data-target');
        tabBtns.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        viewports.forEach(function (vp) {
          vp.classList.remove('active');
        });

        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');
        var targetVp = document.getElementById(targetId);
        if (targetVp) targetVp.classList.add('active');
      });
    });

    // 3. JSON Parsing, Validation & Computation
    function parseAndProcess() {
      var raw = textarea.value || '';
      var byteLength = new Blob([raw]).size;

      if (!raw.trim()) {
        parsedJsonData = null;
        renderEmptyStates('Awaiting JSON input', '0 B • 0 Nodes');
        return;
      }

      try {
        parsedJsonData = JSON.parse(raw);
        var metrics = calculateMetrics(parsedJsonData, byteLength);

        // Validation status: VALID
        if (statusBadge) {
          statusBadge.innerHTML = '<span class="status-badge-valid"><iconify-icon icon="lucide:check-circle-2" width="14" height="14"></iconify-icon><span>Valid JSON</span></span>';
        }
        if (statusMeta) {
          statusMeta.textContent = formatBytes(byteLength) + ' • ' + metrics.totalNodes.toLocaleString() + ' Nodes • Depth ' + metrics.maxDepth;
        }

        renderVisualizations();

        // Save to LocalStorage
        try {
          localStorage.setItem(STORAGE_KEY, raw);
        } catch (e) {}

      } catch (err) {
        parsedJsonData = null;
        var errorMsg = err.message || 'Invalid JSON syntax';
        
        if (statusBadge) {
          statusBadge.innerHTML = '<span class="status-badge-invalid"><iconify-icon icon="lucide:alert-circle" width="14" height="14"></iconify-icon><span>' + escapeHtml(errorMsg) + '</span></span>';
        }
        if (statusMeta) {
          statusMeta.textContent = formatBytes(byteLength) + ' • Syntax Error';
        }

        renderErrorState(errorMsg);
      }
    }

    // 4. Metrics & Schema Analysis
    function calculateMetrics(data, byteLength) {
      var totalNodes = 0;
      var arraysCount = 0;
      var objectsCount = 0;
      var primitivesCount = 0;
      var typeCounts = { string: 0, number: 0, boolean: 0, null: 0 };
      var maxDepth = 0;

      function traverse(val, currentDepth) {
        totalNodes++;
        if (currentDepth > maxDepth) maxDepth = currentDepth;

        if (val === null) {
          primitivesCount++;
          typeCounts.null++;
        } else if (Array.isArray(val)) {
          arraysCount++;
          for (var i = 0; i < val.length; i++) {
            traverse(val[i], currentDepth + 1);
          }
        } else if (typeof val === 'object') {
          objectsCount++;
          var keys = Object.keys(val);
          for (var j = 0; j < keys.length; j++) {
            traverse(val[keys[j]], currentDepth + 1);
          }
        } else {
          primitivesCount++;
          var t = typeof val;
          if (typeCounts.hasOwnProperty(t)) {
            typeCounts[t]++;
          }
        }
      }

      traverse(data, 1);

      // Update Stats tab UI
      var elTotal = document.getElementById('stat-total-nodes'); if (elTotal) elTotal.textContent = totalNodes.toLocaleString();
      var elDepth = document.getElementById('stat-max-depth'); if (elDepth) elDepth.textContent = maxDepth;
      var elPayload = document.getElementById('stat-payload-size'); if (elPayload) elPayload.textContent = formatBytes(byteLength);
      var elArrays = document.getElementById('stat-arrays-count'); if (elArrays) elArrays.textContent = arraysCount.toLocaleString();
      var elObjects = document.getElementById('stat-objects-count'); if (elObjects) elObjects.textContent = objectsCount.toLocaleString();
      var elPrimitives = document.getElementById('stat-primitives-count'); if (elPrimitives) elPrimitives.textContent = primitivesCount.toLocaleString();

      if (breakdownMount) {
        breakdownMount.innerHTML = 
          '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem;">' +
            '<div><strong style="color:#059669;">Strings:</strong> ' + typeCounts.string.toLocaleString() + '</div>' +
            '<div><strong style="color:#2563EB;">Numbers:</strong> ' + typeCounts.number.toLocaleString() + '</div>' +
            '<div><strong style="color:#7C3AED;">Booleans:</strong> ' + typeCounts.boolean.toLocaleString() + '</div>' +
            '<div><strong style="color:#D97706;">Nulls:</strong> ' + typeCounts.null.toLocaleString() + '</div>' +
            '<div><strong style="color:var(--text-primary);">Objects:</strong> ' + objectsCount.toLocaleString() + '</div>' +
            '<div><strong style="color:var(--text-primary);">Arrays:</strong> ' + arraysCount.toLocaleString() + '</div>' +
          '</div>';
      }

      return {
        totalNodes: totalNodes,
        maxDepth: maxDepth,
        arraysCount: arraysCount,
        objectsCount: objectsCount,
        primitivesCount: primitivesCount
      };
    }

    // 5. Render All Active Views
    function renderVisualizations() {
      if (parsedJsonData === null) return;

      renderTree(parsedJsonData);
      renderTable(parsedJsonData);
      renderFormattedCode(parsedJsonData);
    }

    // 6. Interactive Tree View Renderer
    function renderTree(data) {
      if (!treeMount) return;
      treeMount.innerHTML = '';

      var frag = document.createDocumentFragment();
      var rootNode = createTreeNode('', data, '$', 1, false);
      frag.appendChild(rootNode);
      treeMount.appendChild(frag);

      if (filterQuery) {
        applyTreeFilter(filterQuery);
      }
    }

    function createTreeNode(key, value, path, depth, isArrayItem) {
      var isObj = value !== null && typeof value === 'object' && !Array.isArray(value);
      var isArr = Array.isArray(value);
      var isContainer = isObj || isArr;

      var nodeWrapper = document.createElement('div');
      nodeWrapper.className = 'tree-node' + (depth === 1 ? ' tree-node-root' : '');
      nodeWrapper.setAttribute('data-path', path);

      var line = document.createElement('div');
      line.className = 'tree-line';

      // Toggle Chevron for containers
      if (isContainer) {
        var toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'tree-toggle-btn';
        toggleBtn.innerHTML = '<iconify-icon icon="lucide:chevron-down" width="12" height="12"></iconify-icon>';

        var shouldCollapse = false;
        if (settings.defaultDepth === 'collapse') shouldCollapse = true;
        else if (settings.defaultDepth === '1' && depth >= 1) shouldCollapse = true;
        else if (settings.defaultDepth === '2' && depth >= 2) shouldCollapse = true;

        if (shouldCollapse) {
          toggleBtn.classList.add('collapsed');
        }

        toggleBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var childrenContainer = nodeWrapper.querySelector(':scope > .tree-node-children');
          if (childrenContainer) {
            var isCollapsed = childrenContainer.classList.toggle('collapsed');
            toggleBtn.classList.toggle('collapsed', isCollapsed);
          }
        });
        line.appendChild(toggleBtn);
      }

      // Key rendering
      if (key !== '') {
        var keySpan = document.createElement('span');
        keySpan.className = 'tree-key';
        keySpan.textContent = isArrayItem ? key : '"' + key + '"';
        keySpan.setAttribute('data-searchable', key);
        line.appendChild(keySpan);

        var colonSpan = document.createElement('span');
        colonSpan.className = 'tree-colon';
        colonSpan.textContent = ':';
        line.appendChild(colonSpan);
      }

      // Value rendering
      if (isContainer) {
        var openBracket = document.createElement('span');
        openBracket.className = 'tree-bracket';
        openBracket.textContent = isArr ? '[' : '{';
        line.appendChild(openBracket);

        if (settings.showBadges === 'on') {
          var count = isArr ? value.length : Object.keys(value).length;
          var metaBadge = document.createElement('span');
          metaBadge.className = 'tree-meta-badge';
          metaBadge.textContent = isArr ? count + ' items' : count + ' keys';
          line.appendChild(metaBadge);
        }
      } else {
        var valSpan = document.createElement('span');
        valSpan.setAttribute('data-searchable', String(value));

        if (typeof value === 'string') {
          valSpan.className = 'tree-val-string';
          valSpan.textContent = '"' + value + '"';
        } else if (typeof value === 'number') {
          valSpan.className = 'tree-val-number';
          valSpan.textContent = String(value);
        } else if (typeof value === 'boolean') {
          valSpan.className = 'tree-val-boolean';
          valSpan.textContent = String(value);
        } else if (value === null) {
          valSpan.className = 'tree-val-null';
          valSpan.textContent = 'null';
        }
        line.appendChild(valSpan);
      }

      // Hover Actions (Copy JSON Path)
      var actionsGroup = document.createElement('div');
      actionsGroup.className = 'tree-node-actions';

      var btnCopyPath = document.createElement('button');
      btnCopyPath.type = 'button';
      btnCopyPath.className = 'btn-copy-node-path';
      btnCopyPath.textContent = 'Copy Path';
      btnCopyPath.title = 'Copy ' + path;
      btnCopyPath.addEventListener('click', function (e) {
        e.stopPropagation();
        var cleanPath = path.replace(/^\$\./, '').replace(/^\$/, '');
        if (!cleanPath) cleanPath = '$';

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(path).then(function () {
            btnCopyPath.textContent = '✓ Copied!';
            setTimeout(function () { btnCopyPath.textContent = 'Copy Path'; }, 1200);
            showToast('✓ Path copied: <code>' + escapeHtml(path) + '</code>');
          });
        }
      });
      actionsGroup.appendChild(btnCopyPath);
      line.appendChild(actionsGroup);

      nodeWrapper.appendChild(line);

      // Child branches for Containers
      if (isContainer) {
        var childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-node-children' + (shouldCollapse ? ' collapsed' : '');

        if (isArr) {
          for (var i = 0; i < value.length; i++) {
            var itemPath = path + '[' + i + ']';
            var childNode = createTreeNode(String(i), value[i], itemPath, depth + 1, true);
            childrenContainer.appendChild(childNode);
          }
        } else {
          var keys = Object.keys(value);
          if (settings.sortKeys === 'alpha') {
            keys.sort(function (a, b) { return a.localeCompare(b); });
          }

          for (var j = 0; j < keys.length; j++) {
            var k = keys[j];
            var childPath = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? (path === '$' ? '$.' + k : path + '.' + k) : path + '["' + k + '"]';
            var childObjNode = createTreeNode(k, value[k], childPath, depth + 1, false);
            childrenContainer.appendChild(childObjNode);
          }
        }

        nodeWrapper.appendChild(childrenContainer);

        // Closing bracket
        var closeLine = document.createElement('div');
        closeLine.className = 'tree-line';
        var closeBracket = document.createElement('span');
        closeBracket.className = 'tree-bracket';
        closeBracket.textContent = isArr ? ']' : '}';
        closeLine.appendChild(closeBracket);
        nodeWrapper.appendChild(closeLine);
      }

      return nodeWrapper;
    }

    // 7. Tree Search & Filter Engine
    function applyTreeFilter(query) {
      if (!treeMount) return;
      var cleanQuery = (query || '').trim().toLowerCase();

      // Clear previous marks
      var marked = treeMount.querySelectorAll('.tree-highlight-match');
      marked.forEach(function (el) {
        var parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      });

      if (!cleanQuery) {
        return;
      }

      var nodes = treeMount.querySelectorAll('.tree-node');
      nodes.forEach(function (node) {
        var searchableElements = node.querySelectorAll('[data-searchable]');
        var hasMatch = false;

        searchableElements.forEach(function (el) {
          var text = el.getAttribute('data-searchable') || '';
          if (text.toLowerCase().includes(cleanQuery)) {
            hasMatch = true;
            highlightElementText(el, cleanQuery);
          }
        });

        if (hasMatch) {
          // Unfold all parent branches
          var parent = node.parentElement;
          while (parent && parent !== treeMount) {
            if (parent.classList.contains('tree-node-children')) {
              parent.classList.remove('collapsed');
              var parentNode = parent.parentElement;
              if (parentNode) {
                var toggle = parentNode.querySelector(':scope > .tree-line > .tree-toggle-btn');
                if (toggle) toggle.classList.remove('collapsed');
              }
            }
            parent = parent.parentElement;
          }
        }
      });
    }

    function highlightElementText(el, query) {
      var inner = el.innerHTML;
      var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      el.innerHTML = inner.replace(regex, '<mark class="tree-highlight-match">$1</mark>');
    }

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterQuery = this.value;
        if (searchClear) searchClear.style.display = filterQuery.length > 0 ? 'block' : 'none';
        applyTreeFilter(filterQuery);
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', function () {
        if (searchInput) {
          searchInput.value = '';
          filterQuery = '';
          searchClear.style.display = 'none';
          applyTreeFilter('');
          searchInput.focus();
        }
      });
    }

    // Depth Expansion Buttons
    if (btnExpandAll) {
      btnExpandAll.addEventListener('click', function () {
        if (!treeMount) return;
        treeMount.querySelectorAll('.tree-node-children').forEach(function (el) { el.classList.remove('collapsed'); });
        treeMount.querySelectorAll('.tree-toggle-btn').forEach(function (el) { el.classList.remove('collapsed'); });
      });
    }

    if (btnCollapseAll) {
      btnCollapseAll.addEventListener('click', function () {
        if (!treeMount) return;
        treeMount.querySelectorAll('.tree-node-children').forEach(function (el) { el.classList.add('collapsed'); });
        treeMount.querySelectorAll('.tree-toggle-btn').forEach(function (el) { el.classList.add('collapsed'); });
      });
    }

    if (btnDepth1) {
      btnDepth1.addEventListener('click', function () {
        expandToDepthLevel(1);
      });
    }

    if (btnDepth2) {
      btnDepth2.addEventListener('click', function () {
        expandToDepthLevel(2);
      });
    }

    function expandToDepthLevel(maxLevel) {
      if (!treeMount) return;
      var root = treeMount.querySelector('.tree-node-root');
      if (!root) return;

      function traverse(el, currentDepth) {
        var children = el.querySelector(':scope > .tree-node-children');
        var toggle = el.querySelector(':scope > .tree-line > .tree-toggle-btn');

        if (children) {
          if (currentDepth <= maxLevel) {
            children.classList.remove('collapsed');
            if (toggle) toggle.classList.remove('collapsed');
          } else {
            children.classList.add('collapsed');
            if (toggle) toggle.classList.add('collapsed');
          }

          var childNodes = children.querySelectorAll(':scope > .tree-node');
          childNodes.forEach(function (child) {
            traverse(child, currentDepth + 1);
          });
        }
      }

      traverse(root, 1);
    }

    // 8. Table View Generator
    var currentTableDataset = null;

    function renderTable(data) {
      if (!tableMount) return;
      var targetArray = null;

      if (Array.isArray(data)) {
        targetArray = data;
      } else if (typeof data === 'object' && data !== null) {
        // Look for first array property inside object
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          if (Array.isArray(data[keys[i]]) && data[keys[i]].length > 0) {
            targetArray = data[keys[i]];
            break;
          }
        }
      }

      if (!targetArray || targetArray.length === 0 || typeof targetArray[0] !== 'object' || targetArray[0] === null) {
        currentTableDataset = null;
        tableMount.innerHTML = 
          '<div class="visualizer-empty-state">' +
            '<iconify-icon icon="lucide:table" width="36" height="36"></iconify-icon>' +
            '<div class="visualizer-empty-title">No Array of Objects Found</div>' +
            '<div class="visualizer-empty-desc">Table view generates automatically when your JSON contains a list of records.</div>' +
          '</div>';
        if (tableSummaryText) tableSummaryText.textContent = 'Tabular Grid View (No array records)';
        if (btnExportCsv) btnExportCsv.disabled = true;
        return;
      }

      currentTableDataset = targetArray;
      if (tableSummaryText) tableSummaryText.textContent = 'Showing ' + targetArray.length + ' records';
      if (btnExportCsv) btnExportCsv.disabled = false;

      // Extract unique column headers
      var headerSet = {};
      targetArray.forEach(function (item) {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(function (k) { headerSet[k] = true; });
        }
      });
      var headers = Object.keys(headerSet);

      var table = document.createElement('table');
      table.className = 'json-data-table';

      // Header row
      var thead = document.createElement('thead');
      var trHead = document.createElement('tr');
      var thIndex = document.createElement('th');
      thIndex.textContent = '#';
      thIndex.style.width = '40px';
      trHead.appendChild(thIndex);

      headers.forEach(function (h) {
        var th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      // Body rows
      var tbody = document.createElement('tbody');
      targetArray.forEach(function (row, idx) {
        var tr = document.createElement('tr');
        var tdIdx = document.createElement('td');
        tdIdx.textContent = idx + 1;
        tdIdx.style.color = 'var(--text-muted)';
        tr.appendChild(tdIdx);

        headers.forEach(function (h) {
          var td = document.createElement('td');
          var cellVal = row ? row[h] : '';
          if (cellVal === undefined) {
            td.innerHTML = '<span style="color:var(--text-muted);">-</span>';
          } else if (typeof cellVal === 'object' && cellVal !== null) {
            td.textContent = JSON.stringify(cellVal);
            td.title = JSON.stringify(cellVal);
          } else {
            td.textContent = String(cellVal);
            td.title = String(cellVal);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      tableMount.innerHTML = '';
      tableMount.appendChild(table);
    }

    // CSV Export Handler
    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', function () {
        if (!currentTableDataset || currentTableDataset.length === 0) {
          showToast('No table data to export.');
          return;
        }

        var headerSet = {};
        currentTableDataset.forEach(function (item) {
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(function (k) { headerSet[k] = true; });
          }
        });
        var headers = Object.keys(headerSet);

        function csvEscape(val) {
          if (val === null || val === undefined) return '""';
          var s = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return '"' + s.replace(/"/g, '""') + '"';
        }

        var csvLines = [];
        csvLines.push(headers.map(csvEscape).join(','));

        currentTableDataset.forEach(function (row) {
          var line = headers.map(function (h) {
            return csvEscape(row ? row[h] : '');
          }).join(',');
          csvLines.push(line);
        });

        var csvBlob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(csvBlob);
        var a = document.createElement('a');
        var dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = 'json-data-' + dateStr + '.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 150);
        showToast('✓ Exported table as CSV');
      });
    }

    // 9. Formatted Code Renderer
    function renderFormattedCode(data) {
      if (!codeMount) return;
      var indent = settings.indentSize === 'tab' ? '\t' : parseInt(settings.indentSize, 10) || 2;
      var formatted = JSON.stringify(data, null, indent);
      codeMount.textContent = formatted;
    }

    // 10. Empty & Error States
    function renderEmptyStates(statusText, metaText) {
      if (statusBadge) {
        statusBadge.innerHTML = '<span class="status-badge-valid"><iconify-icon icon="lucide:check-circle-2" width="14" height="14"></iconify-icon><span>' + statusText + '</span></span>';
      }
      if (statusMeta) statusMeta.textContent = metaText;

      if (treeMount) {
        treeMount.innerHTML = 
          '<div class="visualizer-empty-state">' +
            '<iconify-icon icon="lucide:binary" width="36" height="36"></iconify-icon>' +
            '<div class="visualizer-empty-title">Awaiting JSON Data</div>' +
            '<div class="visualizer-empty-desc">Paste or type JSON on the left to render an interactive collapsible tree view.</div>' +
          '</div>';
      }
      if (tableMount) {
        tableMount.innerHTML = 
          '<div class="visualizer-empty-state">' +
            '<iconify-icon icon="lucide:table" width="36" height="36"></iconify-icon>' +
            '<div class="visualizer-empty-title">No Array Dataset Found</div>' +
            '<div class="visualizer-empty-desc">Table view generates automatically when your JSON contains an array of objects.</div>' +
          '</div>';
      }
      if (codeMount) codeMount.textContent = '// Formatted JSON will appear here...';
    }

    function renderErrorState(errMessage) {
      if (treeMount) {
        treeMount.innerHTML = 
          '<div class="visualizer-empty-state">' +
            '<iconify-icon icon="lucide:alert-triangle" width="36" height="36" style="color:#EF4444; opacity:0.8;"></iconify-icon>' +
            '<div class="visualizer-empty-title" style="color:#EF4444;">Invalid JSON Syntax</div>' +
            '<div class="visualizer-empty-desc">' + escapeHtml(errMessage) + '<br><br>Click <strong>Auto-Repair</strong> on the left to attempt auto-fixing common syntax errors.</div>' +
          '</div>';
      }
      if (codeMount) codeMount.textContent = '// Cannot format invalid JSON syntax.';
    }

    // 11. Textarea Event Listeners
    textarea.addEventListener('input', parseAndProcess);
    textarea.addEventListener('keyup', parseAndProcess);
    textarea.addEventListener('paste', function () {
      setTimeout(parseAndProcess, 10);
    });
    textarea.addEventListener('change', parseAndProcess);

    // 12. Actions: Beautify, Minify, Auto-Repair
    if (btnFormat) {
      btnFormat.addEventListener('click', function () {
        if (!textarea.value.trim()) {
          showToast('JSON input is empty.');
          return;
        }
        try {
          var parsed = JSON.parse(textarea.value);
          var indent = settings.indentSize === 'tab' ? '\t' : parseInt(settings.indentSize, 10) || 2;
          textarea.value = JSON.stringify(parsed, null, indent);
          parseAndProcess();
          showToast('✓ Formatted JSON with ' + (settings.indentSize === 'tab' ? 'Tabs' : settings.indentSize + ' spaces'));
        } catch (e) {
          showToast('Cannot format invalid JSON. Try Auto-Repair first!');
        }
      });
    }

    if (btnMinify) {
      btnMinify.addEventListener('click', function () {
        if (!textarea.value.trim()) {
          showToast('JSON input is empty.');
          return;
        }
        try {
          var parsed = JSON.parse(textarea.value);
          textarea.value = JSON.stringify(parsed);
          parseAndProcess();
          showToast('✓ Minified JSON to single line');
        } catch (e) {
          showToast('Cannot minify invalid JSON.');
        }
      });
    }

    if (btnRepair) {
      btnRepair.addEventListener('click', function () {
        var str = textarea.value;
        if (!str.trim()) {
          showToast('Input is empty.');
          return;
        }

        try {
          // Check if already valid
          JSON.parse(str);
          showToast('JSON is already valid!');
          return;
        } catch (initialErr) {}

        // Smart JSON Auto-Repair heuristic
        var repaired = str
          // 1. Remove trailing commas in objects and arrays
          .replace(/,(\s*[\}\]])/g, '$1')
          // 2. Replace single-quoted strings with double quotes
          .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
          // 3. Quote unquoted object keys (e.g. { foo: 123 } -> { "foo": 123 })
          .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');

        try {
          var parsedRepaired = JSON.parse(repaired);
          var indent = settings.indentSize === 'tab' ? '\t' : parseInt(settings.indentSize, 10) || 2;
          textarea.value = JSON.stringify(parsedRepaired, null, indent);
          parseAndProcess();
          showToast('✓ Successfully repaired and formatted JSON!');
        } catch (secondErr) {
          showToast('Could not automatically fix all syntax issues. Please check error location.');
        }
      });
    }

    // 13. Samples Loader
    function loadSample(sampleKey, label) {
      var sampleObj = SAMPLES[sampleKey];
      if (sampleObj) {
        var indent = settings.indentSize === 'tab' ? '\t' : parseInt(settings.indentSize, 10) || 2;
        textarea.value = JSON.stringify(sampleObj, null, indent);
        parseAndProcess();
        showToast('Loaded ' + label + ' sample');
      }
    }

    if (sampleUser) sampleUser.addEventListener('click', function () { loadSample('user', 'User Profile'); });
    if (sampleEcommerce) sampleEcommerce.addEventListener('click', function () { loadSample('ecommerce', 'E-Commerce Orders'); });
    if (sampleApi) sampleApi.addEventListener('click', function () { loadSample('api', 'Nested API Response'); });

    // 14. File Upload
    if (btnUploadTrigger && fileInput) {
      btnUploadTrigger.addEventListener('click', function () {
        fileInput.click();
      });

      fileInput.addEventListener('change', function (e) {
        if (e.target.files && e.target.files.length > 0) {
          var file = e.target.files[0];
          var reader = new FileReader();
          reader.onload = function (evt) {
            textarea.value = evt.target.result;
            parseAndProcess();
            showToast('✓ Loaded ' + file.name);
          };
          reader.readAsText(file);
          fileInput.value = '';
        }
      });
    }

    // 15. Clear Action with Undo Guard
    if (btnClear) {
      btnClear.addEventListener('click', function () {
        if (!textarea.value.trim()) {
          showToast('Input is already empty.');
          return;
        }
        lastClearedJson = textarea.value;
        textarea.value = '';
        parseAndProcess();

        showToast('JSON cleared.', 'Undo', function () {
          if (lastClearedJson !== null) {
            textarea.value = lastClearedJson;
            parseAndProcess();
            showToast('JSON restored successfully.');
          }
        });
      });
    }

    // 16. Copy Action
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        var text = textarea.value;
        if (!text.trim()) {
          showToast('Nothing to copy.');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            showToast('✓ JSON copied to clipboard!');
          }).catch(function () {
            textarea.select();
            document.execCommand('copy');
            showToast('✓ JSON copied to clipboard!');
          });
        } else {
          textarea.select();
          document.execCommand('copy');
          showToast('✓ JSON copied to clipboard!');
        }
      });
    }

    // 17. Download JSON Action
    if (btnDownload) {
      btnDownload.addEventListener('click', function () {
        var text = textarea.value;
        if (!text.trim()) {
          showToast('Cannot download empty JSON.');
          return;
        }
        var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = 'data-' + dateStr + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 150);
        showToast('✓ Downloaded data-' + dateStr + '.json');
      });
    }

    // Initialize State
    loadSettings();

    // Check for saved content or load default User sample
    try {
      var savedContent = localStorage.getItem(STORAGE_KEY);
      if (savedContent && savedContent.trim()) {
        textarea.value = savedContent;
      } else {
        textarea.value = JSON.stringify(SAMPLES.user, null, 2);
      }
    } catch (e) {
      textarea.value = JSON.stringify(SAMPLES.user, null, 2);
    }

    parseAndProcess();
  }

  // Safe Multi-Stage Initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisualizer);
  } else {
    initVisualizer();
  }

})();
