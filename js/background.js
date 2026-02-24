/* Copyright (c) 2025 Jema Technology.
     Distributed under the license specified in the root directory of this project. */
/**
 * @constructor
 */
function Background() {
  this.entriesToOpen_ = [];
  this.windows_ = [];
}

/**
 * @return {boolean}
 * True if the system window frame should be shown. It is on the systems where
 * borderless window can't be dragged or resized.
 */
Background.prototype.ifShowFrame_ = function() {
  const version = Number.parseInt(navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
  let os = 'other';
  if (navigator.appVersion.indexOf('Linux') != -1) {
    os = 'linux';
  } else if (navigator.appVersion.indexOf('CrOS') != -1) {
    os = 'cros';
  } else if (navigator.appVersion.indexOf('Mac OS X') != -1) {
    os = 'mac';
  }

  return os === 'linux' && version < 27 ||
         os === 'mac' && version < 25;
};

/**
 * Opens and focuses a new window (in addition to any already open windows).
 */
Background.prototype.newWindow = function() {
  this.focusWindow(this.windows_.length);
}

/**
 * @param {number} windowId
 * Move focus to the window associated with the passed windowId. If this window
 * doesn't exist it will be created.
 */
Background.prototype.focusWindow = function(windowId) {
  const id = `appWindow${windowId}`;
  const options = {
    id,
    frame: (this.ifShowFrame_() ? 'chrome' : 'none'),
    minWidth: 400,
    minHeight: 400,
    width: 700,
    height: 700
  };


  chrome.app.window.create('index.html', options, function(win) {
    console.log('Window opened:', win);
    win.onClosed.addListener(this.onWindowClosed.bind(this, win));
  }.bind(this));
};

/**
 * @param {Array} entries
 * Focus window and open entries after checking file existence.
 */
Background.prototype.focusWindowWithEntries_ = function(entries) {
  this.focusWindow(0);

  for (let i = 0; i < entries.length; i++) {
    chrome.fileSystem.getWritableEntry(
        entries[i],
        function(entry) {
          if (this.windows_.length > 0) {
            this.windows_[0].openTabs([entry]);
          } else if (!chrome.runtime.lastError) {
            this.entriesToOpen_.push(entry);
          }
        }.bind(this));
  }
};

/**
 * @param {Object.<string, Object>} launchData
 * Handle onLaunch event.
 */
Background.prototype.launch = function(launchData) {
  const entries = [];
  
  // Handle launchData entries (files opened from outside the app)
  if (launchData && launchData['items']) {
    for (let i = 0; i < launchData['items'].length; i++) {
      entries.push(launchData['items'][i]['entry']);
    }
  }

  chrome.storage.local.get('retainedEntryIds', function(data) {
    const retainedEntryIds = data['retainedEntryIds'] || [];
    let processedCount = 0;
    const validRetainedEntries = [];
    
    // If no retained entries, just focus the window with launchData entries
    if (retainedEntryIds.length === 0) {
      this.focusWindowWithEntries_(entries);
      return;
    }
    
    // Check each retained entry to see if the file still exists
    for (let i = 0; i < retainedEntryIds.length; i++) {
      chrome.fileSystem.restoreEntry(retainedEntryIds[i], function(entry) {
        processedCount++;
        if (!chrome.runtime.lastError && entry) {
          // Verify the file still exists by trying to read its metadata
          entry.getMetadata(function(metadata) {
            // File exists, add it to valid entries
            validRetainedEntries.push(entry);
            
            // After all entries are processed, focus the window
            if (processedCount === retainedEntryIds.length) {
              this.onRetainedEntriesChecked_(entries, validRetainedEntries, retainedEntryIds);
            }
          }.bind(this), function(error) {
            // File doesn't exist or can't be accessed - don't restore it
            console.log('File no longer exists, not restoring');
            
            // After all entries are processed, focus the window
            if (processedCount === retainedEntryIds.length) {
              this.onRetainedEntriesChecked_(entries, validRetainedEntries, retainedEntryIds);
            }
          }.bind(this));
        } else {
          // Entry couldn't be restored - don't add it
          // After all entries are processed, focus the window
          if (processedCount === retainedEntryIds.length) {
            this.onRetainedEntriesChecked_(entries, validRetainedEntries, retainedEntryIds);
          }
        }
      }.bind(this));
    }
  }.bind(this));
};

/**
 * @param {Array} launchDataEntries
 * @param {Array} validRetainedEntries
 * @param {Array} retainedEntryIds
 * Called after checking all retained entries.
 */
Background.prototype.onRetainedEntriesChecked_ = function(launchDataEntries, validRetainedEntries, retainedEntryIds) {
  // If some files no longer exist, update the retainedEntryIds in storage
  if (validRetainedEntries.length !== retainedEntryIds.length) {
    const validEntryIds = [];
    for (let i = 0; i < validRetainedEntries.length; i++) {
      validEntryIds.push(chrome.fileSystem.retainEntry(validRetainedEntries[i]));
    }
    chrome.storage.local.set({'retainedEntryIds': validEntryIds});
    console.log('Updated retainedEntryIds: removed', retainedEntryIds.length - validRetainedEntries.length, 'non-existent files');
  }
  
  // Combine launchData entries and valid retained entries
  const allEntries = launchDataEntries.concat(validRetainedEntries);
  this.focusWindowWithEntries_(allEntries);
};

/**
 * @param {Window} win
 * Handle onClosed.
 */
Background.prototype.onWindowClosed = function(win) {
  console.log('Window closed:', win);
  if (!win.contentWindow || !win.contentWindow.textApp) {
    console.warn('No TextApp object in the window being closed:',
                 win.contentWindow, win.contentWindow.textApp);
    return;
  }
  const textApp = win.contentWindow.textApp;
  for (let i = 0; i < this.windows_.length; i++) {
    if (textApp === this.windows_[i]) {
      this.windows_.splice(i, 1);
    }
  }

  const toRetain = textApp.getFilesToRetain();
  this.retainFiles_(toRetain);
};

/**
 * @param {Array.<FileEntry>} toRetain
 */
Background.prototype.retainFiles_ = function(toRetain) {
  console.log('Got ' + toRetain.length + ' files to retain:', toRetain);
  const toRetainEntryIds = [];
  for (let i = 0; i < toRetain.length; i++) {
    const entryId = chrome.fileSystem.retainEntry(toRetain[i]);
    toRetainEntryIds.push(entryId);
  }
  chrome.storage.local.set({'retainedEntryIds': toRetainEntryIds});
};

/**
 * @param {TextApp} textApp
 * Called by the TextApp object in the window when the window is ready.
 */
Background.prototype.onWindowReady = function(textApp) {
  this.windows_.push(textApp);
  textApp.setHasChromeFrame(this.ifShowFrame_());
  
  // Before opening tabs, verify that each entry still exists
  const validEntries = [];
  let processedCount = 0;
  const entriesToCheck = this.entriesToOpen_;
  
  if (entriesToCheck.length === 0) {
    textApp.openTabs(this.entriesToOpen_);
    this.entriesToOpen_ = [];
    return;
  }
  
  // Check each entry to see if the file still exists
  for (let i = 0; i < entriesToCheck.length; i++) {
    entriesToCheck[i].getMetadata(function(metadata) {
      // File exists
      validEntries.push(entriesToCheck[processedCount]);
      processedCount++;
      
      if (processedCount === entriesToCheck.length) {
        textApp.openTabs(validEntries);
        this.entriesToOpen_ = [];
      }
    }.bind(this), function(error) {
      // File doesn't exist - don't add it
      processedCount++;
      
      if (processedCount === entriesToCheck.length) {
        textApp.openTabs(validEntries);
        this.entriesToOpen_ = [];
      }
    }.bind(this, i));
  }
};

/**
 * @param {FileEntry} entry
 * @param {function(FileEntry)} callback
 * Make a copy of a file entry.
 */
Background.prototype.copyFileEntry = function(entry, callback) {
  chrome.fileSystem.getWritableEntry(entry, callback);
};

/**
 * @param {FileEntry} entry
 * Remove a file entry from the list of entries to open.
 */
Background.prototype.removeEntry = function(entry) {
  const index = this.entriesToOpen_.indexOf(entry);
  if (index > -1) {
    this.entriesToOpen_.splice(index, 1);
  }
};

const background = new Background();
chrome.app.runtime.onLaunched.addListener(background.launch.bind(background));


/* Exports */
window['background'] = background;
Background.prototype['copyFileEntry'] = Background.prototype.copyFileEntry;
Background.prototype['onWindowReady'] = Background.prototype.onWindowReady;
Background.prototype['newWindow'] = Background.prototype.newWindow;
Background.prototype['removeEntry'] = Background.prototype.removeEntry;
