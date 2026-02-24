/* Copyright (c) 2025 Jema Technology.
     Distributed under the license specified in the root directory of this project. */
/**
 * @constructor
 */
function TextApp() {
  /** @type {EditorCodeMirror} */
  this.editor_ = null;
  this.settings_ = null;
  this.tabs_ = null;

  this.dialogController_ = null;
  this.hotkeysController_ = null;
  this.menuController_ = null;
  this.searchController_ = null;
  this.settingsController_ = null;
  this.windowController_ = null;

  this.hasFrame_ = false;
}

/**
 * Called when all the resources have loaded. All initializations should be done
 * here.
 */
TextApp.prototype.init = function() {
  this.settings_ = new Settings();
  // Editor is initalised after settings are ready.
  this.editor_ = null;

  if (this.settings_.isReady()) {
    this.onSettingsReady_();
  } else {
    $(document).bind('settingsready', this.onSettingsReady_.bind(this));
  }
  $(document).bind('settingschange', this.onSettingsChanged_.bind(this));
};

/**
 * Open one tab per FileEntry passed or a new Untitled tab if no tabs were
 * successfully opened.
 * @param {!Array.<FileEntry>} entries The file entries to be opened.
 */
TextApp.prototype.openTabs = function(entries) {
  for (let i = 0; i < entries.length; i++) {
    this.tabs_.openFileEntry(entries[i]);
  }
  this.windowController_.focus_();
  if (!this.tabs_.hasOpenTab()) {
    this.tabs_.newTab();
  }
};

TextApp.prototype.setHasChromeFrame = function(hasFrame) {
  this.hasFrame_ = hasFrame;
  this.windowController_.windowControlsVisible(!hasFrame);
};

/**
 * @return {Array.<FileEntry>}
 */
TextApp.prototype.getFilesToRetain = function() {
  return this.tabs_.getFilesToRetain();
};

TextApp.prototype.setTheme = function() {
  const theme = this.settings_.get('theme');

  this.windowController_.setTheme(theme);
  this.editor_.setTheme(theme);
};

/**
 * Called when all the services have started and settings are loaded.
 */
TextApp.prototype.onSettingsReady_ = function() {
  this.settingsController_ = new SettingsController(this.settings_);

  this.initEditor_();

  this.windowController_.setAlwaysOnTop(this.settings_.get('alwaysontop'));

  // Setup format toolbar
  this.setupFormatToolbar_();

  // Setup status bar
  this.setupStatusBar_();

  chrome.runtime.getBackgroundPage(function(bg) {
    bg.background.onWindowReady(this);
  }.bind(this));
};

/**
 * Setup the status bar at the bottom of the editor.
 */
TextApp.prototype.setupStatusBar_ = function() {
  const posEl    = document.getElementById('status-position');
  const charsEl  = document.getElementById('status-chars');

  const updateStatus = () => {
    const view = this.editor_?.editorView_;
    if (!view) return;
    const state = view.state;

    // Cursor position
    const sel = state.selection.main;
    const line = state.doc.lineAt(sel.head);
    const col  = sel.head - line.from + 1;
    if (posEl) posEl.textContent = `Ln ${line.number}, Col ${col}`;

    // Character / selection count
    if (charsEl) {
      if (!sel.empty) {
        const n = sel.to - sel.from;
        charsEl.textContent = `${n} sélectionné${n > 1 ? 's' : ''}`;
      } else {
        const total = state.doc.length;
        charsEl.textContent = `${total} caractère${total !== 1 ? 's' : ''}`;
      }
    }
  };

  // Hook into CodeMirror's update listener
  setTimeout(() => {
    const view = this.editor_?.editorView_;
    if (!view) return;
    view.dom.addEventListener('click',  updateStatus);
    view.dom.addEventListener('keyup',  updateStatus);
    view.dom.addEventListener('mouseup', updateStatus);
    updateStatus();
  }, 300);

  // Update on tab switch
  $(document).bind('switchtab', () => {
    setTimeout(updateStatus, 50);
  });

  // Update on document change
  $(document).bind('docchange', () => {
    updateStatus();
  });
};

/**
 * Setup the format toolbar in the header.
 */
