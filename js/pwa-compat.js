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
     * Retain entry for session persistence
     */
    retainEntry: function(entry, callback) {
      if (this.isPWA() && entry.handle) {
        const id = 'file_' + Date.now();
        // Store handle in localStorage for persistence
        try {
          const stored = JSON.parse(localStorage.getItem('quicktext_retained') || '[]');
          stored.push({ id: id, handle: entry.handle });
          localStorage.setItem('quicktext_retained', JSON.stringify(stored));
          callback(id);
        } catch (err) {
          console.error('Error retaining entry:', err);
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
        });
      } else {
        entry.file(callback);
      }
    },
    
    /**
     * Write file content (PWA)
     */
    writeFile: function(fileHandle, content, callback, errorCallback) {
      if (this.isPWA()) {
        fileHandle.createWritable().then(writable => {
          writable.write(content);
          writable.close();
          callback();
        }).catch(err => {
          console.error('Write error:', err);
          if (errorCallback) errorCallback(err);
        });
      } else {
        // Chrome App file writing
        entry.createWriter(function(writer) {
          writer.onwrite = callback;
          writer.onerror = errorCallback;
          var blob = new Blob([content], {type: 'text/plain'});
          writer.write(blob);
        });
      }
    },
    
    /**
     * Handle files passed via launchParams (PWA file handling)
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
        });
      }
    }
  };
})();

// Initialize PWA launch file handling when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  PWACompat.handleLaunchFiles();
});
