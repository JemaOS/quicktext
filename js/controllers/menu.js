/* Copyright (c) 2025 Jema Technology.
     Distributed under the license specified in the root directory of this project. */
/**
 * @constructor
 */
function MenuController(tabs) {
  this.tabs_ = tabs;
  this.dragItem_ = null;
  $('#file-menu-new').click(this.newTab_.bind(this));
  $('#file-menu-open').click(this.open_.bind(this));
  $('#file-menu-save').click(this.save_.bind(this));
  $('#file-menu-saveas').click(this.saveas_.bind(this));
  $('#open-shortcuts').click(this.openShortcuts_.bind(this));
  $(document).bind('newtab', this.addNewTab_.bind(this));
  $(document).bind('switchtab', this.onSwitchTab.bind(this));
  $(document).bind('tabchange', this.onTabChange.bind(this));
  $(document).bind('tabclosed', this.onTabClosed.bind(this));
  $(document).bind('tabpathchange', this.onTabPathChange.bind(this));
  $(document).bind('tabrenamed', this.onTabRenamed.bind(this));
  $(document).bind('tabsave', this.onTabSave.bind(this));
}

/**
 * Adds a new draggable file tab to the UI.
 * @param {!Event} e The newtab event (unused).
 * @param {!Tab} tab The new tab to be added.
 * @private
 */
MenuController.prototype.addNewTab_ = function(e, tab) {
  const id = tab.getId();
  const tabElement = document.createElement('li');
  tabElement.setAttribute('draggable', 'true');
  const filenameElement = document.createElement('button');
  filenameElement.id = 'tab' + id;
  filenameElement.textContent = tab.getName();
  filenameElement.className = 'filename sidebar-button';
  tabElement.appendChild(filenameElement);
  const closeElement = document.createElement('button');
  closeElement.textContent = 'close';
  closeElement.setAttribute('title', chrome.i18n.getMessage('closeFileButton'))
  closeElement.classList.add('close', 'mdc-icon-button', 'material-icons');
  mdc.ripple.MDCRipple.attachTo(closeElement).unbounded = true;
  tabElement.appendChild(closeElement);
  document.getElementById('tabs-list').appendChild(tabElement);

  tabElement.addEventListener(
      'dragstart', () => { this.onDragStart_($(tabElement)); });
  tabElement.addEventListener(
      'dragover', (event) => { this.onDragOver_($(tabElement), event); });
  tabElement.addEventListener(
      'dragend', (event) => { this.onDragEnd_($(tabElement), event)});
  tabElement.addEventListener(
      'drop', (event) => { this.onDrop_(event); });
  filenameElement.addEventListener(
      'click', () => { 
        this.tabButtonClicked_(id); 
        // On mobile, close sidebar after selecting a tab
        if (window.innerWidth <= 480) {
          // Use jQuery to toggle sidebar since windowController might not be accessible this way
          if (this.tabs_.settings_.get('sidebaropen')) {
            this.tabs_.settings_.set('sidebaropen', false);
            $('#sidebar').css('width', '0');
            $('#sidebar').css('border-right-width', '0');
            $('#toggle-sidebar').attr('title', chrome.i18n.getMessage('openSidebarButton'));
            
            // Update visibility
            const sidebar = $('#sidebar');
            if (sidebar.width() === 0) {
              sidebar.css('visibility', 'hidden');
            }
          }
        }
      });
  
  // Handle double click for desktop and long press for mobile
  let touchTimer;
  filenameElement.addEventListener('touchstart', (e) => {
    if (filenameElement.contentEditable === 'true') {
      e.stopPropagation();
      return;
    }
    touchTimer = setTimeout(() => {
      e.preventDefault(); // Prevent default context menu
      const tab = this.tabs_.getTabById(id);
      if (tab && tab.getEntry()) {
        this.tabs_.saveAs();
      } else {
        this.renameTab_(id, filenameElement);
      }
    }, 500); // 500ms long press
  });
  
  filenameElement.addEventListener('touchend', () => {
    clearTimeout(touchTimer);
  });
  
  filenameElement.addEventListener('touchmove', () => {
    clearTimeout(touchTimer);
  });

  filenameElement.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const tab = this.tabs_.getTabById(id);
    if (tab && tab.getEntry()) {
      // If it's a saved file, trigger Save As
      this.tabs_.saveAs();
    } else {
      this.renameTab_(id, filenameElement);
    }
  });
  
  // Prevent drag start when editing
  filenameElement.addEventListener('mousedown', (e) => {
    if (filenameElement.contentEditable === 'true') {
      e.stopPropagation();
    }
  });
  closeElement.addEventListener(
      'click', (event) => { this.closeTab_(event, id); });
};