TextApp.prototype.setupFormatToolbar_ = function() {
  const cutBtn = document.getElementById('cut-btn');
  const copyBtn = document.getElementById('copy-btn');
  const pasteBtn = document.getElementById('paste-btn');
  
  const fontFamilySelect = document.getElementById('font-family-select');
  const headingSelect = document.getElementById('heading-select');
  const boldBtn = document.getElementById('bold-btn');
  const italicBtn = document.getElementById('italic-btn');
  const alignLeftBtn = document.getElementById('align-left-btn');
  const alignCenterBtn = document.getElementById('align-center-btn');
  const alignRightBtn = document.getElementById('align-right-btn');

  // Load saved settings or defaults
  const savedFont = localStorage.getItem('quicktext_font_family') || 'monospace';
  let isBold = localStorage.getItem('quicktext_text_bold') === 'true';
  let isItalic = localStorage.getItem('quicktext_text_italic') === 'true';

  fontFamilySelect.value = savedFont;

  // Restore bold/italic button visual state immediately
  if (boldBtn) boldBtn.style.fontWeight = isBold ? 'bold' : 'normal';
  if (italicBtn) italicBtn.style.fontStyle = isItalic ? 'italic' : 'normal';

  // Clear last selection when user clicks in editor without selecting
  const editorEl = document.getElementById('editor');
  if (editorEl) {
    editorEl.addEventListener('mouseup', () => {
      const view = this.editor_?.editorView_;
      if (view && view.state.selection.main.empty) {
        this.editor_?.clearLastSelection();
      }
    });
  }

  // Helper: get the active selection (current or last saved)
  const getActiveSelection = () => {
    const view = this.editor_?.editorView_;
    if (!view) return null;
    // Current selection takes priority
    const cur = view.state.selection.main;
    if (!cur.empty) return { from: cur.from, to: cur.to };
    // Fall back to last saved selection
    return this.editor_?.getLastSelection() || null;
  };

  // Helper: apply style to active selection
  const applyStyleToActiveSelection = (style) => {
    const sel = getActiveSelection();
    if (!sel || sel.from === sel.to) return false;
    this.editor_.applyStyleToRange(sel.from, sel.to, style);
    return true;
  };

  // Heading level -> CSS style object for mark decorations (partial selection)
  const HEADING_MARK_STYLES = {
    1: { 'font-size': '2em',    'font-weight': 'bold',   'line-height': '1.3' },
    2: { 'font-size': '1.5em',  'font-weight': 'bold',   'line-height': '1.3' },
    3: { 'font-size': '1.25em', 'font-weight': 'bold',   'line-height': '1.3' },
    4: { 'font-size': '1.1em',  'font-weight': 'bold',   'line-height': '1.3' },
    5: { 'font-size': '1em',    'font-weight': 'bold',   'line-height': '1.3' },
    6: { 'font-size': '0.9em',  'font-weight': 'bold',   'line-height': '1.3' },
  };

  // Save heading line map to localStorage
  const saveHeadings = () => {
    if (!this.editor_) return;
    const map = this.editor_.getHeadingsByLineNumber();
    localStorage.setItem('quicktext_headings', JSON.stringify(map));
  };

  // Restore heading line map from localStorage
  const restoreHeadings = () => {
    if (!this.editor_) return;
    try {
      const saved = localStorage.getItem('quicktext_headings');
      if (saved) {
        const map = JSON.parse(saved);
        this.editor_.restoreHeadingsByLineNumber(map);
      }
    } catch (e) { /* ignore parse errors */ }
  };

  /**
   * Apply heading style:
   * - If text is selected → apply mark decoration to the selection only
   * - If no selection (cursor) → apply line decoration to the whole line
   */
  const applyHeading = (level) => {
    const view = this.editor_?.editorView_;
    if (!view) return;
    const state = view.state;
    const sel = state.selection.main;

    if (!sel.empty) {
      // Selection exists: apply/remove mark decoration on the selected range only
      if (level === 0) {
        // Remove heading styles from selection
        this.editor_.removeStyleFromRange(sel.from, sel.to, 'font-size');
        this.editor_.removeStyleFromRange(sel.from, sel.to, 'font-weight');
        this.editor_.removeStyleFromRange(sel.from, sel.to, 'line-height');
      } else {
        // First remove existing heading styles, then apply new ones
        this.editor_.removeStyleFromRange(sel.from, sel.to, 'font-size');
        this.editor_.removeStyleFromRange(sel.from, sel.to, 'font-weight');
        this.editor_.removeStyleFromRange(sel.from, sel.to, 'line-height');
        this.editor_.applyStyleToRange(sel.from, sel.to, HEADING_MARK_STYLES[level]);
      }
    } else {
      // No selection: apply line decoration to the whole cursor line
      const pos = sel.head;
      this.editor_.setHeadingOnLine(pos, level);
    }

    // Persist heading assignments
    saveHeadings();
    this.editor_.focus();
  };

  // Update heading select to reflect the heading level at cursor/selection.
  const updateHeadingSelect = () => {
    if (!headingSelect || !this.editor_) return;
    const view = this.editor_.editorView_;
    if (!view) return;
    const sel = view.state.selection.main;
    // Always read from the line decoration (cursor line)
    const level = this.editor_.getHeadingOnLine(sel.head);
    headingSelect.value = String(level);
  };

  if (headingSelect) {
    headingSelect.addEventListener('change', (e) => {
      applyHeading(Number.parseInt(e.target.value));
    });
  }

  // Update heading select whenever the cursor moves or the document changes
  setTimeout(() => {
    const view = this.editor_?.editorView_;
    if (view && headingSelect) {
      view.dom.addEventListener('click', updateHeadingSelect);
      view.dom.addEventListener('keyup', updateHeadingSelect);
      view.dom.addEventListener('mouseup', updateHeadingSelect);
    }
  }, 200);

  const updateStyleButtons = () => {
    boldBtn.style.backgroundColor = isBold ? 'var(--ta-highlight-color)' : 'transparent';
    italicBtn.style.backgroundColor = isItalic ? 'var(--ta-highlight-color)' : 'transparent';
    
    const currentAlign = localStorage.getItem('quicktext_text_align') || 'left';
    alignLeftBtn.style.backgroundColor = currentAlign === 'left' ? 'var(--ta-highlight-color)' : 'transparent';
    alignCenterBtn.style.backgroundColor = currentAlign === 'center' ? 'var(--ta-highlight-color)' : 'transparent';
    alignRightBtn.style.backgroundColor = currentAlign === 'right' ? 'var(--ta-highlight-color)' : 'transparent';
  };

  const applyFormat = () => {
    const editorEl = document.getElementById('editor');
    if (!editorEl) return;
    
    const font = fontFamilySelect.value;
    editorEl.style.setProperty('--ta-editor-font-family', font);
    
    if (isBold) {
      editorEl.style.setProperty('--ta-editor-font-weight', 'bold');
    } else {
      editorEl.style.removeProperty('--ta-editor-font-weight');
    }
    
    if (isItalic) {
      editorEl.style.setProperty('--ta-editor-font-style', 'italic');
    } else {
      editorEl.style.removeProperty('--ta-editor-font-style');
    }
    
    // Apply alignment to CodeMirror content
    const currentAlign = localStorage.getItem('quicktext_text_align') || 'left';
    const cmContent = editorEl.querySelector('.cm-content');
    if (cmContent) {
      cmContent.style.textAlign = currentAlign;
    }
    
    updateStyleButtons();
  };

  // Apply format settings on load and whenever CodeMirror re-renders its content div.
  // Use a MutationObserver so we catch the exact moment .cm-content appears in the DOM.
  const editorContainer = document.getElementById('editor');
  if (editorContainer) {
    const observer = new MutationObserver(() => {
      if (editorContainer.querySelector('.cm-content')) {
        applyFormat();
      }
    });
    observer.observe(editorContainer, { childList: true, subtree: true });
  }
  // Apply immediately and at intervals to ensure format is applied
  applyFormat();
  setTimeout(applyFormat, 100);
  setTimeout(applyFormat, 500);

  // Restore headings AFTER the first tab is loaded (switchtab fires after setSession)
  // This ensures headings are applied to the correct document state.
  let headingsRestoredOnce = false;
  $(document).bind('switchtab', () => {
    if (!headingsRestoredOnce) {
      headingsRestoredOnce = true;
      // Small delay to ensure the state is fully set
      setTimeout(restoreHeadings, 50);
    }
    setTimeout(applyFormat, 50);
  });

  fontFamilySelect.addEventListener('change', (e) => {
    if (applyStyleToActiveSelection({ 'font-family': e.target.value })) {
      // Reset select to global value
      e.target.value = localStorage.getItem('quicktext_font_family') || 'monospace';
    } else {
      // No selection - change global font family
      localStorage.setItem('quicktext_font_family', e.target.value);
      applyFormat();
    }
  });

  boldBtn.addEventListener('click', () => {
    const sel = getActiveSelection();
    if (sel && sel.from !== sel.to && this.editor_) {
      // Toggle bold on selection: remove if already bold, add if not
      if (this.editor_.hasStyleInRange(sel.from, sel.to, 'font-weight')) {
        this.editor_.removeStyleFromRange(sel.from, sel.to, 'font-weight');
      } else {
        this.editor_.applyStyleToRange(sel.from, sel.to, { 'font-weight': 'bold' });
      }
    } else {
      // No selection - toggle global bold
      isBold = !isBold;
      localStorage.setItem('quicktext_text_bold', isBold);
      applyFormat();
    }
  });

  italicBtn.addEventListener('click', () => {
    const sel = getActiveSelection();
    if (sel && sel.from !== sel.to && this.editor_) {
      // Toggle italic on selection: remove if already italic, add if not
      if (this.editor_.hasStyleInRange(sel.from, sel.to, 'font-style')) {
        this.editor_.removeStyleFromRange(sel.from, sel.to, 'font-style');
      } else {
        this.editor_.applyStyleToRange(sel.from, sel.to, { 'font-style': 'italic' });
      }
    } else {
      // No selection - toggle global italic
      isItalic = !isItalic;
      localStorage.setItem('quicktext_text_italic', isItalic);
      applyFormat();
    }
  });

  const setAlign = (align) => {
    localStorage.setItem('quicktext_text_align', align);
    const cmContent = document.querySelector('.cm-content');
    if (cmContent) cmContent.style.textAlign = align;
    updateStyleButtons();
  };

  alignLeftBtn.addEventListener('click', () => setAlign('left'));
  alignCenterBtn.addEventListener('click', () => setAlign('center'));
  alignRightBtn.addEventListener('click', () => setAlign('right'));
  
  // Edit actions
  cutBtn.addEventListener('click', () => {
    document.execCommand('cut');
    if (this.editor_) this.editor_.focus();
  });
  
  copyBtn.addEventListener('click', () => {
    document.execCommand('copy');
    if (this.editor_) this.editor_.focus();
  });
  
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (this.editor_ && this.editor_.editorView_) {
        const view = this.editor_.editorView_;
        const selection = view.state.selection.main;
        view.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: text
          },
          selection: { anchor: selection.from + text.length },
          scrollIntoView: true
        });
        this.editor_.focus();
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      // Fallback
      document.execCommand('paste');
      if (this.editor_) this.editor_.focus();
    }
  });
  
};

