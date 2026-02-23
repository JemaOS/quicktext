/* Copyright (c) 2025 Jema Technology.
   Distributed under the license specified in the root directory of this project. */

// Chrome API Shim for PWAs
// Provides Chrome App API compatibility for PWAs using File System Access API

(function() {
  // Only add shim if running as PWA (no chrome API available)
  if (typeof chrome !== 'undefined' && chrome.fileSystem) {
    console.log('Running as Chrome App - using native APIs');
    return;
  }

  console.log('Running as PWA - using shim for Chrome APIs');

  // Create minimal chrome namespace
  window.chrome = window.chrome || {};

  // Shim for chrome.fileSystem
  chrome.fileSystem = {
    chooseEntry: function(params, callback) {
      if ('showOpenFilePicker' in window) {
        if (params.type === 'saveFile') {
          // Save file dialog
          window.showSaveFilePicker({
            suggestedName: params.suggestedName || 'sans_titre.txt',
            types: [{
              description: 'Text Files',
              accept: {
                'text/plain': ['.txt', '.text', '.log', '.md', '.json', '.js', '.html', '.css', '.xml', '.yaml', '.yml']
              }
            }]
          }).then(handle => {
            // Store handle in IndexedDB for persistence
            if (handle) {
              chrome.fileSystem.retainPWAEntry(handle);
            }
            callback(handle);
          }).catch(err => {
            console.log('File save cancelled:', err);
            callback(null);
          });
        } else {
          // Open file dialog
          window.showOpenFilePicker({
            multiple: params.acceptsMultiple || false,
            types: [{
              description: 'Text Files',
              accept: {
                'text/plain': ['.txt', '.text', '.log', '.md', '.json', '.js', '.html', '.css', '.xml', '.yaml', '.yml']
              }
            }]
          }).then(handles => {
            // Store handles in IndexedDB for persistence
            if (handles) {
              handles.forEach(handle => chrome.fileSystem.retainPWAEntry(handle));
            }
            if (params.acceptsMultiple) {
              callback(handles);
            } else {
              callback(handles[0]);
            }
          }).catch(err => {
            console.log('File open cancelled:', err);
            callback(null);
          });
        }
      } else {
        console.error('File System Access API not available');
        callback(null);
      }
    },

    getDisplayPath: function(entry, callback) {
      if (entry.name) {
        callback(entry.name);
      } else {
        callback('Unknown');
      }
    },

    // Store PWA file handles in IndexedDB for session persistence
    retainPWAEntry: function(handle) {
      if (!handle || !handle.name) return;
      
      // Open IndexedDB
      var request = indexedDB.open('QuickTextFiles', 1);
      request.onupgradeneeded = function(event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'name' });
        }
      };
      request.onsuccess = function(event) {
        var db = event.target.result;
        var transaction = db.transaction(['files'], 'readwrite');
        var store = transaction.objectStore('files');
        store.put({ name: handle.name, handle: handle, lastAccessed: Date.now() });
      };
    },

    // Get all retained file handles
    getRetainedEntries: function(callback) {
      var request = indexedDB.open('QuickTextFiles', 1);
      request.onupgradeneeded = function(event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'name' });
        }
      };
      request.onsuccess = function(event) {
        var db = event.target.result;
        var transaction = db.transaction(['files'], 'readonly');
        var store = transaction.objectStore('files');
        const getAll = store.getAll();
        getAll.onsuccess = function() {
          callback(getAll.result);
        };
      };
    },

    retainEntry: function(entry) {
      // For PWA entries, store in IndexedDB
      if (entry && entry.name) {
        chrome.fileSystem.retainPWAEntry(entry);
        return 'retained_' + entry.name;
      }
      // Return a simple ID for retention
      return 'retained_' + Date.now();
    },

    restoreEntry: function(entryId, callback) {
      // Try to restore from IndexedDB
      if (entryId && entryId.startsWith('retained_')) {
        const name = entryId.replace('retained_', '');
        var request = indexedDB.open('QuickTextFiles', 1);
        request.onsuccess = function(event) {
          var db = event.target.result;
          var transaction = db.transaction(['files'], 'readonly');
          var store = transaction.objectStore('files');
          const get = store.get(name);
          get.onsuccess = function() {
            if (get.result && get.result.handle) {
              // Verify the handle is still valid
              get.result.handle.getFile().then(function() {
                callback(get.result.handle);
              }).catch(function() {
                // Handle no longer valid
                callback(null);
              });
            } else {
              callback(null);
            }
          };
        };
      } else {
        callback(null);
      }
    },

    getWritableEntry: function(entry, callback) {
      // In PWA with File System Access API, handles are already writable
      callback(entry);
    }
  };

  // Shim for chrome.storage
  const storageListeners = [];
  
  chrome.storage = {
    local: {
      get: function(keys, callback) {
        const result = {};
        const stored = JSON.parse(localStorage.getItem('quicktext_storage') || '{}');
        if (typeof keys === 'string') {
          result[keys] = stored[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = stored[key];
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(key => {
            result[key] = stored[key] !== undefined ? stored[key] : keys[key];
          });
        }
        callback(result);
      },
      set: function(items, callback) {
        const stored = JSON.parse(localStorage.getItem('quicktext_storage') || '{}');
        const changes = {};
        for (const key in items) {
          changes[key] = {
            oldValue: stored[key],
            newValue: items[key]
          };
        }
        Object.assign(stored, items);
        localStorage.setItem('quicktext_storage', JSON.stringify(stored));
        
        // Trigger listeners
        storageListeners.forEach(listener => listener(changes, 'sync'));
        
        if (callback) callback();
      },
      remove: function(keys, callback) {
        const stored = JSON.parse(localStorage.getItem('quicktext_storage') || '{}');
        const changes = {};
        const keysArray = Array.isArray(keys) ? keys : [keys];
        
        keysArray.forEach(key => {
          changes[key] = {
            oldValue: stored[key],
            newValue: undefined
          };
          delete stored[key];
        });
        
        localStorage.setItem('quicktext_storage', JSON.stringify(stored));
        
        // Trigger listeners
        storageListeners.forEach(listener => listener(changes, 'sync'));
        
        if (callback) callback();
      }
    }
  };
  
  chrome.storage.sync = {
    get: chrome.storage.local.get,
    set: chrome.storage.local.set,
    remove: chrome.storage.local.remove
  };

  chrome.storage.onChanged = {
    addListener: function(callback) {
      storageListeners.push(callback);
    }
  };

  // Shim for chrome.i18n
  const messages = {
    "appDesc": { "message": "Éditeur de texte pour Chrome OS et Chrome." },
    "fileMenuNew": { "message": "Nouveau" },
    "fileMenuOpen": { "message": "Ouvrir" },
    "fileMenuSave": { "message": "Enregistrer" },
    "fileMenuSaveas": { "message": "Enregistrer sous" },
    "menuSettings": { "message": "Paramètres" },
    "menuShortcuts": { "message": "Raccourcis clavier" },
    "fontsizeSetting": { "message": "Taille de police" },
    "fontsizeTooltip": { "message": "Définir avec Ctrl- et Ctrl+" },
    "spacestabSetting": { "message": "Convertir les tabulations en espaces" },
    "tabsizeSetting": { "message": "Taille des tabulations" },
    "wraplinesSetting": { "message": "Encapsuler les lignes" },
    "linenumbersSetting": { "message": "Afficher les numéros de lignes" },
    "smartindentSetting": { "message": "Retrait intelligent" },
    "themeSetting": { "message": "Thèmes" },
    "alwaysOnTopSetting": { "message": "Toujours au premier plan" },
    "deviceThemeOption": { "message": "Utiliser le thème de l'appareil" },
    "lightThemeOption": { "message": "Clair" },
    "darkThemeOption": { "message": "Foncé" },
    "helpSection": { "message": "Aide" },
    "closeSettings": { "message": "Retour" },
    "openSidebarButton": { "message": "Ouvrir la barre latérale" },
    "closeSidebarButton": { "message": "Fermer la barre latérale" },
    "searchPlaceholder": { "message": "Rechercher…" },
    "searchCounting": { "message": "$1 sur $2" },
    "searchNextButton": { "message": "Suivant" },
    "searchPreviousButton": { "message": "Précédent" },
    "errorTitle": { "message": "Erreur" },
    "loadingTitle": { "message": "Chargement…" },
    "minimizeButton": { "message": "Réduire" },
    "maximizeButton": { "message": "Agrandir" },
    "restoreButton": { "message": "Restaurer" },
    "closeButton": { "message": "Quitter" },
    "yesDialogButton": { "message": "Oui" },
    "noDialogButton": { "message": "Non" },
    "cancelDialogButton": { "message": "Annuler" },
    "saveFilePromptLine1": { "message": "$1 a été modifié." },
    "saveFilePromptLine2": { "message": "Voulez-vous enregistrer le fichier avant de le fermer ?" },
    "okDialogButton": { "message": "OK" },
    "closeFileButton": { "message": "Fermer le fichier" },
    "untitledFile": { "message": "Sans titre $1" }
  };

  chrome.i18n = {
    getMessage: function(messageName, substitutions) {
      let msg = messages[messageName];
      if (!msg) return messageName;
      let text = msg.message;
      if (substitutions) {
        if (!Array.isArray(substitutions)) substitutions = [substitutions];
        substitutions.forEach((sub, i) => {
          text = text.replace('$' + (i + 1), sub);
        });
      }
      return text;
    }
  };

  // Shim for chrome.runtime
  chrome.runtime = {
    lastError: null,
    getBackgroundPage: function(callback) {
      // Return a mock background page for PWA
      callback({
        background: {
          onWindowReady: function(app) {
            console.log('Mock background: onWindowReady');
            // Hide custom window controls in PWA
            app.setHasChromeFrame(true);
            
            // Check if there are files to open from Launch Queue
            const launchFilesStr = sessionStorage.getItem('quicktext_launch_files');
            const newFileRequested = sessionStorage.getItem('quicktext_new_file');
            
            if (newFileRequested) {
              // User requested new file - clear saved tabs and create empty tab
              sessionStorage.removeItem('quicktext_new_file');
              app.openTabs([]);
              setTimeout(() => {
                if (app.tabs_ && app.tabs_.newTab) {
                  app.tabs_.newTab();
                }
              }, 100);
              return;
            }
            
            if (launchFilesStr) {
              try {
                const files = JSON.parse(launchFilesStr);
                sessionStorage.removeItem('quicktext_launch_files');
                app.openTabs([]);
                setTimeout(() => {
                  files.forEach(f => app.tabs_.openFileEntry(f.entry));
                }, 100);
              } catch (e) {
                app.openTabs([]);
              }
              return;
            }
            
            // Restore all tabs from localStorage (including unsaved ones)
            console.log('Attempting to restore all tabs...');
            var savedTabsStr = localStorage.getItem('quicktext_open_tabs');
            var savedTabs = null;
            try {
              savedTabs = savedTabsStr ? JSON.parse(savedTabsStr) : null;
            } catch(e) {
              console.error('Error parsing saved tabs:', e);
            }
            
            if (savedTabs && savedTabs.length > 0) {
              console.log('Restoring', savedTabs.length, 'saved tabs');
              // First open the app with no entries (we'll add tabs manually)
              app.openTabs([]);
              
              setTimeout(function() {
                var currentTabId = null;
                // Find which tab was current
                savedTabs.forEach(function(tabData) {
                  if (tabData.isCurrent) currentTabId = tabData.id;
                });
                
                // For tabs with file entries, try to restore from IndexedDB
                // For unsaved tabs, restore content directly
                chrome.fileSystem.getRetainedEntries(function(retainedEntries) {
                  // Build a map of retained entries by name
                  var retainedByName = {};
                  retainedEntries.forEach(function(e) {
                    if (e.handle && e.handle.name) {
                      retainedByName[e.handle.name] = e.handle;
                    }
                  });
                  
                  // Restore each tab
                  var tabsToRestore = savedTabs.slice(); // copy
                  var restoredCount = 0;
                  
                  function restoreNextTab(index) {
                    if (index >= tabsToRestore.length) {
                      // All tabs restored - switch to the previously active tab
                      if (app.tabs_ && app.tabs_.tabs_.length > 0) {
                        // Remove the initial empty tab if it exists and we have restored tabs
                        var initialTab = app.tabs_.tabs_[0];
                        if (initialTab && !initialTab.getEntry() &&
                            initialTab.session_ && initialTab.session_.doc.toString() === '' &&
                            app.tabs_.tabs_.length > 1) {
                          app.tabs_.closeTab_(initialTab);
                        }
                      }
                      console.log('All tabs restored');
                      return;
                    }
                    
                    var tabData = tabsToRestore[index];
                    
                    if (tabData.hasEntry && tabData.entryName && retainedByName[tabData.entryName]) {
                      // Restore tab with file entry
                      var handle = retainedByName[tabData.entryName];
                      handle.getFile().then(function(file) {
                        return file.text();
                      }).then(function(content) {
                        handle.isPWAFile = true;
                        app.tabs_.newTab(content, handle);
                        restoreNextTab(index + 1);
                      }).catch(function() {
                        // File no longer accessible, restore as unsaved with last content
                        app.tabs_.newTab(tabData.content || '');
                        if (tabData.customName) {
                          var newTab = app.tabs_.tabs_[app.tabs_.tabs_.length - 1];
                          if (newTab) newTab.setName(tabData.customName);
                        }
                        restoreNextTab(index + 1);
                      });
                    } else {
                      // Restore unsaved tab with its content
                      app.tabs_.newTab(tabData.content || '');
                      // Restore custom name if any
                      var newTab = app.tabs_.tabs_[app.tabs_.tabs_.length - 1];
                      if (newTab && tabData.customName) {
                        newTab.setName(tabData.customName);
                      }
                      restoreNextTab(index + 1);
                    }
                  }
                  
                  restoreNextTab(0);
                });
              }, 150);
            } else {
              // No saved tabs - restore retained file entries from IndexedDB
              console.log('No saved tabs found, restoring retained file entries...');
              chrome.fileSystem.getRetainedEntries(function(entries) {
                var restoredEntries = [];
                var pending = entries.length;
                
                if (pending === 0) {
                  app.openTabs([]);
                  return;
                }
                
                entries.forEach(function(entry) {
                  if (entry.handle && entry.handle.getFile) {
                    entry.handle.getFile().then(function() {
                      restoredEntries.push(entry.handle);
                      pending--;
                      if (pending === 0) app.openTabs(restoredEntries);
                    }).catch(function() {
                      pending--;
                      if (pending === 0) app.openTabs(restoredEntries);
                    });
                  } else {
                    pending--;
                    if (pending === 0) app.openTabs(restoredEntries);
                  }
                });
              });
            }
          },
          newWindow: function() {
            window.open(window.location.href, '_blank');
          },
          copyFileEntry: function(entry, cb) {
            // Just return the entry in PWA
            if (cb) cb(entry);
          }
        }
      });
    },
    onInstalled: {
      addListener: function(callback) {
        // Trigger on first load
        if (!localStorage.getItem('quicktext_installed')) {
          localStorage.setItem('quicktext_installed', 'true');
          callback({ reason: 'install' });
        }
      }
    }
  };

  // Shim for chrome.app (minimal)
  chrome.app = {
    runtime: {
      onLaunched: {
        addListener: function(callback) {
          // Handle launch files via Launch Queue API
          if ('launchQueue' in window && 'LaunchParams' in window) {
            window.launchQueue.setConsumer(launchParams => {
              console.log('Launch params received:', launchParams);
              
              if (launchParams.files && launchParams.files.length > 0) {
                // User opened existing files - store them for the app
                const files = [];
                Promise.all(launchParams.files.map(async (handle) => {
                  const file = await handle.getFile();
                  return {
                    name: file.name,
                    entry: handle
                  };
                })).then(files => {
                  sessionStorage.setItem('quicktext_launch_files', JSON.stringify(files));
                  console.log('Files to open:', files);
                });
              } else {
                // No files provided - this is a "New File" request!
                // Store this in sessionStorage to signal new file
                sessionStorage.setItem('quicktext_new_file', 'true');
                console.log('New file requested via context menu');
              }
            });
          }
        }
      }
    },
    window: {
      current: function() {
        return {
          focus: function() { window.focus(); },
          minimize: function() { /* PWA can't minimize */ },
          maximize: function() { /* PWA can't maximize */ },
          restore: function() { /* PWA can't restore */ },
          isMaximized: function() { return false; },
          setAlwaysOnTop: function(val) { /* PWA doesn't support always on top */ },
          create: function(url, options, callback) {
            // For PWA, we just open in same window
            if (callback) callback({ close: function() {} });
          }
        };
      }
    }
  };

  // Save all open tabs (including unsaved) to localStorage
  // Called on beforeunload and visibilitychange
  window.saveAllTabsToStorage = function saveAllTabsToStorage() {
    if (!window.textApp || !window.textApp.tabs_) return;
    var tabsObj = window.textApp.tabs_;
    if (typeof tabsObj.saveAllTabsToLocalStorage_ === 'function') {
      tabsObj.saveAllTabsToLocalStorage_();
    }
    // Also retain file entries in IndexedDB
    for (var i = 0; i < tabsObj.tabs_.length; i++) {
      var tab = tabsObj.tabs_[i];
      var entry = tab.getEntry();
      if (entry && entry.name) {
        chrome.fileSystem.retainPWAEntry(entry);
      }
    }
  }

  // Handle PWA window close - save all tabs
  window.addEventListener('beforeunload', function(e) {
    console.log('Window closing - saving all tabs');
    window.saveAllTabsToStorage();
  });

  // Also handle visibility change (when user switches away from the app)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      console.log('App going to background - saving all tabs');
      window.saveAllTabsToStorage();
    }
  });

  // Periodic auto-save every 30 seconds
  setInterval(function() {
    window.saveAllTabsToStorage();
  }, 30000);

  // Shim for FileError
  window.FileError = function(code) {
    this.code = code;
  };
  FileError.NOT_FOUND_ERR = 1;
  FileError.SECURITY_ERR = 2;
  FileError.ABORT_ERR = 3;
  FileError.NOT_READABLE_ERR = 4;
  FileError.ENCODING_ERR = 5;
  FileError.NO_MODIFICATION_ALLOWED_ERR = 6;
  FileError.INVALID_STATE_ERR = 7;
  FileError.INVALID_MODIFICATION_ERR = 9;
  FileError.QUOTA_EXCEEDED_ERR = 10;

  // Helper to read file (used by the app)
  window.readFileEntry = function(entry, callback) {
    if (entry.getFile) {
      entry.getFile().then(file => {
        file.text().then(content => callback(content));
      });
    } else if (entry.file) {
      entry.file(function(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          callback(e.target.result);
        };
        reader.readAsText(file);
      });
    }
  };

  // Helper to write file (used by the app)
  window.writeFileEntry = function(entry, content, callback, errorCallback) {
    console.log('writeFileEntry called, entry:', entry, 'has createWritable:', !!entry.createWritable);
    if (entry.createWritable) {
      entry.createWritable().then(writable => {
        console.log('Using File System Access API to write');
        // Convert string to Blob for proper writing
        const blob = new Blob([content], { type: 'text/plain' });
        writable.write(blob);
        writable.close().then(() => {
          console.log('File written successfully');
          if (callback) callback();
        });
      }).catch(err => {
        console.error('Write error:', err);
        if (errorCallback) errorCallback(err);
      });
    } else {
      // Fallback for Chrome App context
      entry.createWriter(function(writer) {
        writer.onwrite = callback;
        writer.onerror = errorCallback;
        const blob = new Blob([content], { type: 'text/plain' });
        writer.write(blob);
      });
    }
  };

  console.log('Chrome API shim initialized for PWA');
})();
