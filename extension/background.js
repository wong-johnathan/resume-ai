const SERVER_URL = 'http://localhost:3000'; // Change to production URL when deploying

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Clear any previous badge
  chrome.action.setBadgeText({ text: '', tabId: tab.id });

  try {
    // Inject content script into the active tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });

    // Ask content script for page text
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_TEXT' });
    const { pageText, pageUrl } = response;

    // Call server — session cookie is sent automatically (credentials: 'include')
    const res = await fetch(`${SERVER_URL}/api/external/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pageText, pageUrl }),
    });

    if (res.status === 401) {
      showNotification('Not logged in', 'Please log in to the app first.');
      return;
    }

    if (res.status === 422) {
      showNotification('Not a job page', "Couldn't detect a job on this page.");
      return;
    }

    if (res.status === 402) {
      showNotification('Upgrade required', 'You have reached your job limit. Upgrade to Pro.');
      return;
    }

    if (!res.ok) {
      showNotification('Error', 'Something went wrong, try again.');
      return;
    }

    const job = await res.json();

    // Show success badge for 3 seconds
    chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId: tab.id });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
    }, 3000);

    showNotification('Job saved!', `${job.jobTitle} at ${job.company} added to your tracker.`);
  } catch (err) {
    console.error('[SaveJob] Error:', err);
    showNotification('Error', 'Something went wrong, try again.');
  }
});

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'https://www.google.com/favicon.ico', // Temporary placeholder — replace with extension icon path once icons/ added
    title,
    message,
  });
}
