/* Copyright (c) 2025 Jema Technology.
     Distributed under the license specified in the root directory of this project. */
/**
 * @constructor
 */
function WindowController(editor, settings, tabs) {
  this.editor_ = editor;
  this.settings_ = settings;
  this.tabs_ = tabs;
  document.getElementById('window-close').addEventListener('click', () => {
    this.close();
  });
  $('#window-minimize').click(this.minimize_.bind(this));
  $('#window-maximize').click(this.maximize_.bind(this));
  $('#toggle-sidebar').click(this.toggleSidebar_.bind(this));
  $('#sidebar').on('transitionend', this.updateSidebarVisibility_.bind(this));
  $('#sidebar-resizer').mousedown(this.resizeStart_.bind(this));
  $(window).bind('error', this.onError_.bind(this));
  $(document).bind('filesystemerror', this.onFileSystemError.bind(this));
  $(document).bind('loadingfile', this.onLoadingFile.bind(this));
  $(document).bind('switchtab', this.onChangeTab_.bind(this));
  $(document).bind('tabchange', this.onTabChange_.bind(this));
  $(document).bind('tabpathchange', this.onTabPathChange.bind(this));
  $(document).bind('tabrenamed', this.onChangeTab_.bind(this));
  $(document).bind('tabsave', this.onTabChange_.bind(this));

  this.initUI_();
  
  const self = this;
  $('#title-filename').dblclick(function() {
    const tab = self.tabs_.getCurrentTab();
    if (!tab) return;
    
    // Allow renaming for all tabs (both saved and unsaved)
    $(this).attr('contenteditable', 'true').focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(this);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  
  // Enforce max length on header title input
  $('#title-filename').on('input', function() {
    const maxLength = 50;
    if ($(this).text().length > maxLength) {
      const truncated = $(this).text().substring(0, maxLength);
      $(this).text(truncated);
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(this);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  $('#title-filename').on('blur keydown', function(e) {
    if ($(this).attr('contenteditable') !== 'true') return;
    
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== 'Escape') return;
    
    if (e.type === 'keydown') {
      e.preventDefault();
      $(this).blur();
      return;
    }
    
    $(this).attr('contenteditable', 'false');
    const newName = $(this).text().trim();
    const tab = self.tabs_.getCurrentTab();
    if (tab && newName && newName !== tab.getName()) {
      // Rename the tab (works for both saved and unsaved tabs)
      tab.setName(newName);
    } else if (tab) {
      // Revert to original name if empty or unchanged
      $(this).text(tab.getName());
    }
  });
}

/**
 * Performs all the required initialization for the UI.
 * @private
 */
WindowController.prototype.initUI_ = function() {
  for (const element of document.querySelectorAll('.mdc-icon-button')) {
    const ripple = mdc.ripple.MDCRipple.attachTo(element);
    ripple.unbounded = true;
    // Required due to issue
    // https://github.com/material-components/material-components-web/issues/3984
    new ResizeObserver(() => {
      ripple.layout();
    }).observe(element);
  }
  for (const element of document.querySelectorAll('.mdc-switch')) {
    new mdc.switchControl.MDCSwitch(element);
  }
  for (const element of document.querySelectorAll('.mdc-radio')) {
    const formField = new mdc.formField.MDCFormField(element.parentElement);
    formField.input = new mdc.radio.MDCRadio(element);
  }
  if (this.settings_.isReady()) {
    this.initSidebar_();
  } else {
    $(document).bind('settingsready', this.initSidebar_.bind(this));
  }
};

WindowController.prototype.initSidebar_ = function() {
  // FIXME: move this to CSS where possible (init code)
  if (this.settings_.get('sidebaropen')) {
    $('#sidebar').css('width', this.settings_.get('sidebarwidth') + 'px');
    $('#sidebar').css('border-right-width', '2px');
    $('#toggle-sidebar')
        .attr('title', chrome.i18n.getMessage('closeSidebarButton'));
  } else {
    $('#sidebar').css('width', '0');
    $('#sidebar').css('border-right-width', '0');
    $('#toggle-sidebar')
        .attr('title', chrome.i18n.getMessage('openSidebarButton'));
  }
  this.updateSidebarVisibility_();
};

WindowController.prototype.windowControlsVisible = function(show) {
  if (show) {
    $('header').removeClass('hide-controls');
  } else {
    $('header').addClass('hide-controls');
  }
};

/**
 * @param {string} theme
 */
WindowController.prototype.setTheme = function(theme) {
  $('body').attr('theme', theme);
};

/**
 * Close app window after warning user of all unsaved progress if present.
 */
WindowController.prototype.close = function() {
  this.tabs_.promptAllUnsaved(window.close);
};

WindowController.prototype.focus_ = function() {
  window.chrome.app.window.current().focus();
};

WindowController.prototype.minimize_ = function() {
  window.chrome.app.window.current().minimize();
};

WindowController.prototype.maximize_ = function() {
  const maximized = window.chrome.app.window.current().isMaximized();

  if (maximized) {
    window.chrome.app.window.current().restore();
    $('#window-maximize')
        .attr('title', chrome.i18n.getMessage('maximizeButton'));
  } else {
    window.chrome.app.window.current().maximize();
    $('#window-maximize')
        .attr('title', chrome.i18n.getMessage('restoreButton'));
  }
};

WindowController.prototype.setAlwaysOnTop = function(isAlwaysOnTop) {
  window.chrome.app.window.current().setAlwaysOnTop(isAlwaysOnTop);
};

/** Opens the sidebar if it is closed. */
WindowController.prototype.openSidebar = function() {
  if (this.settings_.get('sidebaropen')) return;
  this.settings_.set('sidebaropen', true);
    $('#sidebar').css('width', this.settings_.get('sidebarwidth') + 'px');
    $('#sidebar').css('border-right-width', '2px');
    $('#sidebar').css('visibility', 'visible');
    $('#toggle-sidebar')
        .attr('title', chrome.i18n.getMessage('closeSidebarButton'));
};

WindowController.prototype.toggleSidebar_ = function() {
  // FIXME: Move this to css where possible (toggle code)
  if (this.settings_.get('sidebaropen')) {
    this.settings_.set('sidebaropen', false);
    $('#sidebar').css('width', '0');
    $('#sidebar').css('border-right-width', '0');
    $('#toggle-sidebar')
        .attr('title', chrome.i18n.getMessage('openSidebarButton'));
  } else {
    this.openSidebar();
  }
};

WindowController.prototype.onLoadingFile = function(e) {
  $('#title-filename').text(chrome.i18n.getMessage('loadingTitle'));
};

WindowController.prototype.onFileSystemError = function(e) {
  $('#title-filename').text(chrome.i18n.getMessage('errorTitle'));
};

WindowController.prototype.onChangeTab_ = function(e, tab) {
  if (!tab) {
    $('#title-filename').text('');
    return;
  }
  $('#title-filename').text(tab.getName());
  this.onTabChange_();
};

WindowController.prototype.onTabPathChange = function(e, tab) {
  if (!tab) return;
  $('#title-filename').attr('title', tab.getPath());
};

WindowController.prototype.onTabChange_ = function(e, tab) {
  const currentTab = this.tabs_.getCurrentTab();
  if (!currentTab) {
    $('#title-filename').text('');
    $('#title-filename').removeClass('unsaved');
    return;
  }
  if (currentTab.isSaved()) {
    $('#title-filename').removeClass('unsaved');
  } else {
    $('#title-filename').addClass('unsaved');
  }
};

WindowController.prototype.resizeStart_ = function(e) {
  this.resizeMouseStartX_ = e.clientX;
  this.resizeStartWidth_ = Number.parseInt($('#sidebar').css('width'), 10);
  $(document).on('mousemove.sidebar', this.resizeOnMouseMove_.bind(this));
  $(document).on('mouseup.sidebar', this.resizeFinish_.bind(this));
  $(document).css('cursor', 'e-resize !important');
  $('#sidebar').css('-webkit-transition', 'none');
};

WindowController.prototype.resizeOnMouseMove_ = function(e) {
  let change = e.clientX - this.resizeMouseStartX_;
  let sidebarWidth = this.resizeStartWidth_ + change;
  if (sidebarWidth < 20) sidebarWidth = 20;
  $('#sidebar').css('width', sidebarWidth + 'px');
  return sidebarWidth;
};

WindowController.prototype.resizeFinish_ = function(e) {
  let sidebarWidth = this.resizeOnMouseMove_(e);
  this.settings_.set('sidebarwidth', sidebarWidth);
  $(document).off('mousemove.sidebar');
  $(document).off('mouseup.sidebar');
  $(document).css('cursor', 'default');
  $('#sidebar').css('-webkit-transition', 'width 0.2s ease-in-out');
};

WindowController.prototype.updateSidebarVisibility_ = function() {
  const sidebar = $('#sidebar');
  if (sidebar.width() === 0) {
    sidebar.css('visibility', 'hidden');
  } else {
    sidebar.css('visibility', 'visible');
  }
};

WindowController.prototype.onError_ = function(event) {
  const message = event.originalEvent.message;
  const errorStack = event.originalEvent.error.stack;
};
