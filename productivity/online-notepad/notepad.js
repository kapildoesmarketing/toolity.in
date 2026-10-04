/* Designed by Kapil Pidhwani: Online Notepad Engine for Toolity.in */

(function () {
  'use strict';

  var STORAGE_KEY = 'toolity_notepad_content';
  var SETTINGS_KEY = 'toolity_notepad_settings';
  var lastClearedText = null;
  var saveTimeout = null;

  var settings = {
    fontFamily: 'sans',
    fontSize: '16',
    lineHeight: '1.75',
    tabBehavior: '2',
    spellcheck: 'on'
  };

  // 1. Live Statistics Counter
  window.updateNotepadMetrics = function () {
    var textarea = document.getElementById('notepad-textarea');
    if (!textarea) return;
    var text = textarea.value || '';

    var charCount = text.length;
    var charNoSpaceCount = text.replace(/\s/g, '').length;
    var trimmed = text.trim();
    var words = trimmed.length > 0 ? trimmed.match(/\S+/g) : null;
    var wordCount = words ? words.length : 0;
    var lineCount = text.length === 0 ? 0 : text.split('\n').length;
    var paragraphs = trimmed.length === 0 ? 0 : text.split(/\n+/).filter(function (p) {
      return p.trim().length > 0;
    }).length;

    var readingSeconds = Math.ceil((wordCount / 200) * 60);
    var speakingSeconds = Math.ceil((wordCount / 130) * 60);

    function formatDuration(sec) {
      if (sec <= 0 || wordCount === 0) return '0s';
      if (sec < 60) return sec + 's';
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      return s > 0 ? m + 'm ' + s + 's' : m + 'm';
    }

    var elWords = document.getElementById('stat-words');
    var elChars = document.getElementById('stat-chars');
    var elCharsNoSpace = document.getElementById('stat-chars-nospace');
    var elLines = document.getElementById('stat-lines');
    var elParas = document.getElementById('stat-paragraphs');
    var elRead = document.getElementById('stat-read-time');
    var elSpeak = document.getElementById('stat-speak-time');

    if (elWords) elWords.textContent = wordCount.toLocaleString();
    if (elChars) elChars.textContent = charCount.toLocaleString();
    if (elCharsNoSpace) elCharsNoSpace.textContent = charNoSpaceCount.toLocaleString();
    if (elLines) elLines.textContent = lineCount.toLocaleString();
    if (elParas) elParas.textContent = paragraphs.toLocaleString();
    if (elRead) elRead.textContent = formatDuration(readingSeconds);
    if (elSpeak) elSpeak.textContent = formatDuration(speakingSeconds);
  };

  // 2. Reactive Auto-Save System
  window.saveNotepadContent = function () {
    var textarea = document.getElementById('notepad-textarea');
    var saveStatus = document.getElementById('notepad-save-status');
    var saveStatusText = document.getElementById('save-status-text');
    if (!textarea) return;

    if (saveStatus && saveStatusText) {
      saveStatus.className = 'notepad-status-tag saving';
      saveStatusText.textContent = 'Saving...';
    }

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, textarea.value);
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      if (saveStatus && saveStatusText) {
        saveStatus.className = 'notepad-status-tag';
        saveStatusText.textContent = 'Auto-saved';
      }
    }, 150);
  };

  // 3. Toast Helper
  function showToast(message, actionText, actionCallback) {
    var existing = document.getElementById('notepad-custom-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'notepad-custom-toast';
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

  // 4. HTML Escape Utility
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 5. Main Tool Initializer
  function initNotepad() {
    var textarea = document.getElementById('notepad-textarea');
    if (!textarea) return;

    var btnClear = document.getElementById('btn-clear-notepad');
    var btnCopy = document.getElementById('btn-copy-notepad');
    var downloadWrap = document.getElementById('notepad-download-dropdown-wrap');
    var btnDownloadToggle = document.getElementById('btn-download-menu-toggle');
    var optDlTxt = document.getElementById('opt-dl-txt');
    var optDlMd = document.getElementById('opt-dl-md');
    var optDlDoc = document.getElementById('opt-dl-doc');

    var btnUpper = document.getElementById('btn-case-upper');
    var btnLower = document.getElementById('btn-case-lower');
    var btnTitle = document.getElementById('btn-case-title');
    var btnSentence = document.getElementById('btn-case-sentence');
    var btnCleanSpaces = document.getElementById('btn-clean-spaces');
    var btnSortLines = document.getElementById('btn-sort-lines');

    var segFontFamily = document.getElementById('seg-font-family');
    var segFontSize = document.getElementById('seg-font-size');
    var segLineHeight = document.getElementById('seg-line-height');
    var segTabBehavior = document.getElementById('seg-tab-behavior');
    var segSpellcheck = document.getElementById('seg-spellcheck');
    var settingsSummaryBadge = document.getElementById('settings-summary-badge');

    // Apply Settings
    function applySettingsToDOM() {
      try {
        textarea.classList.remove('font-sans', 'font-mono', 'font-serif');
        textarea.classList.add('font-' + (settings.fontFamily || 'sans'));
        updateSegmentedActive(segFontFamily, settings.fontFamily);

        textarea.style.fontSize = (settings.fontSize || '16') + 'px';
        updateSegmentedActive(segFontSize, settings.fontSize);

        textarea.style.lineHeight = settings.lineHeight || '1.75';
        updateSegmentedActive(segLineHeight, settings.lineHeight);

        updateSegmentedActive(segTabBehavior, settings.tabBehavior);

        textarea.spellcheck = settings.spellcheck === 'on';
        updateSegmentedActive(segSpellcheck, settings.spellcheck);

        updateSettingsSummaryBadge();
      } catch (e) {
        console.warn('applySettings error:', e);
      }
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
      var fontLabel = settings.fontFamily === 'mono' ? 'Mono' : settings.fontFamily === 'serif' ? 'Serif' : 'Inter Sans';
      var lineLabel = settings.lineHeight === '1.5' ? 'Compact' : settings.lineHeight === '2.0' ? 'Spacious' : 'Relaxed';
      settingsSummaryBadge.textContent = '(' + fontLabel + ' • ' + settings.fontSize + 'px • ' + lineLabel + ')';
    }

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
        console.warn('loadSettings error:', e);
      }
      applySettingsToDOM();
    }

    function saveSettings() {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn('saveSettings error:', e);
      }
      updateSettingsSummaryBadge();
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
        });
      });
    }

    setupSegmentedGroup(segFontFamily, 'fontFamily');
    setupSegmentedGroup(segFontSize, 'fontSize');
    setupSegmentedGroup(segLineHeight, 'lineHeight');
    setupSegmentedGroup(segTabBehavior, 'tabBehavior');
    setupSegmentedGroup(segSpellcheck, 'spellcheck');

    // Load initial content
    try {
      var savedContent = localStorage.getItem(STORAGE_KEY);
      if (savedContent !== null && textarea.value === '') {
        textarea.value = savedContent;
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }

    // Textarea Event Listeners
    textarea.addEventListener('input', function () {
      window.updateNotepadMetrics();
      window.saveNotepadContent();
    });
    textarea.addEventListener('keyup', window.updateNotepadMetrics);
    textarea.addEventListener('paste', function () {
      setTimeout(function () {
        window.updateNotepadMetrics();
        window.saveNotepadContent();
      }, 10);
    });
    textarea.addEventListener('cut', function () {
      setTimeout(function () {
        window.updateNotepadMetrics();
        window.saveNotepadContent();
      }, 10);
    });
    textarea.addEventListener('change', function () {
      window.updateNotepadMetrics();
      window.saveNotepadContent();
    });

    // Indentation & Shortcuts
    textarea.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        downloadFile('txt');
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;
        var tabVal = settings.tabBehavior === '4' ? '    ' : settings.tabBehavior === 'tab' ? '\t' : '  ';
        this.value = this.value.substring(0, start) + tabVal + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + tabVal.length;
        window.updateNotepadMetrics();
        window.saveNotepadContent();
      }
    });

    // Clear Action
    if (btnClear) {
      btnClear.addEventListener('click', function () {
        if (textarea.value.trim().length === 0) {
          showToast('Note canvas is already empty.');
          return;
        }
        lastClearedText = textarea.value;
        textarea.value = '';
        window.updateNotepadMetrics();
        window.saveNotepadContent();

        showToast('Note cleared.', 'Undo', function () {
          if (lastClearedText !== null) {
            textarea.value = lastClearedText;
            window.updateNotepadMetrics();
            window.saveNotepadContent();
            showToast('Note restored successfully.');
          }
        });
      });
    }

    // Copy Action
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        var text = textarea.value;
        if (!text) {
          showToast('Notepad is empty.');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            showToast('✓ Note copied to clipboard!');
          }).catch(function () {
            fallbackCopy(text);
          });
        } else {
          fallbackCopy(text);
        }
      });
    }

    function fallbackCopy(text) {
      textarea.select();
      try {
        document.execCommand('copy');
        showToast('✓ Note copied to clipboard!');
      } catch (err) {
        showToast('Failed to copy. Please select text manually.');
      }
    }

    // Download Menu Toggle
    if (btnDownloadToggle && downloadWrap) {
      btnDownloadToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = downloadWrap.classList.contains('open');
        if (isOpen) {
          downloadWrap.classList.remove('open');
          btnDownloadToggle.setAttribute('aria-expanded', 'false');
        } else {
          downloadWrap.classList.add('open');
          btnDownloadToggle.setAttribute('aria-expanded', 'true');
        }
      });

      document.addEventListener('click', function (e) {
        if (!downloadWrap.contains(e.target)) {
          downloadWrap.classList.remove('open');
          btnDownloadToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // File Exporters
    function downloadFile(format) {
      var text = textarea.value;
      if (!text.trim()) {
        showToast('Cannot export an empty note. Write some text first!');
        return;
      }

      var now = new Date();
      var dateStr = now.toISOString().slice(0, 10);
      var filename = 'note-' + dateStr + '.' + format;
      var blob;

      if (format === 'txt') {
        blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      } else if (format === 'md') {
        blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      } else if (format === 'doc') {
        var docContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:11pt;line-height:1.6;white-space:pre-wrap;">' + escapeHtml(text) + '</body></html>';
        blob = new Blob([docContent], { type: 'application/msword;charset=utf-8' });
      }

      if (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 150);
        showToast('✓ Downloaded as ' + filename);
      }

      if (downloadWrap) {
        downloadWrap.classList.remove('open');
        if (btnDownloadToggle) btnDownloadToggle.setAttribute('aria-expanded', 'false');
      }
    }

    if (optDlTxt) optDlTxt.addEventListener('click', function () { downloadFile('txt'); });
    if (optDlMd) optDlMd.addEventListener('click', function () { downloadFile('md'); });
    if (optDlDoc) optDlDoc.addEventListener('click', function () { downloadFile('doc'); });

    // Text Transformations
    function applyTextTransformation(transformFn) {
      var start = textarea.selectionStart;
      var end = textarea.selectionEnd;
      var fullText = textarea.value;

      if (!fullText) {
        showToast('Notepad is empty.');
        return;
      }

      if (start !== end) {
        var selected = fullText.substring(start, end);
        var transformed = transformFn(selected);
        textarea.value = fullText.substring(0, start) + transformed + fullText.substring(end);
        textarea.selectionStart = start;
        textarea.selectionEnd = start + transformed.length;
      } else {
        textarea.value = transformFn(fullText);
      }

      window.updateNotepadMetrics();
      window.saveNotepadContent();
    }

    if (btnUpper) {
      btnUpper.addEventListener('click', function () {
        applyTextTransformation(function (txt) { return txt.toUpperCase(); });
        showToast('Converted to UPPERCASE');
      });
    }

    if (btnLower) {
      btnLower.addEventListener('click', function () {
        applyTextTransformation(function (txt) { return txt.toLowerCase(); });
        showToast('Converted to lowercase');
      });
    }

    if (btnTitle) {
      btnTitle.addEventListener('click', function () {
        applyTextTransformation(function (txt) {
          var minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of'];
          return txt.toLowerCase().split(/(\s+)/).map(function (word, index) {
            if (/^\s+$/.test(word) || word.length === 0) return word;
            var clean = word.replace(/[^a-zA-Z0-9]/g, '');
            if (index > 0 && minorWords.indexOf(clean.toLowerCase()) !== -1) {
              return word.toLowerCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }).join('');
        });
        showToast('Converted to Title Case');
      });
    }

    if (btnSentence) {
      btnSentence.addEventListener('click', function () {
        applyTextTransformation(function (txt) {
          return txt.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, function (match, separator, char) {
            return separator + char.toUpperCase();
          });
        });
        showToast('Converted to Sentence case');
      });
    }

    if (btnCleanSpaces) {
      btnCleanSpaces.addEventListener('click', function () {
        applyTextTransformation(function (txt) {
          var lines = txt.split('\n').map(function (line) {
            return line.replace(/[ \t]+$/g, '').replace(/[ \t]{2,}/g, ' ');
          });
          return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        });
        showToast('Cleaned redundant whitespace');
      });
    }

    if (btnSortLines) {
      btnSortLines.addEventListener('click', function () {
        applyTextTransformation(function (txt) {
          var lines = txt.split('\n');
          lines.sort(function (a, b) {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
          });
          return lines.join('\n');
        });
        showToast('Lines sorted alphabetically');
      });
    }

    // Init state
    loadSettings();
    window.updateNotepadMetrics();
  }

  // Multi-stage safe initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotepad);
  } else {
    initNotepad();
  }

  window.addEventListener('load', function () {
    window.updateNotepadMetrics();
  });
})();
