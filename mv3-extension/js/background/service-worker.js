// CivicPlus Toolkit - Service Worker (MV3)
// Version 1.1.0

console.log('[CP Toolkit] Service worker initializing...');

// Import modules
importScripts('context-menus.js');
importScripts('first-run.js');

console.log('[CP Toolkit] Service worker initialized');

const MCP_CAPTURE_MAX_EVENTS_KEY = 'mcp-capture-max-events';
const MCP_CAPTURE_INCLUDE_RESPONSE_BODIES_KEY = 'mcp-capture-include-response-bodies';
const MCP_CAPTURE_ALLOW_REMOTE_UPLOAD_KEY = 'mcp-capture-allow-remote-upload';
const MCP_CAPTURE_DEFAULT_MAX_EVENTS = 800;
const mcpCaptureSessions = {};

function sanitizeCaptureMaxEvents(value) {
  var n = Number(value);
  if (!Number.isFinite(n)) n = MCP_CAPTURE_DEFAULT_MAX_EVENTS;
  n = Math.floor(n);
  if (n < 100) n = 100;
  if (n > 5000) n = 5000;
  return n;
}

function getCaptureConfig() {
  return chrome.storage.local
    .get([
      MCP_CAPTURE_MAX_EVENTS_KEY,
      MCP_CAPTURE_INCLUDE_RESPONSE_BODIES_KEY,
      MCP_CAPTURE_ALLOW_REMOTE_UPLOAD_KEY
    ])
    .then(function(settings) {
      return {
        maxEvents: sanitizeCaptureMaxEvents(settings[MCP_CAPTURE_MAX_EVENTS_KEY]),
        includeResponseBodies: !!settings[MCP_CAPTURE_INCLUDE_RESPONSE_BODIES_KEY],
        allowRemoteUpload: !!settings[MCP_CAPTURE_ALLOW_REMOTE_UPLOAD_KEY]
      };
    });
}

function buildCaptureSession(tabId) {
  var session = mcpCaptureSessions[tabId];
  if (session) return session;

  session = {
    enabled: false,
    sessionId: null,
    startedAt: null,
    updatedAt: null,
    page: null,
    events: []
  };
  mcpCaptureSessions[tabId] = session;
  return session;
}

function newCaptureSessionId(tabId) {
  return 'cp-capture-tab-' + tabId + '-' + Date.now();
}

function keepRecentCaptureEvents(session, maxEvents) {
  if (!session || !Array.isArray(session.events)) return;
  if (session.events.length <= maxEvents) return;
  session.events = session.events.slice(session.events.length - maxEvents);
}

function injectCaptureInstrumenter(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    world: 'MAIN',
    files: ['js/inject/page-instrument.js']
  });
}

