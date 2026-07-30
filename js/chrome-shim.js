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
      const request = indexedDB.open('QuickTextFiles', 1);
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'name' });
        }
      };
      request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        store.put({ name: handle.name, handle: handle, lastAccessed: Date.now() });
      };
    },

    // Get all retained file handles
    getRetainedEntries: function(callback) {
      const request = indexedDB.open('QuickTextFiles', 1);
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'name' });
        }
      };
      request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const getAll = store.getAll();
        getAll.onsuccess = function() {
          callback(getAll.result);
        };
      };
    },

    // Remove a retained file handle
    removeRetainedEntry: function(entry, callback) {
      if (!entry || !entry.name) {
        if (callback) callback();
        return;
      }
      
      const request = indexedDB.open('QuickTextFiles', 1);
      request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const deleteReq = store.delete(entry.name);
        deleteReq.onsuccess = function() {
          console.log('Removed entry from IndexedDB:', entry.name);
          if (callback) callback();
        };
        deleteReq.onerror = function() {
          console.error('Failed to remove entry from IndexedDB:', entry.name);
          if (callback) callback();
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
      if (!entryId || !entryId.startsWith('retained_')) {
        callback(null);
        return;
      }
      
      const name = entryId.replace('retained_', '');
      const request = indexedDB.open('QuickTextFiles', 1);
      
      request.onsuccess = async (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const get = store.get(name);
        
        get.onsuccess = async () => {
          if (!get.result || !get.result.handle) {
            callback(null);
            return;
          }
          // Verify the handle is still valid
          try {
            await get.result.handle.getFile();
            callback(get.result.handle);
          } catch (e) {
            callback(null);
          }
        };
      };
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

            // Launch files are delivered by PWACompat via the
            // 'pwa-launch-files' document event (see app.js).

            // Restore all tabs from localStorage (including unsaved ones)
            console.log('Attempting to restore all tabs...');
            let savedTabsStr = localStorage.getItem('quicktext_open_tabs');
            let savedTabs = null;
            try {
              savedTabs = savedTabsStr ? JSON.parse(savedTabsStr) : null;
            } catch(e) {
              console.error('Error parsing saved tabs:', e);
            }
            
            if (savedTabs && savedTabs.length > 0) {
              console.log('Restoring', savedTabs.length, 'saved tabs');
              // Skip app.openTabs([]) since we'll restore tabs manually -
              // calling openTabs([]) creates an initial blank tab that conflicts with restored IDs
              
              setTimeout(function() {
                let currentTabId = null;
                // Find which tab was current
                savedTabs.forEach(function(tabData) {
                  if (tabData.isCurrent) currentTabId = tabData.id;
                });
                
                // For tabs with file entries, try to restore from IndexedDB
                // For unsaved tabs, restore content directly
                chrome.fileSystem.getRetainedEntries(function(retainedEntries) {
                  // Build a map of retained entries by name
                  const retainedByName = {};
                  retainedEntries.forEach(function(e) {
                    if (e.handle && e.handle.name) {
                      retainedByName[e.handle.name] = e.handle;
                    }
                  });
                  
                  // Restore each tab
                  const tabsToRestore = savedTabs.slice(); // copy
                  const restoredCount = 0;
                  
                  // Close same-named duplicate tabs, keeping the first one
                  // (preferring tabs that still have a file entry).
                  function deduplicateRestoredTabs() {
                    if (!app.tabs_ || !app.tabs_.tabs_) return;
                    const byName = {};
                    app.tabs_.tabs_.slice().forEach(function(tab) {
                      const e = tab.getEntry();
                      const name = (e && e.name) || tab.getName();
                      if (!name) return;
                      const prev = byName[name];
                      if (!prev) {
                        byName[name] = tab;
                      } else {
                        // Keep the tab that has an entry; if both or neither
                        // have one, keep the first.
                        const keep = (!prev.getEntry() && tab.getEntry()) ? tab : prev;
                        const drop = (keep === prev) ? tab : prev;
                        byName[name] = keep;
                        // Never discard unsaved edits: only auto-close a
                        // duplicate that has no unsaved changes.
                        if (drop.isSaved()) {
                          console.log('Closing duplicate tab for', name);
                          app.tabs_.closeTab_(drop);
                        }
                      }
                    });
                  }

                  function restoreNextTab(index) {
                    if (index >= tabsToRestore.length) {
                      deduplicateRestoredTabs();
                      // All tabs restored - switch to the previously active tab
                      if (app.tabs_ && app.tabs_.tabs_.length > 0) {
                        // Remove the initial empty tab if it exists and we have restored tabs
                        const initialTab = app.tabs_.tabs_[0];
                        if (initialTab && !initialTab.getEntry() &&
                            initialTab.session_ && initialTab.session_.doc.toString() === '' &&
                            app.tabs_.tabs_.length > 1) {
                          app.tabs_.closeTab_(initialTab);
                        }
                      }
                      console.log('All tabs restored');
                      // Ensure editor is enabled after restoring tabs
                      if (app.tabs_ && app.tabs_.editor_) {
                        app.tabs_.editor_.enable();
                      }
                      return;
                    }
                    
                    const tabData = tabsToRestore[index];

                    // Dedup: a tab with the same name may already exist
                    // (opened via launch, or restored earlier from a state
                    // that already contained duplicates). Creating another
                    // one would re-persist duplicate tabs forever.
                    const restoreName = tabData.entryName || tabData.customName || tabData.name;
                    if (restoreName && app.tabs_.findOpenTabByName_) {
                      const dup = app.tabs_.findOpenTabByName_(restoreName);
                      if (dup) {
                        console.log('Restore dedup: tab already open for', restoreName);
                        if (tabData.hasEntry && tabData.entryName && retainedByName[tabData.entryName]) {
                          const h = retainedByName[tabData.entryName];
                          h.isPWAFile = true;
                          dup.setEntry(h);
                          if (app.tabs_.reloadTabContentFromEntry_) {
                            app.tabs_.reloadTabContentFromEntry_(dup);
                          }
                        }
                        restoreNextTab(index + 1);
                        return;
                      }
                    }

                    if (tabData.hasEntry && tabData.entryName && retainedByName[tabData.entryName]) {
                      // Restore tab with file entry
                      const handle = retainedByName[tabData.entryName];
                      handle.getFile().then(function(file) {
                        return file.text();
                      }).then(function(content) {
                        handle.isPWAFile = true;
                        app.tabs_.newTab(content, handle, tabData.id);
                        restoreNextTab(index + 1);
                      }).catch(function() {
                        // File no longer accessible, restore as unsaved with last content
                        // Use the entry name as custom name so duplicate detection can match it
                        app.tabs_.newTab(tabData.content || '', null, tabData.id);
                        var restoredTab = app.tabs_.tabs_[app.tabs_.tabs_.length - 1];
                        if (restoredTab) {
                          restoredTab.setName(tabData.customName || tabData.entryName || tabData.name);
                        }
                        restoreNextTab(index + 1);
                      });
                    } else if (tabData.hasEntry && tabData.entryName) {
                      // Tab had a file entry but handle is no longer in IndexedDB.
                      // Restore with the entry name as custom name so duplicate detection works.
                      app.tabs_.newTab(tabData.content || '', null, tabData.id);
                      var restoredTab = app.tabs_.tabs_[app.tabs_.tabs_.length - 1];
                      if (restoredTab) {
                        restoredTab.setName(tabData.entryName);
                      }
                      restoreNextTab(index + 1);
                    } else {
                      // Restore unsaved tab with its content, preserving the original ID
                      app.tabs_.newTab(tabData.content || '', null, tabData.id);
                      // Restore custom name if any
                      var restoredTab = app.tabs_.tabs_[app.tabs_.tabs_.length - 1];
                      if (restoredTab && tabData.customName) {
                        restoredTab.setName(tabData.customName);
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
                const restoredEntries = [];
                let pending = entries.length;
                
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
          },
          removeEntry: function(entry) {
            console.log('Mock background: removeEntry called', entry);
            // For PWA, remove from IndexedDB
            if (entry && entry.name) {
              chrome.fileSystem.removeRetainedEntry(entry, function() {
                console.log('Entry removed from IndexedDB');
              });
            }
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
          // Launch files are handled by PWACompat.handleLaunchFiles()
          // (pwa-compat.js), the app's single launchQueue consumer. Do NOT
          // register another consumer here: a second setConsumer() call
          // would replace it, and FileSystemHandle objects cannot survive a
          // sessionStorage round-trip (they are not JSON-serializable).
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
    const tabsObj = window.textApp.tabs_;
    if (typeof tabsObj.saveAllTabsToLocalStorage_ === 'function') {
      tabsObj.saveAllTabsToLocalStorage_();
    }
    // Also retain file entries in IndexedDB
    for (let i = 0; i < tabsObj.tabs_.length; i++) {
      const tab = tabsObj.tabs_[i];
      const entry = tab.getEntry();
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
    // Unwrap wrapper objects from IndexedDB
    if (!entry.getFile && entry.handle && entry.handle.getFile) {
      entry = entry.handle;
    }
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
    // Unwrap: if entry is a wrapper object (from IndexedDB) with a .handle property
    // that is the actual FileSystemFileHandle, use the handle instead
    var handle = entry;
    if (!entry.createWritable && entry.handle && entry.handle.createWritable) {
      console.log('[writeFileEntry] Unwrapping entry.handle (entry was a wrapper object)');
      handle = entry.handle;
    }
    
    console.log('[writeFileEntry] entry.name:', handle.name, 'createWritable:', !!handle.createWritable);
    
    if (handle.createWritable) {
      // Request write permission first (needed for handles from showOpenFilePicker)
      var permissionPromise;
      if (handle.requestPermission) {
        permissionPromise = handle.requestPermission({ mode: 'readwrite' });
      } else {
        permissionPromise = Promise.resolve('granted');
      }
      
      permissionPromise.then(function(permission) {
        if (permission !== 'granted') {
          throw new Error('Write permission denied, got: ' + permission);
        }
        return handle.createWritable();
      }).then(function(writable) {
        var blob = new Blob([content], { type: 'text/plain' });
        return writable.write(blob).then(function() {
          return writable.close();
        });
      }).then(function() {
        console.log('[writeFileEntry] File written successfully:', handle.name);
        if (callback) callback();
      }).catch(function(err) {
        console.error('[writeFileEntry] Write error:', err);
        if (errorCallback) errorCallback(err);
      });
    } else {
      // Fallback for Chrome App context
      entry.createWriter(function(writer) {
        writer.onwrite = callback;
        writer.onerror = errorCallback;
        var blob = new Blob([content], { type: 'text/plain' });
        writer.write(blob);
      });
    }
  };

  console.log('Chrome API shim initialized for PWA');
})();
