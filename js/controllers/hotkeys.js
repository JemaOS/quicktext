/* Copyright (c) 2025 Jema Technology.
     Distributed under the license specified in the root directory of this project. */
/**
 * @constructor
 */
function HotkeysController(windowController, tabs, editor, settings,
    settingsController) {
  this.windowController_ = windowController;
  this.tabs_ = tabs;
  this.editor_ = editor;
  this.settings_ = settings;
  this.settingsController_ = settingsController;

  this.ZOOM_IN_FACTOR = 9 / 8;
  this.ZOOM_OUT_FACTOR = 8 / 9;

  $(document).keydown(this.onKeydown_.bind(this));
};

/**
 * Handles hotkey combination if present in keydown event.
 * Some hotkeys are handled by CodeMirror directly. Among them:
 * Ctrl-C, Ctrl-V, Ctrl-X, Ctrl-Z, Ctrl-Y, Ctrl-A
 * @param {!Event} e The keydown event
 * @private
 */
HotkeysController.prototype.onKeydown_ = function(e) {
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();
    
    // Handle Tab specially for shift key
    if (key === 'tab') {
      return this.handleTabNavigation_(e.shiftKey);
    }
    
    // Map keys to handler functions
    const handlers = {
      'e': () => this.handleSidebarFocus_(),
      'f': () => this.handleSearchFocus_(),
      'n': () => this.handleNewTab_(e.shiftKey),
      'o': () => this.tabs_.openFiles(),
      'p': () => window.print(),
      's': () => this.handleSave_(e.shiftKey),
      'w': () => this.handleClose_(e.shiftKey),
      '0': () => this.settings_.reset('fontsize'),
      ')': () => this.settings_.reset('fontsize'),
      '+': () => this.handleZoomIn_(),
      '=': () => this.handleZoomIn_(),
      '-': () => this.handleZoomOut_(),
      '_': () => this.handleZoomOut_()
    };
    
    const handler = handlers[key];
    if (handler) {
      handler();
      return false;
    }
  } else if (e.altKey) {
    if (e.key === ' ') {
      $('#toggle-sidebar').click();
      return false;
    }
  }
};

HotkeysController.prototype.handleTabNavigation_ = function(shiftKey) {
  if (shiftKey) {
    this.tabs_.previousTab();
  } else {
    this.tabs_.nextTab();
  }
  return false;
};

HotkeysController.prototype.handleSidebarFocus_ = function() {
  this.windowController_.openSidebar();
  this.settingsController_.closeSettings();
  document.querySelector('.sidebar-button').focus();
};

HotkeysController.prototype.handleSearchFocus_ = function() {
  document.getElementById('search-input').focus();
};

HotkeysController.prototype.handleNewTab_ = function(shiftKey) {
  if (shiftKey) {
    this.tabs_.newWindow();
  } else {
    this.tabs_.newTab();
  }
};

HotkeysController.prototype.handleSave_ = function(shiftKey) {
  if (shiftKey) {
    this.tabs_.saveAs();
  } else {
    this.tabs_.save();
  }
};

HotkeysController.prototype.handleClose_ = function(shiftKey) {
  if (shiftKey) {
    this.windowController_.close();
  } else {
    this.tabs_.closeCurrent();
  }
};

HotkeysController.prototype.handleZoomIn_ = function() {
  let fontSize = this.settings_.get('fontsize');
  this.settings_.set('fontsize', fontSize * this.ZOOM_IN_FACTOR);
};

HotkeysController.prototype.handleZoomOut_ = function() {
  let fontSize = this.settings_.get('fontsize');
  this.settings_.set('fontsize', fontSize * this.ZOOM_OUT_FACTOR);
};