function sendCaptureMessage(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

function setCaptureEnabled(tabId, enabled) {
  return getCaptureConfig().then(function(config) {
    var session = buildCaptureSession(tabId);

    if (enabled) {
      session.enabled = true;
      session.sessionId = newCaptureSessionId(tabId);
      session.startedAt = new Date().toISOString();
      session.updatedAt = session.startedAt;
      session.events = [];
    } else {
      session.enabled = false;
      session.updatedAt = new Date().toISOString();
    }

    return injectCaptureInstrumenter(tabId)
      .then(function() {
        return sendCaptureMessage(tabId, {
          action: 'cp-mcp-set-enabled',
          enabled: !!enabled,
          config: {
            includeResponseBodies: config.includeResponseBodies
          }
        });
      })
      .then(function() {
        return {
          success: true,
          enabled: session.enabled,
          eventCount: session.events.length,
          sessionId: session.sessionId
        };
      });
  });
}

function captureStatusForTab(tabId) {
  var session = buildCaptureSession(tabId);
  return {
    success: true,
    enabled: !!session.enabled,
    eventCount: Array.isArray(session.events) ? session.events.length : 0,
    sessionId: session.sessionId || null
  };
}

function buildCapturePayload(tabId) {
  return chrome.tabs.get(tabId).catch(function() {
    return null;
  }).then(function(tab) {
    var session = buildCaptureSession(tabId);
    var now = new Date().toISOString();
    var generatedAt = now;

    return getCaptureConfig().then(function(config) {
      return {
        captureId: session.sessionId || newCaptureSessionId(tabId),
        generatedAt: generatedAt,
        startedAt: session.startedAt || generatedAt,
        tab: {
          id: tabId,
          url: tab && tab.url ? tab.url : (session.page && session.page.url ? session.page.url : null),
          title: tab && tab.title ? tab.title : (session.page && session.page.title ? session.page.title : '')
        },
        page: session.page || null,
        settings: {
          includeResponseBodies: !!config.includeResponseBodies,
          maxEvents: config.maxEvents
        },
        stats: {
          eventCount: session.events.length
        },
        events: session.events.slice()
      };
    });
  });
}

function exportCapture(tabId) {
  return buildCapturePayload(tabId).then(function(capture) {
    var json = JSON.stringify(capture, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var blobUrl = URL.createObjectURL(blob);
    var fileName = (capture.captureId || ('cp-capture-' + Date.now())) + '.json';

    return chrome.downloads.download({
      url: blobUrl,
      filename: fileName,
      saveAs: true
    }).then(function(downloadId) {
      setTimeout(function() {
        URL.revokeObjectURL(blobUrl);
      }, 60000);
      return {
        success: true,
        downloadId: downloadId,
        eventCount: capture.stats.eventCount
      };
    }).catch(function(error) {
      URL.revokeObjectURL(blobUrl);
      throw error;
    });
  });
}

function isRemoteCaptureEndpoint(endpoint) {
  try {
    var parsed = new URL(endpoint);
    return parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
  } catch (error) {
    return true;
  }
}

function uploadCapture(tabId, endpoint) {
  return getCaptureConfig().then(function(config) {
    var target = String(endpoint || '').trim();
    if (!target) {
      throw new Error('Capture endpoint is required');
    }
    if (isRemoteCaptureEndpoint(target) && !config.allowRemoteUpload) {
      throw new Error('Remote capture upload is disabled in options');
    }

    return buildCapturePayload(tabId).then(function(capture) {
      return fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ capture: capture })
      }).then(function(response) {
        return response.text().then(function(text) {
          var parsed = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch (e) {}

          if (!response.ok) {
            throw new Error((parsed && parsed.error) || ('Upload failed with HTTP ' + response.status));
          }

          return {
            success: true,
            status: response.status,
            captureId: parsed && parsed.captureId ? parsed.captureId : capture.captureId,
            eventCount: capture.stats.eventCount,
            response: parsed
          };
        });
      });
    });
  });
}

chrome.tabs.onRemoved.addListener(function(tabId) {
  delete mcpCaptureSessions[tabId];
});

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

