// Helper script to interact with Gemini
(function() {
  // Find input element
  const inputs = document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"]');
  console.log('Found', inputs.length, 'input elements');
  
  // Try to find the main input area
  for (const input of inputs) {
    if (input.offsetParent !== null) { // visible
      console.log('Visible input:', input.tagName, input.className);
      input.focus();
      input.value = '今天最重要的AI产品趋势是什么？';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Find and click submit button
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.toLowerCase().includes('send') || 
            btn.getAttribute('aria-label')?.toLowerCase().includes('send')) {
          console.log('Found send button');
          // Don't auto-click for safety
        }
      }
      return 'Input found and populated';
    }
  }
  return 'No visible input found';
})();
