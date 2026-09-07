/* Copyright (c) 2025 Jema Technology.
   Distributed under the license specified in the root directory of this project. */

// Chrome API Shim for PWAs
// Provides Chrome App API compatibility for PWAs using File System Access API

(function() {
  // ============================================================
  // chrome.i18n shim (always installed, even over a native
  // chrome.i18n in Chrome App mode, so the language toggle works
  // everywhere - the codebase only ever calls chrome.i18n.getMessage).
  // ============================================================
  window.chrome = window.chrome || {};

  // All user-visible strings, keyed by language. Seeded from
  // _locales/en/messages.json and _locales/fr/messages.json (used by the
  // Chrome extension build), plus keys that only existed in this shim and
  // keys for strings that used to be hardcoded in the UI.
  const I18N_MESSAGES = {
    en: {
      "appDesc": "A text editor for Chrome OS and Chrome.",
      "fileMenuNew": "New",
      "fileMenuInstall": "Install App",
      "fileMenuOpen": "Open",
      "fileMenuSave": "Save",
      "fileMenuSaveas": "Save as",
      "menuSettings": "Settings",
      "menuShortcuts": "Keyboard shortcuts",
      "fontsizeSetting": "Font size",
      "fontsizeTooltip": "Set with Ctrl- and Ctrl+",
      "spacestabSetting": "Tabs to spaces",
      "tabsizeSetting": "Tab size",
      "wraplinesSetting": "Wrap lines",
      "linenumbersSetting": "Show line numbers",
      "smartindentSetting": "Smart indent",
      "themeSetting": "Themes",
      "alwaysOnTopSetting": "Always on top",
      "deviceThemeOption": "Use device theme",
      "lightThemeOption": "Light",
      "darkThemeOption": "Dark",
      "helpSection": "Help",
      "closeSettings": "Back",
      "openSidebarButton": "Open sidebar",
      "closeSidebarButton": "Close sidebar",
      "searchPlaceholder": "Find...",
      "searchCounting": "$1 of $2",
      "searchNextButton": "Next",
      "searchPreviousButton": "Previous",
      "errorTitle": "Error",
      "loadingTitle": "Loading...",
      "minimizeButton": "Minimize",
      "maximizeButton": "Maximize",
      "restoreButton": "Restore",
      "closeButton": "Quit",
      "yesDialogButton": "Yes",
      "noDialogButton": "No",
      "cancelDialogButton": "Cancel",
      "saveFilePromptLine1": "$1 has been modified.",
      "saveFilePromptLine2": "Do you want to save it before closing?",
      "okDialogButton": "OK",
      "closeFileButton": "Close file",
      "untitledFile": "Untitled $1",
      "languageSetting": "Language",
      "englishLanguageOption": "English",
      "frenchLanguageOption": "Français",
      "untitledFileName": "Untitled",
      "cutButtonTooltip": "Cut (Ctrl+X)",
      "copyButtonTooltip": "Copy (Ctrl+C)",
      "pasteButtonTooltip": "Paste (Ctrl+V)",
      "headingStyleLabel": "Heading style",
      "headingBodyOption": "Body",
      "heading1Option": "Title (H1)",
      "heading2Option": "Subtitle (H2)",
      "heading3Option": "Heading (H3)",
      "heading4Option": "Subheading (H4)",
      "heading5Option": "Section (H5)",
      "heading6Option": "Subsection (H6)",
      "boldButtonTooltip": "Bold",
      "italicButtonTooltip": "Italic",
      "alignLeftButtonTooltip": "Align left",
      "alignCenterButtonTooltip": "Center",
      "alignRightButtonTooltip": "Align right",
      "installAppTooltip": "Install app",
      "installInstructions": "To install QuickText as an app:\n\n• On Chrome: Menu ⋮ > Install QuickText\n• On Chromium OS: Menu ⋮ > Install QuickText\n• On mobile: Add to home screen",
      "editorAriaLabel": "Main text area",
      "developedBy": "Developed by",
      "footerSuffix": "© 2026 • Open Source & Free",
      "statusZeroChars": "0 characters",
      "statusCharSingular": "1 character",
      "statusCharsPlural": "$1 characters",
      "statusSelectionSingular": "1 selected",
      "statusSelectionPlural": "$1 selected",
      "shortcutsTitle": "Keyboard shortcuts:",
      "shortcutNew": "Ctrl+N : New file",
      "shortcutOpen": "Ctrl+O : Open a file",
      "shortcutSave": "Ctrl+S : Save",
      "shortcutSaveAs": "Ctrl+Shift+S : Save as",
      "shortcutSearch": "Ctrl+F : Search",
      "shortcutNextTab": "Ctrl+Tab : Next tab",
      "shortcutPrevTab": "Ctrl+Shift+Tab : Previous tab",
      "shortcutSidebar": "Ctrl+E : Sidebar",
      "shortcutCloseTab": "Ctrl+W : Close tab"
    },
    fr: {
      "appDesc": "Éditeur de texte pour Chrome OS et Chrome.",
      "fileMenuNew": "Nouveau",
      "fileMenuInstall": "Installer l'application",
      "fileMenuOpen": "Ouvrir",
      "fileMenuSave": "Enregistrer",
      "fileMenuSaveas": "Enregistrer sous",
      "menuSettings": "Paramètres",
      "menuShortcuts": "Raccourcis clavier",
      "fontsizeSetting": "Taille de police",
      "fontsizeTooltip": "Définir avec Ctrl- et Ctrl+",
      "spacestabSetting": "Convertir les tabulations en espaces",
      "tabsizeSetting": "Taille des tabulations",
      "wraplinesSetting": "Encapsuler les lignes",
      "linenumbersSetting": "Afficher les numéros de lignes",
      "smartindentSetting": "Retrait intelligent",
      "themeSetting": "Thèmes",
      "alwaysOnTopSetting": "Toujours au premier plan",
      "deviceThemeOption": "Utiliser le thème de l'appareil",
      "lightThemeOption": "Clair",
      "darkThemeOption": "Foncé",
      "helpSection": "Aide",
      "closeSettings": "Retour",
      "openSidebarButton": "Ouvrir la barre latérale",
      "closeSidebarButton": "Fermer la barre latérale",
      "searchPlaceholder": "Rechercher…",
      "searchCounting": "$1 sur $2",
      "searchNextButton": "Suivant",
      "searchPreviousButton": "Précédent",
      "errorTitle": "Erreur",
      "loadingTitle": "Chargement…",
      "minimizeButton": "Réduire",
      "maximizeButton": "Agrandir",
      "restoreButton": "Restaurer",
      "closeButton": "Quitter",
      "yesDialogButton": "Oui",
      "noDialogButton": "Non",
      "cancelDialogButton": "Annuler",
      "saveFilePromptLine1": "$1 a été modifié.",
      "saveFilePromptLine2": "Voulez-vous enregistrer le fichier avant de le fermer ?",
      "okDialogButton": "OK",
      "closeFileButton": "Fermer le fichier",
      "untitledFile": "Sans titre $1",
      "languageSetting": "Langue",
      "englishLanguageOption": "English",
      "frenchLanguageOption": "Français",
      "untitledFileName": "Sans titre",
      "cutButtonTooltip": "Couper (Ctrl+X)",
      "copyButtonTooltip": "Copier (Ctrl+C)",
      "pasteButtonTooltip": "Coller (Ctrl+V)",
      "headingStyleLabel": "Style de titre",
      "headingBodyOption": "Corps",
      "heading1Option": "Titre (H1)",
      "heading2Option": "Sous-titre (H2)",
      "heading3Option": "Rubrique (H3)",
      "heading4Option": "Sous-rubrique (H4)",
      "heading5Option": "Section (H5)",
      "heading6Option": "Sous-section (H6)",
      "boldButtonTooltip": "Gras",
      "italicButtonTooltip": "Italique",
      "alignLeftButtonTooltip": "Aligner à gauche",
      "alignCenterButtonTooltip": "Centrer",
      "alignRightButtonTooltip": "Aligner à droite",
      "installAppTooltip": "Installer l'application",
      "installInstructions": "Pour installer QuickText comme application:\n\n• Sur Chrome: Menu ⋮ > Installer QuickText\n• Sur Chromium OS: Menu ⋮ > Installer QuickText\n• Sur mobile: Ajouter à l'écran d'accueil",
      "editorAriaLabel": "Zone de texte principale",
      "developedBy": "Développé par",
      "footerSuffix": "© 2026 • Open Source & Libre",
      "statusZeroChars": "0 caractères",
      "statusCharSingular": "1 caractère",
      "statusCharsPlural": "$1 caractères",
      "statusSelectionSingular": "1 sélectionné",
      "statusSelectionPlural": "$1 sélectionnés",
      "shortcutsTitle": "Raccourcis clavier :",
      "shortcutNew": "Ctrl+N : Nouveau fichier",
      "shortcutOpen": "Ctrl+O : Ouvrir un fichier",
      "shortcutSave": "Ctrl+S : Enregistrer",
      "shortcutSaveAs": "Ctrl+Maj+S : Enregistrer sous",
      "shortcutSearch": "Ctrl+F : Rechercher",
      "shortcutNextTab": "Ctrl+Tab : Onglet suivant",
      "shortcutPrevTab": "Ctrl+Maj+Tab : Onglet précédent",
      "shortcutSidebar": "Ctrl+E : Barre latérale",
      "shortcutCloseTab": "Ctrl+W : Fermer l'onglet"
    }
  };

  /**
   * The current UI language. French by default for JemaOS PWAs
   * (never persisted): the settings toggle is a runtime override only
   * and every page load starts back in French.
   */
  let currentLanguage_ = 'fr';

  /**
   * Applies a new UI language: updates <html lang>, re-translates all
   * static i18n-content/i18n-values nodes, and lets controllers refresh
   * their imperatively-set texts.
   * @param {string} lang 'en' or 'fr'.
   */
  function applyLanguage(lang) {
    currentLanguage_ = lang;
    document.documentElement.lang = lang;
    if (typeof i18nTemplate !== 'undefined' && i18nTemplate.process) {
      i18nTemplate.process(document);
    }
    if (typeof $ !== 'undefined' && $.event && $.event.trigger) {
      $.event.trigger('uilanguagechange', [lang]);
    }
  }

  chrome.i18n = {
    getMessage: function(messageName, substitutions) {
      let text = I18N_MESSAGES[currentLanguage_] &&
          I18N_MESSAGES[currentLanguage_][messageName];
      if (text === undefined) {
        text = I18N_MESSAGES.en[messageName];
      }
      if (text === undefined) return messageName;
      if (substitutions) {
        if (!Array.isArray(substitutions)) substitutions = [substitutions];
        substitutions.forEach((sub, i) => {
          text = text.replace('$' + (i + 1), sub);
        });
      }
      return text;
    },

    /** @return {string} The current UI language ('en' or 'fr'). */
    getLanguage: function() {
      return currentLanguage_;
    },

    /**
     * Runtime language override used by the settings toggle. Not persisted:
     * every page load starts back in French.
     * @param {string} lang 'en' or 'fr'.
     */
    setLanguage: function(lang) {
      applyLanguage(lang === 'fr' ? 'fr' : 'en');
    }
  };

  document.documentElement.lang = currentLanguage_;

  // The remaining shims are only needed when running as a PWA.
  if (typeof chrome !== 'undefined' && chrome.fileSystem) {
    console.log('Running as Chrome App - using native APIs');
    return;
  }

  console.log('Running as PWA - using shim for Chrome APIs');

  // Shim for chrome.fileSystem
  chrome.fileSystem = {
    chooseEntry: function(params, callback) {
      if ('showOpenFilePicker' in window) {
        if (params.type === 'saveFile') {
          // Save file dialog
          window.showSaveFilePicker({
            suggestedName: params.suggestedName ||
                (chrome.i18n.getMessage('untitledFileName') + '.txt'),
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
