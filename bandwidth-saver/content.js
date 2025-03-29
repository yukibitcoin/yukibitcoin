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
    // Add YouTube-specific video elements
    if (window.location.hostname.includes('youtube.com')) {
      selectors.push('ytd-player', '#player-container', '.html5-video-player');
    }
  }
  
  if (settings.blockIframes) {
    selectors.push('iframe[src*="youtube"]', 'iframe[src*="youtube-nocookie"]', 'iframe[src*="youtu.be"]',
                  'iframe[src*="vimeo"]', 'iframe[src*="dailymotion"]', 'iframe[src*="video"]', 
                  'iframe[src*="player"]', 'iframe[data-src*="youtube"]');
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
      } else if (el.tagName.toLowerCase() === 'ytd-player' || 
                el.id === 'player-container' || 
                el.classList.contains('html5-video-player')) {
        estimatedBandwidth += 10 * 1024 * 1024; // 10MB for YouTube players
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
    mediaElements.forEach(el => {
      // For YouTube-specific elements, we need to be careful about removal
      if (window.location.hostname.includes('youtube.com') && 
          (el.tagName.toLowerCase() === 'ytd-player' || 
           el.id === 'player-container' || 
           el.classList.contains('html5-video-player'))) {
        // For YouTube elements, we can either hide them or replace with placeholder
        el.style.display = 'none';
        
        // Optionally create a placeholder
        const placeholder = document.createElement('div');
        placeholder.textContent = 'Video blocked by Bandwidth Saver';
        placeholder.style.padding = '20px';
        placeholder.style.backgroundColor = '#f1f1f1';
        placeholder.style.textAlign = 'center';
        placeholder.style.border = '1px solid #ddd';
        el.parentNode.insertBefore(placeholder, el);
      } else {
        // For other elements, we can safely remove them
        el.remove();
      }
    });
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