// Prevent-timeout alarm: fires every 2 minutes to notify content scripts.
// Uses chrome.alarms because content script setInterval gets throttled in background tabs (Chrome 88+).
// Content scripts check for the Session Timeout modal and click "Refresh Session" if visible.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cp-prevent-timeout') {
    chrome.storage.local.get('prevent-timeout', (settings) => {
      if (settings['prevent-timeout'] === false) return;

      chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
        for (const tab of tabs) {
          if (!tab.id || tab.id === chrome.tabs.TAB_ID_NONE) continue;
          chrome.tabs.sendMessage(tab.id, { action: 'cp-check-timeout' }).catch(() => {});
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

  if (message && message.action === 'cp-mcp-inject-instrumenter' && sender.tab && sender.tab.id) {
    injectCaptureInstrumenter(sender.tab.id).then(function() {
      sendResponse({ success: true });
    }).catch(function(error) {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message && message.action === 'cp-mcp-bridge-ready' && sender.tab && sender.tab.id) {
    var session = buildCaptureSession(sender.tab.id);
    session.page = message.page || session.page || null;

    if (!session.enabled) {
      sendResponse({ success: true, enabled: false });
      return true;
    }

    getCaptureConfig().then(function(config) {
      return sendCaptureMessage(sender.tab.id, {
        action: 'cp-mcp-set-enabled',
        enabled: true,
        config: {
          includeResponseBodies: config.includeResponseBodies
        }
      });
    }).then(function() {
      sendResponse({ success: true, enabled: true, sessionId: session.sessionId });
    }).catch(function(error) {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message && message.action === 'cp-mcp-capture-event' && sender.tab && sender.tab.id) {
    getCaptureConfig().then(function(config) {
      var session = buildCaptureSession(sender.tab.id);
      if (message.page) {
        session.page = message.page;
      }
      if (session.enabled && message.event) {
        session.events.push(message.event);
        session.updatedAt = new Date().toISOString();
        keepRecentCaptureEvents(session, config.maxEvents);
      }
      sendResponse({
        success: true,
        enabled: !!session.enabled,
        eventCount: session.events.length,
        sessionId: session.sessionId || null
      });
    }).catch(function(error) {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message && message.action === 'cp-mcp-capture-status' && message.tabId) {
    sendResponse(captureStatusForTab(message.tabId));
    return true;
  }

  if (message && message.action === 'cp-mcp-capture-toggle' && message.tabId) {
    setCaptureEnabled(message.tabId, !!message.enabled).then(function(result) {
      sendResponse(result);
    }).catch(function(error) {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message && message.action === 'cp-mcp-capture-export' && message.tabId) {
    exportCapture(message.tabId).then(function(result) {
      sendResponse(result);
    }).catch(function(error) {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message && message.action === 'cp-mcp-capture-upload' && message.tabId) {
    uploadCapture(message.tabId, message.endpoint).then(function(result) {
      sendResponse(result);
    }).catch(function(error) {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  // Show badge with refresh count from prevent-timeout
  if (message && message.action === 'cp-update-badge') {
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    chrome.action.setBadgeText({ text: message.text || '' });
  }

  // Open an extension page in a new tab (content scripts can't open chrome-extension:// URLs)
  if (message && message.action === 'cp-open-extension-page' && message.page) {
    chrome.tabs.create({ url: chrome.runtime.getURL(message.page) });
  }

  // Rebuild context menus (triggered when on-demand tools are enabled/disabled in options)
  if (message && message.action === 'cp-rebuild-context-menus') {
    initializeContextMenus(true);
  }

  // Execute arbitrary code in a specific iframe's MAIN world.
  // Used by tools that need to interact with page-level JS globals inside iframes
  // (e.g., Dropzone, saveChanges) which content scripts can't access directly.
  if (message && message.action === 'cp-execute-in-frame' && sender.tab) {
    chrome.webNavigation.getAllFrames({ tabId: sender.tab.id }).then(function(frames) {
      var targetFrame = frames.find(function(f) { return f.url.indexOf(message.urlMatch) > -1; });
      if (!targetFrame) {
        sendResponse({ error: 'Frame not found matching: ' + message.urlMatch });
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id, frameIds: [targetFrame.frameId] },
        world: 'MAIN',
        func: function(codeStr) { return eval(codeStr); },
        args: [message.code]
      }).then(function(results) {
        sendResponse({ result: results[0] ? results[0].result : null });
      }).catch(function(err) {
        sendResponse({ error: err.message });
      });
    }).catch(function(err) {
      sendResponse({ error: err.message });
    });
    return true; // async response
  }

  // Execute arbitrary code in the top frame's MAIN world and return the result.
  // Used when content scripts need access to page-level JS globals (e.g. jQuery, page functions).
  if (message && message.action === 'cp-execute-in-main' && message.code && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: function(codeStr) { return eval(codeStr); },
      args: [message.code]
    }).then(function(results) {
      sendResponse({ result: results[0] ? results[0].result : null });
    }).catch(function(err) {
      sendResponse({ error: err.message });
    });
    return true; // async response
  }

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
