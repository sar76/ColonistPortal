// == Catan Card Tracker Overlay ==
import { ResourceTracker } from "./resource-tracker.js";
import { UIOverlay } from "./ui-overlay.js";

(function () {
  // Initialize modules
  const resourceTracker = new ResourceTracker();
  const uiOverlay = new UIOverlay();

  // Make resourceTracker globally accessible for UI interactions
  window.resourceTracker = resourceTracker;

  // Force overlay to render immediately for debugging
  function forceOverlayRender() {
    const playerResources = resourceTracker.getPlayerResources();
    const resourceTypes = resourceTracker.getResourceTypes();
    const eventLogs = resourceTracker.getEventLogs();
    uiOverlay.renderOverlay(
      playerResources,
      resourceTypes,
      eventLogs,
      resourceTracker
    );
    console.log("[Catan Card Tracker] Forced overlay render for debugging");
  }

  // Set up MutationObserver
  function setupObserver() {
    // Find chat log container
    const chatLog = document.querySelector(
      'div[class*="pJOx4Tg4n9S8O1RM16YT"]'
    );
    if (!chatLog) {
      setTimeout(setupObserver, 1000); // Retry until found
      return;
    }

    console.log("[Catan Card Tracker] Chat log found, setting up observer");

    // Force overlay to render immediately
    forceOverlayRender();

    // Observe only new entries
    const observer = new MutationObserver((mutations) => {
      let resourcesUpdated = false;
      let newEntries = [];

      // Collect all new entries
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (
            node.nodeType === 1 &&
            node.classList.contains("O8TLknGehHkVfT5IRcHW")
          ) {
            newEntries.push(node);
          }
        }
      }

      // Process entries with previous element context
      if (newEntries.length > 0) {
        const allEntries = Array.from(
          chatLog.querySelectorAll("div.O8TLknGehHkVfT5IRcHW")
        );

        for (let i = 0; i < newEntries.length; i++) {
          const entry = newEntries[i];
          const entryIndex = allEntries.indexOf(entry);
          const prevEntry = entryIndex > 0 ? allEntries[entryIndex - 1] : null;

          const updated = resourceTracker.parseLogEntryWithPrev(
            entry,
            prevEntry
          );
          if (updated) {
            resourcesUpdated = true;
          }
        }
      }

      // Only re-render if resources were actually updated
      if (resourcesUpdated) {
        const playerResources = resourceTracker.getPlayerResources();
        const resourceTypes = resourceTracker.getResourceTypes();
        const eventLogs = resourceTracker.getEventLogs();
        uiOverlay.renderOverlay(
          playerResources,
          resourceTypes,
          eventLogs,
          resourceTracker
        );
      }
    });

    observer.observe(chatLog, { childList: true });

    // Parse existing entries (optional)
    const existingEntries = chatLog.querySelectorAll(
      "div.O8TLknGehHkVfT5IRcHW"
    );
    const allEntries = Array.from(existingEntries);

    for (let i = 0; i < allEntries.length; i++) {
      const entry = allEntries[i];
      const prevEntry = i > 0 ? allEntries[i - 1] : null;

      const updated = resourceTracker.parseLogEntryWithPrev(entry, prevEntry);
      if (updated) {
        const playerResources = resourceTracker.getPlayerResources();
        const resourceTypes = resourceTracker.getResourceTypes();
        const eventLogs = resourceTracker.getEventLogs();
        uiOverlay.renderOverlay(
          playerResources,
          resourceTypes,
          eventLogs,
          resourceTracker
        );
      }
    }

    // Force another render after parsing existing entries
    forceOverlayRender();
  }

  // Initialize
  setupObserver();

  // Fallback: Force overlay render after 3 seconds regardless
  setTimeout(() => {
    forceOverlayRender();
  }, 3000);
})();