/**
 * Create all of the controllers the editor needs.
 */
TextApp.prototype.initControllers_ = function() {
  this.dialogController_ =
      new DialogController($('#dialog-container'), this.editor_);
  this.tabs_ = new Tabs(this.editor_, this.dialogController_, this.settings_);
  this.menuController_ = new MenuController(this.tabs_);
  this.windowController_ =
      new WindowController(this.editor_, this.settings_, this.tabs_);
  this.hotkeysController_ = new HotkeysController(
      this.windowController_, this.tabs_, this.editor_, this.settings_,
      this.settingsController_);
  this.searchController_ = new SearchController(this.editor_.getSearch());
};

/**
 * Loads all settings into the current editor.
 */
TextApp.prototype.loadSettingsIntoEditor = function() {
  this.setTheme();
  this.editor_.applyAllSettings();
};

/**
 * Create a new editor and load all settings.
 */
TextApp.prototype.initEditor_ = function() {
  if (this.editor_) {
    console.error("Trying to re-initialize text app");
    return;
  }

  const editor = document.getElementById('editor');
  this.editor_ = new EditorCodeMirror(editor, this.settings_);
  this.initControllers_();
  this.loadSettingsIntoEditor();
};

/**
 * @param {Event} e
 * @param {string} key
 * @param {*} value
 */
