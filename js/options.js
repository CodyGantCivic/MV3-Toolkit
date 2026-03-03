// Options page JavaScript - Dynamically loads tools from on-load-tools.json

let toolsData = {};

// Load tools data and settings
async function initialize() {
  try {
    // Load the tools configuration
    const response = await fetch(
      chrome.runtime.getURL("data/on-load-tools.json"),
    );
    toolsData = await response.json();

    // Add mini-ide if not present (it's a special case)
    if (!toolsData["mini-ide"]) {
      toolsData["mini-ide"] = {
        name: "Mini IDE",
        description:
          "Adds syntax highlighting, validation, themes, and line numbers to CSS textareas.",
        "enabled-by-default": true,
        "version-introduced": "1.14.0",
        "help-text":
          "This tool adds a VS Code-like editing experience to CSS textareas in Theme Manager, Widget Manager, and Fancy Button Builder. Features include syntax highlighting with light/dark themes, CSS validation with error detection, line numbers, and character counting.",
      };
    }

    // Generate the UI
    generateToolsUI();

    // Load current settings
    loadSettings();
  } catch (error) {
    console.error("Failed to load tools configuration:", error);
    document.getElementById("tools-container").innerHTML =
      '<p style="color: red;">Error loading tools configuration.</p>';
  }
}

// Group tools by category
function categorizeTools() {
  const categories = {
    "CSS & Design Tools": [
      "mini-ide",
      "widget-skin-advanced-style-helper",
      "graphic-link-advanced-style-helper",
      "widget-skin-default-override",
      "theme-manager-enhancer",
      "enforce-advanced-styles-text-limits",
      "fix-copied-skin-references",
    ],
    "Quick Links & Graphic Links": [
      "cp-MultipleQuickLinks",
      "quick-link-autofill",
      "graphic-link-autofill",
      "cp-ImportFancyButton",
    ],
    "Layout & Content Tools": [
      "download-xml-css",
      "xml-change-alerts",
      "cp-MultipleCategoryUpload",
      "cp-MultipleItemUpload",
    ],
    "UI Enhancements": [
      "title-changer",
      "keyboard-shortcuts",
      "module-icons",
      "input-focus",
      "auto-dismiss-help-welcome",
    ],
    "Session & Status": ["prevent-timeout", "cp-tools-status", "adfs"],
    "Other Tools": ["remember-image-picker-state", "show-changelog"],
  };

  return categories;
}

// Generate the tools UI dynamically
function generateToolsUI() {
  const container = document.getElementById("tools-container");
  container.innerHTML = "";

  const categories = categorizeTools();

  for (const [categoryName, toolIds] of Object.entries(categories)) {
    // Filter to only tools that exist in toolsData
    const existingTools = toolIds.filter((id) => toolsData[id]);

    if (existingTools.length === 0) continue;

    const section = document.createElement("div");
    section.className = "section";

    const heading = document.createElement("h2");
    heading.textContent = categoryName;
    section.appendChild(heading);

    for (const toolId of existingTools) {
      const tool = toolsData[toolId];

      const toolOption = document.createElement("div");
      toolOption.className = "tool-option";

      const label = document.createElement("label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = toolId;
      checkbox.addEventListener("change", saveSettings);

      const nameSpan = document.createElement("span");
      nameSpan.className = "tool-name";
      nameSpan.textContent = tool.name;

      label.appendChild(checkbox);
      label.appendChild(nameSpan);

      const description = document.createElement("div");
      description.className = "description";
      description.textContent = tool.description;

      toolOption.appendChild(label);
      toolOption.appendChild(description);

      // Add help text if available
      if (tool["help-text"]) {
        const helpText = document.createElement("div");
        helpText.className = "help-text";
        helpText.textContent = tool["help-text"];
        toolOption.appendChild(helpText);

        // Toggle help text on click (but not when clicking checkbox)
        toolOption.addEventListener("click", (e) => {
          if (e.target.tagName !== "INPUT") {
            helpText.classList.toggle("active");
          }
        });
      }

      section.appendChild(toolOption);
    }

    container.appendChild(section);
  }
}

// Load current settings from storage
function loadSettings() {
  chrome.storage.local.get(null, (settings) => {
    for (const toolId of Object.keys(toolsData)) {
      const checkbox = document.getElementById(toolId);
      if (checkbox) {
        // Default to enabled-by-default value, or true if not specified
        const defaultEnabled =
          toolsData[toolId]["enabled-by-default"] !== false;
        checkbox.checked =
          settings[toolId] !== undefined ? settings[toolId] : defaultEnabled;
      }
    }
  });
}

// Save settings to storage
function saveSettings() {
  const settings = {};

  for (const toolId of Object.keys(toolsData)) {
    const checkbox = document.getElementById(toolId);
    if (checkbox) {
      settings[toolId] = checkbox.checked;
    }
  }

  chrome.storage.local.set(settings, () => {
    // Show status message
    const status = document.getElementById("status");
    status.style.display = "block";
    setTimeout(() => {
      status.style.display = "none";
    }, 2000);
  });
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", initialize);
