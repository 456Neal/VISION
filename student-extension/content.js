// Content script for VISION Student Extension
let isLocked = false;
let lockOverlay = null;
let blockedSites = [];
let studentId = null; // Will be set on initialization

// Initialize extension
function initializeExtension() {
    // Generate or retrieve student ID
    chrome.storage.local.get(['studentId'], (result) => {
        if (result.studentId) {
            studentId = result.studentId;
        } else {
            studentId = 'student_' + Math.random().toString(36).substr(2, 9);
            chrome.storage.local.set({ studentId });
        }
    });
    
    // Get initial state
    chrome.storage.local.get(['blockedSites', 'isLocked'], (result) => {
        blockedSites = result.blockedSites || [];
        if (result.isLocked) {
            lockScreen();
        }
        checkBlockedSite();
    });
    
    // Start status reporting
    startStatusReporting();
}

// Create lock screen overlay
function createLockOverlay() {
    if (lockOverlay) return;
    
    lockOverlay = document.createElement('div');
    lockOverlay.id = 'vision-lock-overlay';
    lockOverlay.className = 'vision-overlay';
    lockOverlay.innerHTML = `
        <div class="vision-lock-container">
            <div class="vision-lock-content">
                <div class="vision-lock-icon">🔒</div>
                <h1 class="vision-lock-title">VISION</h1>
                <h2 class="vision-lock-subtitle">Screen Locked</h2>
                <p class="vision-lock-message">
                    Your screen has been locked by your administrator.<br>
                    Please wait for instructions.
                </p>
                <div class="vision-lock-spinner">
                    <div class="spinner"></div>
                </div>
                <p class="vision-lock-footer">Managed by VISION Classroom System</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(lockOverlay);
}

// Lock screen function
function lockScreen() {
    if (isLocked) return;
    
    isLocked = true;
    createLockOverlay();
    document.body.classList.add('vision-locked');
    
    // Prevent keyboard shortcuts and interactions
    document.addEventListener('keydown', preventKeyboardShortcuts, true);
    document.addEventListener('contextmenu', preventDefault, true);
    document.addEventListener('selectstart', preventDefault, true);
    document.addEventListener('dragstart', preventDefault, true);
    
    // Report status change
    reportStatus();
}

// Unlock screen function
function unlockScreen() {
    if (!isLocked) return;
    
    isLocked = false;
    
    if (lockOverlay) {
        lockOverlay.remove();
        lockOverlay = null;
    }
    
    document.body.classList.remove('vision-locked');
    
    // Remove event listeners
    document.removeEventListener('keydown', preventKeyboardShortcuts, true);
    document.removeEventListener('contextmenu', preventDefault, true);
    document.removeEventListener('selectstart', preventDefault, true);
    document.removeEventListener('dragstart', preventDefault, true);
    
    // Report status change
    reportStatus();
}

// Prevent keyboard shortcuts
function preventKeyboardShortcuts(event) {
    if (!isLocked) return;
    
    const blockedKeys = [
        'F12', 'F5', 'F11',
        'Tab', 'Enter', 'Escape'
    ];
    
    const blockedCombos = [
        ['Control', 'Shift', 'I'],
        ['Control', 'Shift', 'J'],
        ['Control', 'Shift', 'C'],
        ['Control', 'U'],
        ['Control', 'R'],
        ['Control', 'W'],
        ['Control', 'T'],
        ['Control', 'N'],
        ['Alt', 'F4'],
        ['Alt', 'Tab']
    ];
    
    if (blockedKeys.includes(event.code) || 
        blockedCombos.some(combo => 
            combo.every(key => 
                event.code === key || 
                event.ctrlKey && key === 'Control' ||
                event.shiftKey && key === 'Shift' ||
                event.altKey && key === 'Alt'
            )
        )) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
}

// Check if site is blocked
function checkBlockedSite() {
    const hostname = window.location.hostname;
    
    if (blockedSites.some(site => hostname.includes(site))) {
        showBlockedPage(hostname);
    }
}

// Show blocked page
function showBlockedPage(hostname) {
    const blockedOverlay = document.createElement('div');
    blockedOverlay.id = 'vision-blocked-overlay';
    blockedOverlay.className = 'vision-overlay';
    blockedOverlay.innerHTML = `
        <div class="vision-blocked-container">
            <div class="vision-blocked-content">
                <div class="vision-blocked-icon">🛡️</div>
                <h1 class="vision-blocked-title">Site Blocked</h1>
                <p class="vision-blocked-message">
                    This site has been blocked by your administrator:
                </p>
                <div class="vision-blocked-site">${hostname}</div>
                <button class="vision-request-btn" onclick="window.vision.requestUnblock('${hostname}')">
                    Request Access
                </button>
                <p class="vision-powered-by">Managed by VISION Classroom System</p>
            </div>
        </div>
    `;
    
    document.body.innerHTML = '';
    document.body.appendChild(blockedOverlay);
}

// Request unblock
window.vision = {
    requestUnblock: function(site) {
        const reason = prompt('Please provide a reason for requesting access to this site:');
        if (reason && reason.trim()) {
            chrome.runtime.sendMessage({
                action: 'unblockRequest',
                site: site,
                reason: reason.trim()
            }, (response) => {
                if (response && response.success) {
                    alert('Request submitted! You will be notified when it is reviewed.');
                } else {
                    alert('Failed to submit request. Please try again.');
                }
            });
        }
    }
};

// Report status to admin
function reportStatus() {
    window.postMessage({
        source: 'vision-student',
        action: 'status',
        studentId: studentId,
        url: window.location.href,
        hostname: window.location.hostname,
        title: document.title,
        locked: isLocked,
        timestamp: Date.now()
    }, '*');
}

// Start periodic status reporting
function startStatusReporting() {
    reportStatus(); // Initial report
    setInterval(reportStatus, 30000); // Report every 30 seconds
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
        case 'lockScreen':
            lockScreen();
            sendResponse({ success: true });
            break;
            
        case 'unlockScreen':
            unlockScreen();
            sendResponse({ success: true });
            break;
            
        case 'updateBlocks':
            blockedSites = request.sites || [];
            chrome.storage.local.set({ blockedSites });
            checkBlockedSite();
            sendResponse({ success: true });
            break;
            
        case 'getStatus':
            sendResponse({
                isLocked,
                url: window.location.href,
                title: document.title
            });
            break;
    }
});

// Initialize on load
initializeExtension();
