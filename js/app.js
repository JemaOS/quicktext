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

  chrome.runtime.getBackgroundPage(function(bg) {
    bg.background.onWindowReady(this);
  }.bind(this));
};

/**
 * Setup the format toolbar in the header.
 */
TextApp.prototype.setupFormatToolbar_ = function() {
  const cutBtn = document.getElementById('cut-btn');
  const copyBtn = document.getElementById('copy-btn');
  const pasteBtn = document.getElementById('paste-btn');
  
  const fontFamilySelect = document.getElementById('font-family-select');
  const fontSizeInput = document.getElementById('font-size-input');
  const textColorInput = document.getElementById('text-color-input');
  const boldBtn = document.getElementById('bold-btn');
  const italicBtn = document.getElementById('italic-btn');
  const alignLeftBtn = document.getElementById('align-left-btn');
  const alignCenterBtn = document.getElementById('align-center-btn');
  const alignRightBtn = document.getElementById('align-right-btn');

  // Load saved settings or defaults
  const savedFont = localStorage.getItem('quicktext_font_family') || 'monospace';
  let savedColor = localStorage.getItem('quicktext_text_color') || '';
  let isBold = localStorage.getItem('quicktext_text_bold') === 'true';
  let isItalic = localStorage.getItem('quicktext_text_italic') === 'true';

  fontFamilySelect.value = savedFont;
  
  // Sync font size with settings
  if (this.settings_) {
    fontSizeInput.value = this.settings_.get('fontsize');
  }
  
  $(document).bind('settingschange', (e, key, value) => {
    if (key === 'fontsize') {
      fontSizeInput.value = value;
    } else if (key === 'theme') {
      setTimeout(updateColorPickerUI, 50);
    }
  });

  fontSizeInput.addEventListener('change', (e) => {
    if (this.settings_) {
      this.settings_.set('fontsize', parseInt(e.target.value));
    }
  });
  
  const updateColorPickerUI = () => {
    if (savedColor) {
      textColorInput.value = savedColor;
    } else {
      // If no custom color, show the theme's default text color
      const isDark = document.body.getAttribute('theme') === 'dark';
      textColorInput.value = isDark ? '#f8f8f2' : '#000000';
    }
  };

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
    
    if (savedColor) {
      editorEl.style.setProperty('--ta-editor-text-color', savedColor);
    } else {
      editorEl.style.removeProperty('--ta-editor-text-color');
    }
    
    // Apply alignment to CodeMirror content
    const currentAlign = localStorage.getItem('quicktext_text_align') || 'left';
    const cmContent = editorEl.querySelector('.cm-content');
    if (cmContent) {
      cmContent.style.textAlign = currentAlign;
    }
    
    updateColorPickerUI();
    updateStyleButtons();
  };

  // Apply initially (might need a slight delay for CodeMirror to render)
  setTimeout(applyFormat, 100);

  fontFamilySelect.addEventListener('change', (e) => {
    localStorage.setItem('quicktext_font_family', e.target.value);
    applyFormat();
  });

  textColorInput.addEventListener('input', (e) => {
    savedColor = e.target.value;
    localStorage.setItem('quicktext_text_color', savedColor);
    applyFormat();
  });
  
  boldBtn.addEventListener('click', () => {
    isBold = !isBold;
    localStorage.setItem('quicktext_text_bold', isBold);
    applyFormat();
  });

  italicBtn.addEventListener('click', () => {
    isItalic = !isItalic;
    localStorage.setItem('quicktext_text_italic', isItalic);
    applyFormat();
  });
  
  // Add a reset color button
  const resetColorBtn = document.createElement('button');
  resetColorBtn.className = 'mdc-icon-button material-icons';
  resetColorBtn.style.cssText = 'width: 32px; height: 32px; padding: 4px; font-size: 18px; margin-left: 2px; border-radius: 50%;';
  resetColorBtn.title = 'Réinitialiser la couleur';
  resetColorBtn.textContent = 'format_color_reset';
  resetColorBtn.addEventListener('click', () => {
    savedColor = '';
    localStorage.removeItem('quicktext_text_color');
    applyFormat();
  });
  textColorInput.parentNode.insertBefore(resetColorBtn, textColorInput.nextSibling);

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
  
  // Re-apply alignment when switching tabs (since CodeMirror might recreate the content div)
  $(document).bind('switchtab', () => {
    setTimeout(() => {
      const align = localStorage.getItem('quicktext_text_align') || 'left';
      const cmContent = document.querySelector('.cm-content');
      if (cmContent) cmContent.style.textAlign = align;
    }, 50);
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
