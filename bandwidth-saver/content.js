function removeMediaElements() {
  document.querySelectorAll('video, iframe').forEach(el => {
    el.remove();
  });
}

// Run once on page load
removeMediaElements();

// Keep removing dynamically added media
const observer = new MutationObserver(() => removeMediaElements());
observer.observe(document.body, { childList: true, subtree: true });