MenuController.prototype.onDragStart_ = function(listItem) {
  this.dragItem_ = listItem;
};

MenuController.prototype.onDragEnd_ = function(listItem, e) {
  this.dragItem_ = null;
  e.preventDefault();
  e.stopPropagation();
};

MenuController.prototype.onDrop_ = function(e) {
  e.stopPropagation();
};

MenuController.prototype.onDragOver_ = function(overItem, e) {
  e.preventDefault();
  if (!this.dragItem_ || overItem.find('.filename').attr('id')
      === this.dragItem_.find('.filename').attr('id')) {
    return;
  }

  if (this.dragItem_.index() < overItem.index()) {
    overItem.after(this.dragItem_);
  } else {
    overItem.before(this.dragItem_);
  }
  this.tabs_.reorder(this.dragItem_.index(), overItem.index());
};

MenuController.prototype.onTabRenamed = function(e, tab) {
  $('#tab' + tab.getId() + '.filename').text(tab.getName());
  this.tabs_.modeAutoSet(tab);
};

MenuController.prototype.onTabPathChange = function(e, tab) {
  $('#tab' + tab.getId() + '.filename').attr('title', tab.getPath());
};

MenuController.prototype.onTabChange = function(e, tab) {
  $('#tab' + tab.getId()).addClass('unsaved');
};

MenuController.prototype.onTabClosed = function(e, tab) {
  $('#tab' + tab.getId()).parent().remove();
};

MenuController.prototype.onTabSave = function(e, tab) {
  $('#tab' + tab.getId()).removeClass('unsaved');
};

MenuController.prototype.onSwitchTab = function(e, tab) {
  // Add the .active class to the <li> wrapping the tab button so the <li> gets
  // the active background-color style.
  $('#tabs-list .active').removeClass('active');
  $('#tab' + tab.getId()).parent().addClass('active');
};

MenuController.prototype.newTab_ = function() {
  this.tabs_.newTab();
  return false;
};

MenuController.prototype.open_ = function() {
  this.tabs_.openFiles();
  return false;
};

MenuController.prototype.save_ = function() {
  this.tabs_.save();
  return false;
};

MenuController.prototype.saveas_ = function() {
  this.tabs_.saveAs();
  return false;
};

MenuController.prototype.openShortcuts_ = function() {
  this.tabs_.dialogController_.setText(
    "Raccourcis clavier :",
    "Ctrl+N : Nouveau fichier",
    "Ctrl+O : Ouvrir un fichier",
    "Ctrl+S : Enregistrer",
    "Ctrl+Maj+S : Enregistrer sous",
    "Ctrl+F : Rechercher",
    "Ctrl+H : Remplacer",
    "Ctrl+W : Fermer l'onglet"
  );
  this.tabs_.dialogController_.resetButtons();
  this.tabs_.dialogController_.addButton('ok', chrome.i18n.getMessage('okDialogButton'));
  this.tabs_.dialogController_.show();
  return false;
};

MenuController.prototype.tabButtonClicked_ = function(id) {
  this.tabs_.showTab(id);
  return false;
};

/**
 * Closes a file tab, removing it from the UI.
 * @param {!Event} The triggering click event.
 * @param {number} The id of the tab to close.
 */
MenuController.prototype.closeTab_ = function(e, id) {
  this.tabs_.close(id);
  e.stopPropagation();
};

MenuController.prototype.renameTab_ = function(id, filenameElement) {
  const tab = this.tabs_.getTabById(id);
  if (!tab) return;

  // Prevent multiple bindings
  if (filenameElement.dataset.editing === 'true') return;
  filenameElement.dataset.editing = 'true';

  filenameElement.contentEditable = true;
  filenameElement.textContent = tab.getName();
  filenameElement.focus();
  
  // Select all text
  const range = document.createRange();
  range.selectNodeContents(filenameElement);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const save = () => {
    if (filenameElement.dataset.editing !== 'true') return;
    filenameElement.dataset.editing = 'false';
    
    const newName = filenameElement.textContent.trim();
    filenameElement.contentEditable = false;
    
    // Remove event listeners
    filenameElement.removeEventListener('blur', save);
    filenameElement.removeEventListener('keydown', keydownHandler);
    
    if (newName && newName !== tab.getName()) {
      tab.setCustomName(newName);
      $(document).trigger('tabrenamed', tab);
    } else {
      filenameElement.textContent = tab.getName();
    }
  };

  const keydownHandler = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      filenameElement.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      filenameElement.textContent = tab.getName();
      filenameElement.blur();
    }
  };

  filenameElement.addEventListener('blur', save);
  filenameElement.addEventListener('keydown', keydownHandler);
};
