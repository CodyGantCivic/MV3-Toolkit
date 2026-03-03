(function loadTool() {
  var thisTool = "cp-MultipleCategoryUpload";
  chrome.storage.local.get(thisTool, function(settings) {
    if (chrome.runtime.lastError) {
      console.error("[CP Toolkit] Error loading settings for " + thisTool + ":", chrome.runtime.lastError);
      return;
    }
    detect_if_cp_site(function() {
      if (settings[thisTool] !== false) {
        console.log("[CP Toolkit] Loaded " + thisTool);
        try {

/**
 * Multiple Category Upload - Clean Modern Version
 * Based on Tampermonkey script v1.0.0
 * 
 * Adds a simple UI to create multiple categories on CivicPlus admin pages.
 * Supports: Info Center, Graphic Links, and Quick Links
 */

(function() {
  'use strict';

  const TOOLKIT_NAME = '[CP Toolkit - Multiple Categories]';

  /**
   * Helper to wait for a condition to become true before proceeding.
   */
  function waitFor(testFn, timeout = 8000, interval = 100) {
    const start = Date.now();
    return new Promise((resolve) => {
      (function check() {
        try {
          if (testFn()) return resolve(true);
        } catch (_) {
          // ignore errors in testFn
        }
        if (Date.now() - start >= timeout) return resolve(false);
        setTimeout(check, interval);
      })();
    });
  }

  /**
   * Initialize the Multiple Category Upload helper
   */
  async function init() {
    // Define the page paths this helper supports
    const path = (window.location.pathname || '').toLowerCase();
    const validPaths = [
      '/admin/infoii.aspx',
      '/admin/graphiclinks.aspx',
      '/admin/quicklinks.aspx'
    ];
    if (!validPaths.includes(path)) {
      // console.log(TOOLKIT_NAME + ' Not on a supported page');
      return;
    }

    // Wait for the "Add Category" button or link to exist
    const ready = await waitFor(() => {
      if (document.querySelector("input[value*='Add Category']")) return true;
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.some((a) => /Add Category/i.test(a.textContent || ''));
    }, 10000);
    
    if (!ready) {
      // console.log(TOOLKIT_NAME + ' Add Category button not found');
      return;
    }

    // console.log(TOOLKIT_NAME + ' Initializing...');

    // Inject styles
    const styleContent = `
      /* Multiple Category Upload Modal Styles */
      #cp-mcu-modal { display: none; position: fixed; z-index: 2147483600; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background: rgba(0, 0, 0, 0.4); }
      #cp-mcu-modal .cp-mcu-content { background: #fff; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 400px; max-width: 90%; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
      #cp-mcu-modal h3 { margin-top: 0; }
      .cp-mcu-section { margin-bottom: 10px; }
      .cp-mcu-section input, .cp-mcu-section select { width: 100%; margin-bottom: 4px; padding: 6px; }
      .cp-mcu-actions { display: flex; justify-content: space-between; gap: 6px; margin-top: 10px; }
      .cp-mcu-actions button { flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; background: #f3f4f6; cursor: pointer; }
      .cp-mcu-actions button:hover { background: #e5e7eb; }
      #cp-mcu-close { margin-top: 10px; padding: 6px 12px; border: none; background: #e5e7eb; border-radius: 4px; cursor: pointer; }
      #cp-mcu-close:hover { background: #d1d5db; }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = styleContent;
    document.head.appendChild(styleEl);

    // Build the modal structure
    const modal = document.createElement('div');
    modal.id = 'cp-mcu-modal';
    modal.innerHTML = `
      <div class="cp-mcu-content">
        <h3>Upload Multiple Categories</h3>
        <div id="cp-mcu-sections">
          <div class="cp-mcu-section">
            <input type="text" class="cp-mcu-name" placeholder="Category Name">
            <select class="cp-mcu-status">
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
            </select>
          </div>
        </div>
        <div class="cp-mcu-actions">
          <button type="button" id="cp-mcu-add">Add</button>
          <button type="button" id="cp-mcu-remove">Remove</button>
          <button type="button" id="cp-mcu-submit">Submit</button>
        </div>
        <button type="button" id="cp-mcu-close">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Add button - adds new category section
    document.getElementById('cp-mcu-add').addEventListener('click', function () {
      const sections = document.getElementById('cp-mcu-sections');
      const div = document.createElement('div');
      div.className = 'cp-mcu-section';
      div.innerHTML = `
        <input type="text" class="cp-mcu-name" placeholder="Category Name">
        <select class="cp-mcu-status">
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
        </select>
      `;
      sections.appendChild(div);
    });

    // Remove button - removes last section
    document.getElementById('cp-mcu-remove').addEventListener('click', function () {
      const sections = document.querySelectorAll('#cp-mcu-sections .cp-mcu-section');
      if (sections.length > 1) sections[sections.length - 1].remove();
    });

    // Close button - hides modal
    document.getElementById('cp-mcu-close').addEventListener('click', function () {
      modal.style.display = 'none';
    });

    // Submit button - posts each category
    document.getElementById('cp-mcu-submit').addEventListener('click', function () {
      const nameInputs = Array.from(document.querySelectorAll('.cp-mcu-name'));
      const statusSelects = Array.from(document.querySelectorAll('.cp-mcu-status'));
      const tasks = [];

      // Read lngResourceID from the page's form instead of hardcoding
      const resourceIdInput = document.querySelector('form[name="frmQLCategoryList"] input[name="lngResourceID"]');
      const resourceId = resourceIdInput ? resourceIdInput.value : '43';

      // Read CSRF token from the page's form (required on some CMS versions)
      const csrfInput = document.querySelector('form[name="frmQLCategoryList"] input[name="__RequestVerificationToken"]');
      const csrfToken = csrfInput ? csrfInput.value : '';

      nameInputs.forEach(function (input, idx) {
        const name = input.value.trim();
        if (!name) return;

        const status = statusSelects[idx] ? statusSelects[idx].value : 'Draft';
        const data = new URLSearchParams();
        data.append('lngResourceID', resourceId);
        data.append('strResourceType', 'M');
        data.append('ysnSave', '1');
        data.append('intQLCategoryID', '0');
        data.append('strAction', 'qlCategorySave');
        data.append('txtName', name);
        data.append('txtGroupViewList', '1');

        if (status === 'Published') {
          data.append('ysnPublishDetail', '1');
        }

        if (csrfToken) {
          data.append('__RequestVerificationToken', csrfToken);
        }

        const postUrl = window.location.origin + path;
        tasks.push(
          fetch(postUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: data.toString(),
            credentials: 'same-origin'
          })
        );
      });

      if (tasks.length) {
        // console.log(TOOLKIT_NAME + ' Submitting ' + tasks.length + ' categories...');
        Promise.allSettled(tasks).finally(function () {
          // console.log(TOOLKIT_NAME + ' All categories submitted - reloading');
          window.location.reload();
        });
      } else {
        modal.style.display = 'none';
      }
    });

    // Create trigger button
    let triggerButton;
    const addInput = document.querySelector("input[value*='Add Category']");
    
    if (addInput) {
      // Input-based button insertion
      triggerButton = document.createElement('input');
      triggerButton.type = 'button';
      triggerButton.className = 'cp-button';
      triggerButton.value = 'Add Multiple Categories';
      triggerButton.style.marginLeft = '5px';
      addInput.insertAdjacentElement('afterend', triggerButton);
    } else {
      // Anchor-based button insertion
      const addAnchor = Array.from(document.querySelectorAll('a')).find((a) => /Add Category/i.test(a.textContent || ''));
      if (addAnchor) {
        triggerButton = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'button bigButton nextAction cp-button';
        link.innerHTML = '<span>Add Multiple Categories</span>';
        triggerButton.appendChild(link);
        
        // Insert into the containing list
        let parent = addAnchor.parentElement;
        for (let i = 0; i < 3 && parent && parent.tagName.toLowerCase() !== 'ul'; i++) {
          parent = parent.parentElement;
        }
        if (parent) {
          parent.insertBefore(triggerButton, parent.firstChild);
        }
        triggerButton = link;
      }
    }

    // Wire up trigger button to show modal
    if (triggerButton) {
      triggerButton.addEventListener('click', function (event) {
        event.preventDefault();
        modal.style.display = 'block';
        
        // Reset all fields to default values
        document.querySelectorAll('#cp-mcu-sections .cp-mcu-name').forEach(function (inp) {
          inp.value = '';
        });
        document.querySelectorAll('#cp-mcu-sections .cp-mcu-status').forEach(function (sel) {
          sel.value = 'Draft';
        });
      });
      
      // console.log(TOOLKIT_NAME + ' Button added successfully');
    }
  }

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

        } catch (err) {
          console.warn("[CP Toolkit](" + thisTool + ") Error:", err);
        }
      } else {
        // console.log("[CP Toolkit] ○ Skipping " + thisTool + " (disabled in settings)");
      }
    });
  });
})();
