// Content script for VISION Admin Extension
// This runs on all pages to coordinate with student extensions

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Forward admin commands to student extensions if they exist
    window.postMessage({
        source: 'vision-admin',
        ...request
    }, '*');
    
    sendResponse({ success: true });
});

// Listen for responses from student extensions
window.addEventListener('message', (event) => {
    if (event.data.source === 'vision-student') {
        // Handle student extension responses
        if (event.data.action === 'status') {
            // Student is reporting their status
            console.log('Student status:', event.data);
            
            // Forward status to background script for storage/processing
            chrome.runtime.sendMessage({
                action: 'updateStudentStatus',
                data: event.data
            });
        }
    }
});

// Admin identification
const adminMarker = document.createElement('meta');
adminMarker.name = 'vision-admin';
adminMarker.content = 'true';
document.head.appendChild(adminMarker);
