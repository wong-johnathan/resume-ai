// Content script — injected on demand by background.js via chrome.scripting.executeScript.
// Responds to a GET_PAGE_TEXT message with the page's visible text and current URL.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_TEXT') {
    sendResponse({
      pageText: document.body.innerText,
      pageUrl: window.location.href,
    });
  }
  return true; // Keep message channel open for async sendResponse
});
