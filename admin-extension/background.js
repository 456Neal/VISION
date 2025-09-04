// Background script for VISION Admin Extension

chrome.runtime.onInstalled.addListener(() => {
    // Initialize storage
    chrome.storage.local.set({
        blockedSites: [],
        unblockRequests: [],
        adminCode: 'admin123',
        isMonitoring: false
    });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'unblockRequest') {
        handleUnblockRequest(request.site, request.reason);
        sendResponse({ success: true });
    } else if (request.action === 'checkAdminCode') {
        chrome.storage.local.get(['adminCode'], (result) => {
            sendResponse({ 
                isValid: request.code === result.adminCode,
                adminCode: result.adminCode 
            });
        });
        return true;
    } else if (request.action === 'getBlockedSites') {
        chrome.storage.local.get(['blockedSites'], (result) => {
            sendResponse({ blockedSites: result.blockedSites || [] });
        });
        return true;
    }
});

// Handle tab updates to check for blocked sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
        checkIfBlocked(tabId, tab.url);
    }
});

// Handle new tab creation
chrome.tabs.onCreated.addListener((tab) => {
    // Send any pending commands to new student tabs
    chrome.storage.local.get(['lastCommand'], (result) => {
        if (result.lastCommand) {
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, result.lastCommand).catch(() => {
                    // Tab might not be ready yet
                });
            }, 1000);
        }
    });
});

function handleUnblockRequest(site, reason) {
    chrome.storage.local.get(['unblockRequests'], (result) => {
        const requests = result.unblockRequests || [];
        
        // Check if request already exists
        const exists = requests.some(req => req.site === site);
        if (!exists) {
            requests.push({
                site: site,
                reason: reason,
                timestamp: Date.now()
            });
            
            chrome.storage.local.set({ unblockRequests: requests }, () => {
                // Show notification to admin
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon48.png',
                    title: 'VISION - Unblock Request',
                    message: `Student requested access to ${site}`
                });
            });
        }
    });
}

function checkIfBlocked(tabId, url) {
    try {
        const hostname = new URL(url).hostname;
        
        chrome.storage.local.get(['blockedSites'], (result) => {
            const blockedSites = result.blockedSites || [];
            
            if (blockedSites.some(site => hostname.includes(site))) {
                // Inject block message
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: showBlockMessage,
                    args: [hostname]
                });
            }
        });
    } catch (error) {
        // Invalid URL, ignore
    }
}

function showBlockMessage(hostname) {
    // This function will be injected into blocked pages
    document.documentElement.innerHTML = `
        <html>
        <head>
            <title>Site Blocked - VISION</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                .block-container {
                    text-align: center;
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    padding: 40px;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.2);
                    max-width: 500px;
                    width: 90%;
                }
                .block-icon { font-size: 64px; margin-bottom: 20px; }
                .block-title { font-size: 32px; font-weight: 700; margin-bottom: 15px; }
                .block-message { font-size: 18px; opacity: 0.9; margin-bottom: 30px; line-height: 1.5; }
                .block-site { 
                    background: rgba(255,255,255,0.2); 
                    padding: 10px 20px; 
                    border-radius: 25px; 
                    font-weight: 600;
                    margin: 20px 0;
                }
                .request-btn {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 2px solid rgba(255,255,255,0.3);
                    padding: 12px 24px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                .request-btn:hover {
                    background: rgba(255,255,255,0.3);
                    border-color: rgba(255,255,255,0.5);
                    transform: translateY(-2px);
                }
            </style>
        </head>
        <body>
            <div class="block-container">
                <div class="block-icon">🛡️</div>
                <h1 class="block-title">Oops! Site Blocked</h1>
                <p class="block-message">
                    Sorry but your administrator didn't allow access to:
                </p>
                <div class="block-site">${hostname}</div>
                <p class="block-message">
                    Confused? You can submit an unblock request here:
                </p>
                <button class="request-btn" onclick="requestUnblock()">Request Access</button>
            </div>
            <script>
                function requestUnblock() {
                    const reason = prompt('Please provide a reason for requesting access to this site:');
                    if (reason) {
                        chrome.runtime.sendMessage({
                            action: 'unblockRequest',
                            site: '${hostname}',
                            reason: reason
                        });
                        alert('Request submitted to administrator');
                    }
                }
            </script>
        </body>
        </html>
    `;
}
