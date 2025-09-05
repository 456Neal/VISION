// Background script for VISION Student Extension
chrome.runtime.onInstalled.addListener(() => {
    // Initialize storage
    chrome.storage.local.set({
        isLocked: false,
        blockedSites: [],
        adminConnected: false
    });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'unblockRequest') {
        // Forward unblock request to admin extension
        forwardToAdmin(request);
        sendResponse({ success: true });
    } else if (request.action === 'getStatus') {
        chrome.storage.local.get(['isLocked', 'blockedSites'], (result) => {
            sendResponse(result);
        });
        return true;
    }
});

// Handle tab updates to check for blocked sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        checkIfSiteBlocked(tabId, tab.url);
    }
});

// Check if current site is blocked
function checkIfSiteBlocked(tabId, url) {
    try {
        const hostname = new URL(url).hostname;
        
        chrome.storage.local.get(['blockedSites'], (result) => {
            const blockedSites = result.blockedSites || [];
            
            if (blockedSites.some(site => hostname.includes(site))) {
                // Inject blocked page
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: showBlockedMessage,
                    args: [hostname]
                });
            }
        });
    } catch (error) {
        // Invalid URL, ignore
        console.error('Error checking blocked site:', error);
    }
}

// Forward messages to admin extension
function forwardToAdmin(message) {
    chrome.storage.local.get(['unblockRequests'], (result) => {
        const requests = result.unblockRequests || [];
        
        // Check if request already exists
        const exists = requests.some(req => req.site === message.site);
        if (!exists) {
            requests.push({
                site: message.site,
                reason: message.reason,
                timestamp: Date.now()
            });
            
            chrome.storage.local.set({ unblockRequests: requests });
        }
    });
}

// Listen for admin commands through storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.isLocked) {
            // Forward lock state change to content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: changes.isLocked.newValue ? 'lockScreen' : 'unlockScreen'
                    });
                }
            });
        }
        
        if (changes.blockedSites) {
            // Update blocked sites in all tabs
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.url && !tab.url.startsWith('chrome://')) {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'updateBlocks',
                            sites: changes.blockedSites.newValue
                        }).catch(() => {
                            // Ignore errors for tabs without content script
                        });
                    }
                });
            });
        }
    }
});

// Function that will be injected into tabs to show blocked message
function showBlockedMessage(hostname) {
    // This function will be stringified and injected into tabs
    // So it needs to be self-contained
    const blockContent = `
        <div id="vision-blocked-overlay" class="vision-overlay">
            <div class="vision-blocked-container">
                <div class="vision-blocked-content">
                    <div class="vision-blocked-icon">🛡️</div>
                    <h1 class="vision-blocked-title">Access Blocked</h1>
                    <p class="vision-blocked-message">
                        This site has been blocked by your administrator:
                    </p>
                    <div class="vision-blocked-site">${hostname}</div>
                    <p class="vision-blocked-message">
                        Need access? You can submit an unblock request:
                    </p>
                    <button class="vision-request-btn" id="vision-request-btn">
                        Request Access
                    </button>
                    <div class="vision-powered-by">Protected by VISION</div>
                </div>
            </div>
        </div>
    `;

    document.body.innerHTML = blockContent;

    // Add event listener for request button
    document.getElementById('vision-request-btn').addEventListener('click', () => {
        const reason = prompt('Please provide a reason for requesting access to this site:');
        if (reason && reason.trim()) {
            chrome.runtime.sendMessage({
                action: 'unblockRequest',
                site: hostname,
                reason: reason.trim()
            }, (response) => {
                if (response && response.success) {
                    alert('Request submitted! You will be notified when it is reviewed.');
                } else {
                    alert('Failed to submit request. Please try again.');
                }
            });
        }
    });
}
