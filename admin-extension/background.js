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

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: chrome.runtime.getURL('admin-panel.html')
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
