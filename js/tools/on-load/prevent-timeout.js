(function loadTool() {
  var thisTool = "prevent-timeout";
  chrome.storage.local.get(thisTool, function(settings) {
    detect_if_cp_site(function() {
      if (settings[thisTool] !== false) {
        // console.log("[CP Toolkit] Loading " + thisTool);
        try {
          function checkForTimeoutAndPrevent() {
            if (
              $(".cp-UIMessage-text")
                .text()
                .startsWith("You will be signed out in")
            ) {
              $(".cp-UIMessage-text")
                .find(".cp-Btn")
                .click();
              console.log("[CP Toolkit](" + thisTool + ") Login timeout prevented!");
            }
          }

          // Listen for alarm-triggered messages from the service worker.
          // chrome.alarms is immune to background tab timer throttling,
          // so this fires reliably even when the tab has been hidden for 30+ minutes.
          if (chrome.runtime?.id) {
            chrome.runtime.onMessage.addListener(function(message) {
              if (message && message.action === 'cp-check-timeout') {
                checkForTimeoutAndPrevent();
              }
            });
          }

          // Also keep the setInterval as a backup for foreground tabs.
          // This catches the dialog faster when the tab is actively visible.
          setInterval(checkForTimeoutAndPrevent, 2 * 1000 * 60);
        } catch (err) {
          console.warn(err);
        }
      }
    });
  });
})();
