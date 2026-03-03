(function loadTool() {
  var thisTool = "theme-manager-enhancer";
  var STYLE_ID = "cp-toolkit_theme-manager-enhancer";
  var initialized = false;

  chrome.storage.local.get(thisTool, function(settings) {
    if (chrome.runtime.lastError) {
      console.error("[CP Toolkit] Error loading settings for " + thisTool + ":", chrome.runtime.lastError);
      return;
    }
    detect_if_cp_site(function() {
      if (settings[thisTool] !== false) {
        var currentPage = window.location.pathname.toLowerCase();

        // Check if we're on a relevant page
        var isThemeManager = currentPage.startsWith("/designcenter/themes/");
        var isWidgetManager = currentPage.startsWith("/designcenter/widgets/");
        var isAnimationManager = currentPage.startsWith("/designcenter/animations/");
        var isRelevantPage = isThemeManager || isWidgetManager || isAnimationManager;

        if (!isRelevantPage) {
          return;
        }

        /**
         * Injects the enhancement styles into the page
         * Uses <head> instead of <body> to survive body manipulation
         */
        function injectStyles() {
          // Check if styles already exist
          if (document.getElementById(STYLE_ID)) {
            return;
          }

          var styleElement = document.createElement("style");
          styleElement.id = STYLE_ID;
          styleElement.textContent = `
/* [CP Toolkit] Theme Manager Enhancer Styles */

/* Change outline when focused in exploded view */
.exploded [data-cprole$="Container"].focused {
    outline-style: dashed !important;
}

/* Unfix stickyStructural on exploded view */
.exploded .stickySticky {
    position: relative;
    top: auto !important;
}

/* Fix padding when unfixed stickySticky on exploded view */
.exploded #bodyWrapper {
    padding-top: 47px !important;
}

/* Fix z-index issue with stickyStructural hover (caused by cpComponent hover z-index) */
.stickyStructuralContainer.stickySticky:hover,
.stickyStructuralContainer.stickyCollapsed:hover {
    z-index: 100;
}

/* Fix Widget Skin cut-off */
.modalContainer.modalContainerCP.manageWidgetSkins .cpForm>li .status {
    position: static;
}

.modalContainer.modalContainerCP.manageWidgetSkins .cpForm>li .status:before {
    content: "The skin above is ";
}

.modalContainer.modalContainerCP.manageWidgetSkins .cpForm>li input[type=text] {
    padding-right: .5rem !important;
}

.currentWidgetSkins li.rename[data-active="False"] input {
    background: #DDD;
}

/* Fix horizontal scroll bar (don't negative position first structuralContainer when exploded) */
.exploded #bodyWrapper > .structuralContainer:before {
    left: 0 !important;
    right: 0 !important;
}

/* Fix horizontal scroll bar (don't negative position cpComponents unless exploded) */
body:not(.exploded) .cpComponent:before {
    left: 0 !important;
    right: 0 !important;
}
`;
          // Append to <head> instead of <body> - more likely to survive DOM manipulation
          (document.head || document.documentElement).appendChild(styleElement);
        }

        /**
         * Adds the Layout Manager option to the dropdown
         */
        function addLayoutManagerOption() {
          var currentViewSelect = $(".cpToolbar select#currentView");
          if (currentViewSelect.length) {
            // Check if option already exists
            if (currentViewSelect.find("option[value='Layouts']").length === 0) {
              var layoutManagerOption = $('<option value="Layouts">Layout Manager</option>');
              currentViewSelect.append(layoutManagerOption);
            }

            // Check if change handler is already attached (using data attribute)
            if (!currentViewSelect.data("cp-toolkit-layout-handler")) {
              currentViewSelect.data("cp-toolkit-layout-handler", true);
              currentViewSelect.on("change.cpToolkit", function() {
                if ($(this).val() === "Layouts") {
                  window.location.href = "/Admin/DesignCenter/Layouts";
                }
              });
            }
          }
        }

        /**
         * Main initialization function
         */
        function initEnhancer() {
          try {
            // Always inject styles on theme manager pages
            if (isThemeManager) {
              injectStyles();
            }

            // Add Layout Manager dropdown option
            if (isRelevantPage) {
              addLayoutManagerOption();
            }

            if (!initialized) {
              initialized = true;
              console.log("[CP Toolkit] Loaded " + thisTool);
            }
          } catch (err) {
            console.warn("[CP Toolkit](" + thisTool + ") Error:", err);
          }
        }

        // Initial run when DOM is ready
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", initEnhancer);
        } else {
          initEnhancer();
        }

        // Watch for DOM changes that might remove our styles or the dropdown
        // CivicPlus Theme Manager uses AJAX to switch themes and update content
        var observer = new MutationObserver(function(mutations) {
          // Check if our styles were removed
          if (isThemeManager && !document.getElementById(STYLE_ID)) {
            injectStyles();
          }

          // Check if dropdown needs the option re-added (e.g., after theme switch)
          var currentViewSelect = $(".cpToolbar select#currentView");
          if (currentViewSelect.length && currentViewSelect.find("option[value='Layouts']").length === 0) {
            addLayoutManagerOption();
          }
        });

        // Start observing when body is available
        function startObserving() {
          if (document.body) {
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          } else {
            setTimeout(startObserving, 50);
          }
        }
        startObserving();

        // Also re-check periodically as a fallback (some CivicPlus operations don't trigger MutationObserver)
        // This is a lightweight check that only runs when needed
        var checkInterval = setInterval(function() {
          // Stop if we've navigated away from relevant pages
          var newPath = window.location.pathname.toLowerCase();
          if (!newPath.startsWith("/designcenter/themes/") &&
              !newPath.startsWith("/designcenter/widgets/") &&
              !newPath.startsWith("/designcenter/animations/")) {
            clearInterval(checkInterval);
            observer.disconnect();
            return;
          }

          // Re-inject if missing
          if (isThemeManager && !document.getElementById(STYLE_ID)) {
            injectStyles();
          }
        }, 2000);
      }
    });
  });
})();
