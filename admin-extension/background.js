// Background script for VISION Admin Extension
chrome.runtime.onInstalled.addListener(() => {
    // Initialize storage
    chrome.storage.local.set({
        blockedSites: [],
        unblockRequests: [],
        adminCode: 'admin123',
        isMonitoring: false,
        studentStatuses: {},
        activeControls: {}
    });
});

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: chrome.runtime.getURL('admin-panel.html'),
        pinned: true // Keep admin panel pinned for easy access
    });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
        case 'unblockRequest':
            handleUnblockRequest(request.site, request.reason);
            sendResponse({ success: true });
            break;
            
        case 'checkAdminCode':
            chrome.storage.local.get(['adminCode'], (result) => {
                sendResponse({ 
                    isValid: request.code === result.adminCode,
                    adminCode: result.adminCode 
                });
            });
            return true;
            
        case 'getBlockedSites':
            chrome.storage.local.get(['blockedSites'], (result) => {
                sendResponse({ sites: result.blockedSites || [] });
            });
            return true;
            
        case 'updateStudentStatus':
            updateStudentStatus(request.data);
            sendResponse({ success: true });
            break;
            
        case 'startMonitoring':
            startMonitoring();
            sendResponse({ success: true });
            break;
            
        case 'stopMonitoring':
            stopMonitoring();
            sendResponse({ success: true });
            break;
    }
});

// Update student status
function updateStudentStatus(data) {
    chrome.storage.local.get(['studentStatuses'], (result) => {
        const statuses = result.studentStatuses || {};
        statuses[data.studentId] = {
            ...data,
            lastUpdate: Date.now()
        };
        chrome.storage.local.set({ studentStatuses: statuses });
    });
}

// Start monitoring students
function startMonitoring() {
    chrome.storage.local.set({ isMonitoring: true });
    // Additional monitoring setup logic
}

// Stop monitoring students
function stopMonitoring() {
    chrome.storage.local.set({ isMonitoring: false });
    // Clean up monitoring resources
}

// Handle unblock requests
function handleUnblockRequest(site, reason) {
    chrome.storage.local.get(['unblockRequests'], (result) => {
        const requests = result.unblockRequests || [];
        const newRequest = {
            site,
            reason,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        requests.push(newRequest);
        chrome.storage.local.set({ unblockRequests: requests });
    });
}

// Monitor for inactive students
setInterval(() => {
    chrome.storage.local.get(['studentStatuses', 'isMonitoring'], (result) => {
        if (!result.isMonitoring) return;
        
        const now = Date.now();
        const timeoutThreshold = 5 * 60 * 1000; // 5 minutes
        
        Object.entries(result.studentStatuses || {}).forEach(([studentId, status]) => {
            if (now - status.lastUpdate > timeoutThreshold) {
                // Student inactive - trigger alert
                chrome.runtime.sendMessage({
                    action: 'studentInactive',
                    studentId
                });
            }
        });
    });
}, 60000); // Check every minute
