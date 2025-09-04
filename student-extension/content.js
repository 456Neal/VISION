// Content script for VISION Student Extension

let isLocked = false;
let lockOverlay = null;
let blockedSites = [];

// Create lock screen overlay
function createLockOverlay() {
    if (lockOverlay) return;
    
    lockOverlay = document.createElement('div');
    lockOverlay.id = 'vision-lock-overlay';
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
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #vision-lock-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            z-index: 2147483647 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            color: white !important;
        }
        
        .vision-lock-container {
            text-align: center !important;
            background: rgba(255,255,255,0.1) !important;
            backdrop-filter: blur(20px) !important;
            padding: 60px 40px !important;
            border-radius: 24px !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
            max-width: 500px !important;
            width: 90% !important;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important;
        }
        
        .vision-lock-icon {
            font-size: 72px !important;
            margin-bottom: 20px !important;
            animation: pulse 2s infinite !important;
        }
        
        .vision-lock-title {
            font-size: 48px !important;
            font-weight: 800 !important;
            margin-bottom: 10px !important;
            letter-spacing: 4px !important;
        }
        
        .vision-lock-subtitle {
            font-size: 24px !important;
            font-weight: 600 !important;
            margin-bottom: 25px !important;
            opacity: 0.9 !important;
        }
        
        .vision-lock-message {
            font-size: 16px !important;
            line-height: 1.6 !important;
            opacity: 0.8 !important;
            margin-bottom: 40px !important;
        }
        
        .vision-lock-spinner {
            margin: 30px 0 !important;
        }
        
        .spinner {
            width: 40px !important;
            height: 40px !important;
            border: 4px solid rgba(255,255,255,0.3) !important;
            border-top: 4px solid white !important;
            border-radius: 50% !important;
            animation: spin 1s linear infinite !important;
            margin: 0 auto !important;
        }
        
        .vision-lock-footer {
            font-size: 14px !important;
            opacity: 0.6 !important;
            margin-top: 30px !important;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        /* Prevent any interaction with the page below */
        body.vision-locked {
            overflow: hidden !important;
            pointer-events: none !important;
        }
        
        #vision-lock-overlay * {
            user-select: none !important;
            pointer-events: none !important;
        }
    `;
    
    document.head.appendChild(style);
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
}

// Prevent keyboard shortcuts when locked
function preventKeyboardShortcuts(event) {
    if (!isLocked) return;
    
    // Block common shortcuts
    const blockedKeys = [
        'F12', 'F5', 'F11', // Dev tools, refresh, fullscreen
        'Tab', 'Enter', 'Escape'
    ];
    
    const blockedCombos = [
        ['Control', 'Shift', 'KeyI'], // Dev tools
        ['Control', 'Shift', 'KeyJ'], // Console
        ['Control', 'Shift', 'KeyC'], // Inspect element
        ['Control', 'KeyU'], // View source
        ['Control', 'KeyR'], // Refresh
        ['Control', 'KeyW'], // Close tab
        ['Control', 'KeyT'], // New tab
        ['Control', 'KeyN'], // New window
        ['Alt', 'F4'], // Close window
        ['Alt', 'Tab'] // Switch windows
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

// Prevent default events
function preventDefault(event) {
    event.preventDefault();
    return false;
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
                    animation: slideIn 0.5s ease-out;
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
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
                .powered-by {
                    margin-top: 30px;
                    font-size: 14px;
                    opacity: 0.7;
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
                <div class="powered-by">Powered by VISION Classroom System</div>
            </div>
            <script>
                function requestUnblock() {
                    const reason = prompt('Please provide a reason for requesting access to this site:');
                    if (reason && reason.trim()) {
                        // Send message to background script
                        chrome.runtime.sendMessage({
                            action: 'unblockRequest',
                            site: '${hostname}',
                            reason: reason.trim()
                        }, (response) => {
                            if (response && response.success) {
                                alert('Request submitted to administrator! You will be notified when it is reviewed.');
                            } else {
                                alert('Failed to submit request. Please try again.');
                            }
                        });
                    }
                }
            </script>
        </body>
        </html>
    `;
}

// Play alert sound
function playAlertSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkeDDuU2+5oJAU7k9vyxqpgHAsKXr7pw3wvBCuCw+PzgSYHKYDV8s+iXBsKXrDo6qJVFAxBo+LtwmQcAjaP2fDJciMHKn/B8dyKNgcOdL3lZm0gAA==');
    audio.play().catch(() => {
        // Ignore audio play errors
    });
}

// Listen for messages from admin extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'lockScreen':
            lockScreen();
            sendResponse({ success: true });
            break;
            
        case 'unlockScreen':
            unlockScreen();
            sendResponse({ success: true });
            break;
            
        case 'redirect':
            if (request.url) {
                window.location.href = request.url;
            }
            sendResponse({ success: true });
            break;
            
        case 'closeTabs':
            window.close();
            sendResponse({ success: true });
            break;
            
        case 'playSound':
            playAlertSound();
            sendResponse({ success: true });
            break;
            
        case 'muteAll':
            // Mute all audio/video elements
            document.querySelectorAll('audio, video').forEach(media => {
                media.muted = true;
            });
            sendResponse({ success: true });
            break;
            
        case 'updateBlocks':
            blockedSites = request.sites || [];
            chrome.storage.local.set({ blockedSites });
            checkBlockedSite();
            sendResponse({ success: true });
            break;
            
        case 'startScreenCapture':
            // Screen capture would require additional permissions and setup
            sendResponse({ success: true });
            break;
            
        case 'stopScreenCapture':
            sendResponse({ success: true });
            break;
    }
});

// Listen for messages from admin content script
window.addEventListener('message', (event) => {
    if (event.data.source === 'vision-admin') {
        // Handle admin commands
        chrome.runtime.sendMessage(event.data);
    }
});

// Initialize
chrome.storage.local.get(['blockedSites', 'isLocked'], (result) => {
    blockedSites = result.blockedSites || [];
    
    if (result.isLocked) {
        lockScreen();
    }
    
    checkBlockedSite();
});

// Report status to admin
window.postMessage({
    source: 'vision-student',
    action: 'status',
    locked: isLocked,
    url: window.location.href
}, '*');

// Prevent tampering with the extension
Object.freeze(window.vision);

// Anti-tampering measures
const originalConsole = console.log;
console.log = function(...args) {
    if (args.some(arg => typeof arg === 'string' && arg.includes('vision'))) {
        return;
    }
    originalConsole.apply(console, args);
};
