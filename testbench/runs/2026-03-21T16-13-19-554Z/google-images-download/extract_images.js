// Extract image URLs from Google Image search results
(function() {
  const images = [];
  const seen = new Set();
  
  // Try different selectors that Google Images might use
  const selectors = [
    'img[src*="googleusercontent"]',
    'img[src*="gstatic"]',
    'img[data-src]',
    '.rg_i',
    '.Q4LuWd',
    'a[href*="imgres"] img'
  ];
  
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const img of elements) {
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && src.startsWith('http') && !seen.has(src)) {
          seen.add(src);
          images.push({
            src: src,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height
          });
        }
      }
    } catch (e) {}
  }
  
  return images.slice(0, 20);
})();