TextApp.prototype.onSettingsChanged_ = function(e, key, value) {
  switch (key) {
    case 'alwaysontop':
      this.windowController_.setAlwaysOnTop(value);
      break;

    case 'fontsize':
      this.editor_.setFontSize(value);
      break;

    case 'linenumbers':
      this.editor_.showHideLineNumbers(value);
      break;

    case 'spacestab':
      this.editor_.setReplaceTabWithSpaces(this.settings_.get('spacestab'));
      break;

    case 'tabsize':
      this.editor_.setTabSize(value);
      break;

    case 'theme':
      this.setTheme();
      break;

    case 'wraplines':
      this.editor_.setWrapLines(value);
      break;
  }
};

const textApp = new TextApp();
window.textApp = textApp; // Expose globally for PWA persistence

// Handle PWA file launch (when files are opened via file handler)
document.addEventListener('pwa-launch-files', function(e) {
  const files = e.detail;
  if (files && files.length > 0 && textApp.tabs_) {
    // Open each file passed via file handler
    files.forEach(fileData => {
      // Create a fake entry object to work with existing code
      const fakeEntry = {
        name: fileData.name,
        content: fileData.content,
        handle: fileData.handle,
        isPWAFile: true
      };
      textApp.tabs_.openFileEntry(fakeEntry);
    });
  }
});

// Handle PWA new-file launch (when user creates new file via context menu)
document.addEventListener('pwa-new-file', function(e) {
  if (textApp.tabs_) {
    // Create a new empty tab
    textApp.tabs_.newTab();
    // Focus the window
    if (textApp.windowController_) {
      textApp.windowController_.focus_();
    }
  }
});

document.addEventListener('DOMContentLoaded', function() {
  textApp.init();
});
