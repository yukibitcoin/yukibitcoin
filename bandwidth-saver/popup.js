// Default settings
const defaultSettings = {
  blockImages: true,
  blockVideos: true,
  blockIframes: true,
  stats: {
    bandwidthSaved: 0,
    elementsBlocked: 0
  }
};

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || defaultSettings;
    
    // Update UI with current settings
    document.getElementById('blockImages').checked = settings.blockImages;
    document.getElementById('blockVideos').checked = settings.blockVideos;
    document.getElementById('blockIframes').checked = settings.blockIframes;
    
    // Update stats display
    updateStatsDisplay(settings.stats);
  });
}

// Save settings to storage
function saveSettings(settings) {
  chrome.storage.sync.set({ settings }, () => {
    // Notify background script about settings change
    chrome.runtime.sendMessage({ action: 'settingsUpdated', settings });
  });
}

// Update stats display
function updateStatsDisplay(stats) {
  // Format bandwidth saved (convert bytes to KB/MB/GB)
  let formattedBandwidth;
  if (stats.bandwidthSaved < 1024) {
    formattedBandwidth = `${stats.bandwidthSaved} B`;
  } else if (stats.bandwidthSaved < 1024 * 1024) {
    formattedBandwidth = `${(stats.bandwidthSaved / 1024).toFixed(2)} KB`;
  } else if (stats.bandwidthSaved < 1024 * 1024 * 1024) {
    formattedBandwidth = `${(stats.bandwidthSaved / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    formattedBandwidth = `${(stats.bandwidthSaved / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  
  document.getElementById('bandwidthSaved').textContent = formattedBandwidth;
  document.getElementById('elementsBlocked').textContent = stats.elementsBlocked;
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Load settings
  loadSettings();
  
  // Add event listeners for toggles
  document.getElementById('blockImages').addEventListener('change', (e) => {
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || defaultSettings;
      settings.blockImages = e.target.checked;
      saveSettings(settings);
    });
  });
  
  document.getElementById('blockVideos').addEventListener('change', (e) => {
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || defaultSettings;
      settings.blockVideos = e.target.checked;
      saveSettings(settings);
    });
  });
  
  document.getElementById('blockIframes').addEventListener('change', (e) => {
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || defaultSettings;
      settings.blockIframes = e.target.checked;
      saveSettings(settings);
    });
  });
  
  // Add event listener for reset stats button
  document.getElementById('resetStats').addEventListener('click', () => {
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || defaultSettings;
      settings.stats = {
        bandwidthSaved: 0,
        elementsBlocked: 0
      };
      saveSettings(settings);
      updateStatsDisplay(settings.stats);
    });
  });
});