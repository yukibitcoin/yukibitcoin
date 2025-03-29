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

// Initialize settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: defaultSettings });
    }
  });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'settingsUpdated') {
    // Update dynamic rules based on settings
    updateDynamicRules(message.settings);
  } else if (message.action === 'updateStats') {
    // Update statistics
    updateStats(message.stats);
  }
});

// Update dynamic rules based on settings
function updateDynamicRules(settings) {
  // Get current rules
  chrome.declarativeNetRequest.getDynamicRules((currentRules) => {
    // Remove all existing dynamic rules
    const ruleIdsToRemove = currentRules.map(rule => rule.id);
    
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: generateRules(settings)
    });
  });
}

// Generate rules based on settings
function generateRules(settings) {
  const rules = [];
  let ruleId = 1000; // Start dynamic rule IDs at 1000 to avoid conflicts with static rules
  
  // Add image blocking rule if enabled
  if (settings.blockImages) {
    rules.push({
      id: ruleId++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        resourceTypes: ['image']
      }
    });
  }
  
  // Add video blocking rule if enabled
  if (settings.blockVideos) {
    rules.push({
      id: ruleId++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        resourceTypes: ['media']
      }
    });
    
    // Add additional video format rules
    rules.push({
      id: ruleId++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: '\\.mp4|\\.webm|\\.mov|\\.m4v|\\.avi|\\.flv|\\.mkv|\\.mpeg|\\.3gp|\\.ogg|\\.ogv|\\.ts',
        resourceTypes: ['other', 'xmlhttprequest', 'object', 'sub_frame']
      }
    });
    
    // Add streaming format rules
    rules.push({
      id: ruleId++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: 'hls|m3u8|mpd|dash',
        resourceTypes: ['xmlhttprequest']
      }
    });
  }
  
  return rules;
}

// Update statistics
function updateStats(newStats) {
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || defaultSettings;
    
    // Update stats
    settings.stats.bandwidthSaved += newStats.bandwidthSaved || 0;
    settings.stats.elementsBlocked += newStats.elementsBlocked || 0;
    
    // Save updated settings
    chrome.storage.sync.set({ settings });
  });
}

// Listen for tab updates to inject content script with current settings
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.startsWith('http')) {
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || defaultSettings;
      
      // Send settings to content script
      chrome.tabs.sendMessage(tabId, { 
        action: 'updateSettings', 
        settings: settings 
      }).catch(() => {
        // If content script is not ready, it's okay
      });
    });
  }
});