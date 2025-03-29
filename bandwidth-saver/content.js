// Default settings
let settings = {
  blockImages: true,
  blockVideos: true,
  blockIframes: true,
  stats: {
    bandwidthSaved: 0,
    elementsBlocked: 0
  }
};

// Throttle function to limit how often a function can run
function throttle(callback, limit) {
  let waiting = false;
  return function() {
    if (!waiting) {
      callback.apply(this, arguments);
      waiting = true;
      setTimeout(() => {
        waiting = false;
      }, limit);
    }
  };
}

// Function to get media selectors based on settings
function getMediaSelectors() {
  let selectors = [];
  
  if (settings.blockVideos) {
    selectors.push('video');
  }
  
  if (settings.blockIframes) {
    selectors.push('iframe[src*="youtube"]', 'iframe[src*="vimeo"]', 
                  'iframe[src*="dailymotion"]', 'iframe[src*="video"]', 
                  'iframe[src*="player"]');
  }
  
  return selectors.join(', ');
}

// Function to remove media elements
function removeMediaElements() {
  const mediaSelectors = getMediaSelectors();
  
  // If no selectors (all blocking disabled), return early
  if (!mediaSelectors) return;
  
  const mediaElements = document.querySelectorAll(mediaSelectors);
  if (mediaElements.length > 0) {
    // Update stats
    settings.stats.elementsBlocked += mediaElements.length;
    
    // Estimate bandwidth saved (rough estimate)
    // Assume average video is 5MB, iframe is 1MB
    let estimatedBandwidth = 0;
    mediaElements.forEach(el => {
      if (el.tagName.toLowerCase() === 'video') {
        estimatedBandwidth += 5 * 1024 * 1024; // 5MB in bytes
      } else {
        estimatedBandwidth += 1 * 1024 * 1024; // 1MB in bytes
      }
    });
    settings.stats.bandwidthSaved += estimatedBandwidth;
    
    // Send stats update to background script
    chrome.runtime.sendMessage({
      action: 'updateStats',
      stats: {
        bandwidthSaved: estimatedBandwidth,
        elementsBlocked: mediaElements.length
      }
    }).catch(() => {
      // Ignore errors if background script is not ready
    });
    
    // Remove elements
    mediaElements.forEach(el => el.remove());
  }
}

// Throttled version of removeMediaElements that runs at most once every 100ms
const throttledRemoveMedia = throttle(removeMediaElements, 100);

// Create a MutationObserver with specific configuration
const observer = new MutationObserver((mutations) => {
  // Check if any of the mutations might have added media elements
  const mediaSelectors = getMediaSelectors();
  
  // If no selectors (all blocking disabled), return early
  if (!mediaSelectors) return;
  
  const shouldCheck = mutations.some(mutation => {
    // Only process childList mutations (element additions/removals)
    if (mutation.type !== 'childList') return false;
    
    // Check if any added nodes are media elements or might contain them
    return Array.from(mutation.addedNodes).some(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      
      // Check if the node itself is a media element
      if (node.matches && node.matches(mediaSelectors)) return true;
      
      // Check if the node contains media elements
      return node.querySelector && node.querySelector(mediaSelectors) !== null;
    });
  });
  
  // Only run the removal function if necessary
  if (shouldCheck) {
    throttledRemoveMedia();
  }
});

// Function to start observing
function startObserving() {
  if (document.body) {
    observer.observe(document.body, { 
      childList: true,  // Watch for element additions/removals
      subtree: true     // Watch the entire subtree
    });
    
    // Run once on start
    removeMediaElements();
  } else {
    // If body isn't available yet, wait for it
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { 
        childList: true,
        subtree: true
      });
      
      // Run once on start
      removeMediaElements();
    });
  }
}

// Listen for settings updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateSettings') {
    settings = message.settings;
    
    // Re-run removal with new settings
    removeMediaElements();
  }
});

// Initialize
startObserving();

// Clean up when the page is unloaded
window.addEventListener('beforeunload', () => {
  observer.disconnect();
});