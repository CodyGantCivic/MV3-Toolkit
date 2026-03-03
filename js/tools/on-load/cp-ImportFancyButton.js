(function loadTool() {
  var thisTool = "cp-ImportFancyButton";
  chrome.storage.local.get(thisTool, function(settings) {
    detect_if_cp_site(function() {
      if (settings[thisTool] !== false && window.location.pathname.toLowerCase() === "/admin/graphiclinks.aspx") {

        var importButtonAdded = false;
        var buttonLibrary = null;

        // Load the button library
        $.getJSON(chrome.runtime.getURL("data/fancy-button-library.json"), function(data) {
          buttonLibrary = data && data.FancyButtons ? data.FancyButtons : {};
        });

        function createImportModal() {
          // Remove existing modal if any
          var existing = document.getElementById('cp-toolkit-import-modal');
          if (existing) existing.remove();

          var modal = document.createElement('div');
          modal.id = 'cp-toolkit-import-modal';
          modal.innerHTML = `
            <style>
              #cp-toolkit-import-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
              }
              .cp-import-dialog {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                width: 700px;
                max-width: 90vw;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
              }
              .cp-import-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .cp-import-header h2 {
                margin: 0;
                font-size: 18px;
                color: #333;
              }
              .cp-import-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                line-height: 1;
              }
              .cp-import-close:hover {
                color: #333;
              }
              .cp-import-tabs {
                display: flex;
                border-bottom: 1px solid #e0e0e0;
              }
              .cp-import-tab {
                padding: 12px 20px;
                border: none;
                background: none;
                cursor: pointer;
                font-size: 14px;
                color: #666;
                border-bottom: 2px solid transparent;
                margin-bottom: -1px;
              }
              .cp-import-tab:hover {
                color: #333;
                background: #f5f5f5;
              }
              .cp-import-tab.active {
                color: #0066cc;
                border-bottom-color: #0066cc;
              }
              .cp-import-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
              }
              .cp-import-panel {
                display: none;
              }
              .cp-import-panel.active {
                display: block;
              }
              .cp-template-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 16px;
              }
              .cp-template-card {
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                padding: 16px;
                cursor: pointer;
                transition: border-color 0.2s, box-shadow 0.2s;
              }
              .cp-template-card:hover {
                border-color: #0066cc;
                box-shadow: 0 2px 8px rgba(0,102,204,0.2);
              }
              .cp-template-preview {
                background: #f5f5f5;
                border-radius: 4px;
                padding: 20px;
                margin-bottom: 12px;
                min-height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-size: 14px;
              }
              .cp-template-name {
                font-weight: bold;
                font-size: 13px;
                color: #333;
                margin-bottom: 4px;
              }
              .cp-template-desc {
                font-size: 12px;
                color: #666;
              }
              .cp-paste-section textarea {
                width: 100%;
                height: 200px;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 12px;
                font-family: monospace;
                font-size: 12px;
                resize: vertical;
                box-sizing: border-box;
              }
              .cp-paste-section textarea:focus {
                outline: none;
                border-color: #0066cc;
              }
              .cp-paste-section label {
                display: block;
                margin-bottom: 8px;
                font-weight: bold;
                color: #333;
              }
              .cp-paste-section .cp-hint {
                font-size: 12px;
                color: #666;
                margin-top: 8px;
              }
              .cp-import-footer {
                padding: 16px 20px;
                border-top: 1px solid #e0e0e0;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
              }
              .cp-import-btn {
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                border: none;
              }
              .cp-import-btn-cancel {
                background: #f0f0f0;
                color: #333;
              }
              .cp-import-btn-cancel:hover {
                background: #e0e0e0;
              }
              .cp-import-btn-primary {
                background: #0066cc;
                color: white;
              }
              .cp-import-btn-primary:hover {
                background: #0055aa;
              }
              .cp-import-btn-primary:disabled {
                background: #ccc;
                cursor: not-allowed;
              }
              .cp-no-templates {
                text-align: center;
                color: #666;
                padding: 40px;
              }
            </style>
            <div class="cp-import-dialog">
              <div class="cp-import-header">
                <h2>Import Fancy Button</h2>
                <button class="cp-import-close" id="cp-import-close">&times;</button>
              </div>
              <div class="cp-import-tabs">
                <button class="cp-import-tab active" data-tab="templates">Template Library</button>
                <button class="cp-import-tab" data-tab="paste">Paste JSON</button>
              </div>
              <div class="cp-import-content">
                <div class="cp-import-panel active" id="cp-panel-templates">
                  <div class="cp-template-grid" id="cp-template-grid">
                    <!-- Templates will be inserted here -->
                  </div>
                </div>
                <div class="cp-import-panel" id="cp-panel-paste">
                  <div class="cp-paste-section">
                    <label for="cp-paste-json">Paste Button JSON:</label>
                    <textarea id="cp-paste-json" placeholder='{"styles":[...],"buttonText":"...","linkUrl":"/..."}'></textarea>
                    <div class="cp-hint">
                      Paste JSON exported from another fancy button or from the template library.
                    </div>
                  </div>
                </div>
              </div>
              <div class="cp-import-footer">
                <button class="cp-import-btn cp-import-btn-cancel" id="cp-import-cancel">Cancel</button>
                <button class="cp-import-btn cp-import-btn-primary" id="cp-import-submit" disabled>Import Button</button>
              </div>
            </div>
          `;

          document.body.appendChild(modal);

          // Tab switching
          var tabs = modal.querySelectorAll('.cp-import-tab');
          var panels = modal.querySelectorAll('.cp-import-panel');
          var selectedTemplate = null;
          var submitBtn = modal.querySelector('#cp-import-submit');

          tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
              tabs.forEach(function(t) { t.classList.remove('active'); });
              panels.forEach(function(p) { p.classList.remove('active'); });
              tab.classList.add('active');
              var panelId = 'cp-panel-' + tab.dataset.tab;
              document.getElementById(panelId).classList.add('active');
              updateSubmitButton();
            });
          });

          // Populate templates
          var grid = modal.querySelector('#cp-template-grid');
          if (buttonLibrary && Object.keys(buttonLibrary).length > 0) {
            Object.keys(buttonLibrary).forEach(function(key) {
              var template = buttonLibrary[key];
              var card = document.createElement('div');
              card.className = 'cp-template-card';
              card.dataset.templateKey = key;

              // Extract some info for display
              var buttonText = template.buttonText || 'Button';
              var cleanText = buttonText.replace(/<[^>]*>/g, ' ').trim();
              if (cleanText.length > 30) cleanText = cleanText.substring(0, 30) + '...';

              // Get font and color from styles
              var fontFamily = 'Arial';
              var textColor = '#333';
              template.styles.forEach(function(s) {
                if (s.Key === 'fancyButtonNormalTextFontFamily') fontFamily = s.Value;
                if (s.Key === 'fancyButtonNormalTextColor') textColor = s.Value;
              });

              card.innerHTML = `
                <div class="cp-template-preview" style="font-family: ${fontFamily}, sans-serif; color: ${textColor};">
                  ${cleanText}
                </div>
                <div class="cp-template-name">${key.replace(/_/g, ' ')}</div>
                <div class="cp-template-desc">Link: ${template.linkUrl || '/'}</div>
              `;

              card.addEventListener('click', function() {
                // Deselect others
                grid.querySelectorAll('.cp-template-card').forEach(function(c) {
                  c.style.borderColor = '#e0e0e0';
                });
                // Select this one
                card.style.borderColor = '#0066cc';
                selectedTemplate = key;
                updateSubmitButton();
              });

              grid.appendChild(card);
            });
          } else {
            grid.innerHTML = '<div class="cp-no-templates">No templates available. Use the "Paste JSON" tab instead.</div>';
          }

          // JSON paste handling
          var textarea = modal.querySelector('#cp-paste-json');
          textarea.addEventListener('input', function() {
            updateSubmitButton();
          });

          function updateSubmitButton() {
            var activeTab = modal.querySelector('.cp-import-tab.active').dataset.tab;
            if (activeTab === 'templates') {
              submitBtn.disabled = !selectedTemplate;
            } else {
              submitBtn.disabled = !textarea.value.trim();
            }
          }

          // Close modal
          function closeModal() {
            modal.remove();
          }

          modal.querySelector('#cp-import-close').addEventListener('click', closeModal);
          modal.querySelector('#cp-import-cancel').addEventListener('click', closeModal);
          modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
          });

          // Submit
          modal.querySelector('#cp-import-submit').addEventListener('click', function() {
            var activeTab = modal.querySelector('.cp-import-tab.active').dataset.tab;
            var jsonData;

            if (activeTab === 'templates' && selectedTemplate) {
              jsonData = JSON.stringify(buttonLibrary[selectedTemplate]);
            } else {
              jsonData = textarea.value.trim();
            }

            if (!jsonData) {
              alert('Please select a template or paste JSON data.');
              return;
            }

            // Validate JSON
            try {
              JSON.parse(jsonData);
            } catch (e) {
              alert('Invalid JSON format. Please check your input.');
              return;
            }

            closeModal();
            importFancyButton(jsonData);
          });
        }

        function importFancyButton(data) {
          console.log("[CP Toolkit] Generating Fancy Button...");

          // Show loading overlay
          var loadingOverlay = document.createElement('div');
          loadingOverlay.id = 'toolkit-block';
          loadingOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center;';
          loadingOverlay.innerHTML = '<div style="text-align: center; font-family: Arial, sans-serif;"><div style="font-size: 18px; margin-bottom: 10px;">Generating Fancy Button...</div><div style="color: #666;">Please wait</div></div>';
          document.body.appendChild(loadingOverlay);

          // Get current category ID
          var categoryElement = document.getElementsByName("intQLCategoryID")[0];
          var categoryID = categoryElement ? categoryElement.value : "0";

          // Update categoryID in the data
          var updatedData = data.replace(
            /"categoryID"\s*:\s*"0"/,
            '"categoryID": "' + categoryID + '"'
          );

          $.ajax({
            type: "POST",
            url: "/GraphicLinks/GraphicLinkSave",
            data: updatedData,
            contentType: "application/json"
          }).done(function() {
            var overlay = document.getElementById("toolkit-block");
            if (overlay) overlay.remove();
            location.reload();
          }).fail(function(xhr, status, error) {
            var overlay = document.getElementById("toolkit-block");
            if (overlay) overlay.remove();
            alert("Error importing: " + error);
          });
        }

        function tryAddImportButton() {
          if (importButtonAdded) return;

          var addItemButton = $("input[value*='Add Item']");
          if (!addItemButton.length) return;

          // Check if we already added the button
          if ($("input[value='Import Item']").length) {
            importButtonAdded = true;
            return;
          }

          importButtonAdded = true;
          console.log("[CP Toolkit] Loaded " + thisTool);

          try {
            var importItem = $(
              '<input type="button" style="background-color: #d3d657; border-bottom-color: #b3b64a; color: #333; margin-left: 5px;" class="cp-button" value="Import Item">'
            );
            addItemButton.after(importItem[0]);
            importItem.click(function() {
              createImportModal();
            });
          } catch (err) {
            console.warn("[CP Toolkit](" + thisTool + ") Error:", err);
          }
        }

        // Try immediately
        tryAddImportButton();

        // Retry after delays for dynamically loaded content
        setTimeout(tryAddImportButton, 500);
        setTimeout(tryAddImportButton, 1000);
        setTimeout(tryAddImportButton, 2000);

        // Also watch for DOM changes
        var observer = new MutationObserver(function() {
          tryAddImportButton();
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  });
})();
