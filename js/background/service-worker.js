// CivicPlus Toolkit - Service Worker (MV3)
// Version 2.17.0

console.log('[CP Toolkit] Service worker initializing...');

// Import modules
importScripts('context-menus.js');
importScripts('first-run.js');

console.log('[CP Toolkit] Service worker initialized');

// Installation event - delegate to first-run handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[CP Toolkit] Extension installed/updated:', details.reason);
  
  // Use the first-run handler for install/update logic
  if (self.firstRunHandler && self.firstRunHandler.onInstalledHandler) {
    self.firstRunHandler.onInstalledHandler(details);
  } else {
    console.error('[CP Toolkit] First-run handler not loaded!');
  }
});

// Prevent-timeout alarm: fires every 2 minutes to check all CMS tabs for session timeout dialogs.
// Uses chrome.alarms because content script setInterval gets throttled in background tabs (Chrome 88+).
// The alarm listener MUST be at the top level so Chrome can wake the service worker to handle it.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cp-prevent-timeout') {
    // Check if prevent-timeout is enabled before pinging tabs
    chrome.storage.local.get('prevent-timeout', (settings) => {
      if (settings['prevent-timeout'] === false) return;

      // Send message to all tabs — content script will check for timeout dialog
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'cp-check-timeout' }).catch(() => {
              // Tab may not have content script injected — ignore silently
            });
          }
        }
      });
    });
  }
});

// Create the prevent-timeout alarm on startup (idempotent — won't duplicate)
chrome.alarms.get('cp-prevent-timeout', (existing) => {
  if (!existing) {
    chrome.alarms.create('cp-prevent-timeout', { periodInMinutes: 2 });
    console.log('[CP Toolkit] Created prevent-timeout alarm (every 2 min)');
  }
});

// Keep service worker alive (MV3 best practice)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[CP Toolkit] Message received:', message);
  sendResponse({ received: true });
  return true;
});

// Service worker lifecycle logging
self.addEventListener('activate', (event) => {
  console.log('[CP Toolkit] Service worker activated');
});

self.addEventListener('deactivate', (event) => {
  console.log('[CP Toolkit] Service worker deactivated');
});
