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
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
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
}

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
    }
}

function showBlockedMessage(hostname) {
    // Check if already showing blocked message
    if (document.getElementById('vision-blocked-overlay')) {
        return;
    }
    
    // Create blocked overlay
    const overlay = document.createElement('div');
    overlay.id = 'vision-blocked-overlay';
    overlay.innerHTML = `
        <div class="vision-blocked-container">
            <div class="vision-blocked-content">
                <div class="vision-blocked-icon">🛡️</div>
                <h1 class="vision-blocked-title">Oops! Site Blocked</h1>
                <p class="vision-blocked-message">
                    Sorry but your administrator didn't allow access to:
                </p>
                <div class="vision-blocked-site">${hostname}</div>
                <p class="vision-blocked-message">
                    Confused? You can submit an unblock request here:
                </p>
                <button class="vision-request-btn" onclick="requestUnblock('${hostname}')">
                    Request Access
                </button>
                <div class="vision-powered-by">Powered by VISION Classroom System</div>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #vision-blocked-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%) !important;
            z-index: 2147483647 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            color: white !important;
        }
        .vision-blocked-container {
            text-align: center !important;
            background: rgba(255,255,255,0.1) !important;
            backdrop-filter: blur(10px) !important;
            padding: 40px !important;
            border-radius: 20px !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
            max-width: 500px !important;
            width: 90% !important;
            animation: slideIn 0.5s ease-out !important;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .vision-blocked-icon { font-size: 64px !important; margin-bottom: 20px !important; }
        .vision-blocked-title { font-size: 32px !important; font-weight: 700 !important; margin-bottom: 15px !important; }
        .vision-blocked-message { font-size: 18px !important; opacity: 0.9 !important; margin-bottom: 30px !important; line-height: 1.5 !important; }
        .vision-blocked-site { 
            background: rgba(255,255,255,0.2) !important; 
            padding: 10px 20px !important; 
            border-radius: 25px !important; 
            font-weight: 600 !important;
            margin: 20px 0 !important;
        }
        .vision-request-btn {
            background: rgba(255,255,255,0.2) !important;
            color: white !important;
            border: 2px solid rgba(255,255,255,0.3) !important;
            padding: 12px 24px !important;
            border-radius: 25px !important;
            cursor: pointer !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
        }
        .vision-request-btn:hover {
            background: rgba(255,255,255,0.3) !important;
            border-color: rgba(255,255,255,0.5) !important;
            transform: translateY(-2px) !important;
        }
        .vision-powered-by {
            margin-top: 30px !important;
            font-size: 14px !important;
            opacity: 0.7 !important;
        }
    `;
    
    document.head.appendChild(style);
    
    // Replace page content
    document.body.innerHTML = '';
    document.body.appendChild(overlay);
    
    // Add request function to global scope
    window.requestUnblock = function(hostname) {
        const reason = prompt('Please provide a reason for requesting access to this site:');
        if (reason && reason.trim()) {
            chrome.runtime.sendMessage({
                action: 'unblockRequest',
                site: hostname,
                reason: reason.trim()
            }, (response) => {
                if (response && response.success) {
                    alert('Request submitted to administrator! You will be notified when it is reviewed.');
                } else {
                    alert('Failed to submit request. Please try again.');
                }
            });
        }
    };
}

// Forward messages to admin extension
function forwardToAdmin(message) {
    // Try to communicate with admin extension through storage
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

// Prevent extension disable/removal (basic protection)
chrome.management.onDisabled.addListener((info) => {
    if (info.id === chrome.runtime.id) {
        // Extension is being disabled, try to prevent it
        chrome.management.setEnabled(chrome.runtime.id, true);
    }
});

chrome.management.onUninstalled.addListener((info) => {
    if (info.id === chrome.runtime.id) {
        // Extension is being uninstalled, try to prevent it
        // Note: This won't actually prevent uninstall but can log the attempt
        console.log('VISION Student Extension uninstall attempted');
    }
});
