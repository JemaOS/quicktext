/* Copyright (c) 2025 Jema Technology.
   Distributed under the license specified in the root directory of this project. */

// PWA File System Compatibility Layer
// Provides Chrome App fileSystem API compatibility for PWAs using File System Access API

const PWACompat = (function() {
  // Store for retained file entries
  let retainedEntries = [];
  
  return {
    /**
     * Check if running as PWA (File System Access API available)
     */
    isPWA: function() {
      return 'showOpenFilePicker' in window;
    },
    
    /**
     * Open file picker and get file entry
     */
    chooseEntry: function(params, callback) {
      if (this.isPWA()) {
        if (params.type === 'saveFile') {
          // Save file dialog
          this.showSaveFilePicker(params, callback);
        } else {
          // Open file dialog
          this.showOpenFilePicker(params, callback);
        }
      } else {
        // Fallback to Chrome API
        chrome.fileSystem.chooseEntry(params, callback);
      }
    },
    
    /**
     * Show open file picker (PWA)
     */
    showOpenFilePicker: async function(params, callback) {
      try {
        const fileHandle = await window.showOpenFilePicker({
          multiple: params.acceptsMultiple || false,
          types: [{
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt', '.text', '.log', '.md', '.json', '.js', '.html', '.css', '.xml', '.yaml', '.yml']
            }
          }]
        });
        
        if (params.acceptsMultiple) {
          callback(fileHandle);
        } else {
          callback(fileHandle[0]);
        }
      } catch (err) {
        console.log('File open cancelled or error:', err);
        callback(null);
      }
    },
    
    /**
     * Show save file picker (PWA)
     */
    showSaveFilePicker: async function(params, callback) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: params.suggestedName || 'sans_titre.txt',
          types: [{
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt', '.text', '.log', '.md']
            }
          }]
        });
        callback(fileHandle);
      } catch (err) {
        console.log('File save cancelled or error:', err);
        callback(null);
      }
    },
    
    /**
     * Get display path from file entry (PWA simulation)
     */
    getDisplayPath: function(entry, callback) {
      if (this.isPWA() && entry.name) {
        callback(entry.name);
      } else {
        chrome.fileSystem.getDisplayPath(entry, callback);
      }
    },
    
    /**
     * Retain entry for session persistence.
     * FileSystemHandle objects cannot be JSON-serialized (localStorage):
     * delegate to the IndexedDB-backed shim and use the file name as id.
     */
    retainEntry: function(entry, callback) {
      if (this.isPWA() && entry.handle) {
        const handle = entry.handle;
        if (chrome.fileSystem && chrome.fileSystem.retainPWAEntry) {
          chrome.fileSystem.retainPWAEntry(handle);
          callback('retained_' + (handle.name || Date.now()));
        } else {
          callback(null);
        }
      } else {
        callback(chrome.fileSystem.retainEntry(entry));
      }
    },
    
    /**
     * Restore retained entry
     */
    restoreEntry: function(entryId, callback) {
      if (this.isPWA()) {
        try {
          const stored = JSON.parse(localStorage.getItem('quicktext_retained') || '[]');
          const entry = stored.find(e => e.id === entryId);
          if (entry) {
            callback(entry.handle);
          } else {
            callback(null);
          }
        } catch (err) {
          console.error('Error restoring entry:', err);
          callback(null);
        }
      } else {
        chrome.fileSystem.restoreEntry(entryId, callback);
      }
    },
    
    /**
     * Get writable entry (PWA)
     */
    getWritableEntry: function(entry, callback) {
      if (this.isPWA()) {
        // In PWA, files are inherently writable via the handle
        callback(entry);
      } else {
        chrome.fileSystem.getWritableEntry(entry, callback);
      }
    },
    
    /**
     * Read file content (PWA)
     */
    readFile: function(fileHandle, callback) {
      if (this.isPWA()) {
        fileHandle.getFile().then(file => {
          file.text().then(content => {
            callback(content);
          });
        }).catch(err => {
          console.error('Read error:', err);
          callback(null);
        });
      } else {
        fileHandle.file(callback);
      }
    },
    
    /**
     * Write file content (PWA). The callback only fires once the writable
     * stream is closed (the write is durably complete).
     */
    writeFile: function(fileHandle, content, callback, errorCallback) {
      if (this.isPWA()) {
        fileHandle.createWritable().then(writable => {
          return writable.write(content).then(() => writable.close());
        }).then(() => {
          if (callback) callback();
        }).catch(err => {
          console.error('Write error:', err);
          if (errorCallback) errorCallback(err);
        });
      } else {
        // Chrome App file writing
        fileHandle.createWriter(function(writer) {
          writer.onwrite = callback;
          writer.onerror = errorCallback;
          const blob = new Blob([content], {type: 'text/plain'});
          writer.write(blob);
        });
      }
    },
    
    /**
     * Handle files passed via launchParams (PWA file handling).
     * NOTE: this is the ONLY launchQueue consumer of the app (the
     * chrome.app.runtime.onLaunched shim in chrome-shim.js must not register
     * one: a second setConsumer() call would replace this one and its
     * sessionStorage-based flow is broken because FileSystemHandle objects
     * are not JSON-serializable).
     */
    handleLaunchFiles: async function() {
      if ('launchQueue' in window && 'LaunchParams' in window) {
        window.launchQueue.setConsumer(async (launchParams) => {
          if (launchParams.files && launchParams.files.length > 0) {
            const files = [];
            for (const handle of launchParams.files) {
              const file = await handle.getFile();
              files.push({
                name: file.name,
                content: await file.text(),
                handle: handle
              });
            }

            // Trigger custom event with files
            const event = new CustomEvent('pwa-launch-files', { detail: files });
            document.dispatchEvent(event);
          }
          // A plain launch (no files) is NOT a new-file request: the app
          // already restores previous tabs or opens an empty one by itself.
        });
      }
    }
  };
})();

// Initialize PWA launch file handling when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  PWACompat.handleLaunchFiles();
});
