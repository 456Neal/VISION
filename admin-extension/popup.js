document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Control button handlers
    document.getElementById('lockAllBtn').addEventListener('click', () => {
        sendCommandToAllStudents({ action: 'lockScreen' });
        showNotification('All screens locked', 'success');
    });

    document.getElementById('unlockAllBtn').addEventListener('click', () => {
        sendCommandToAllStudents({ action: 'unlockScreen' });
        showNotification('All screens unlocked', 'success');
    });

    document.getElementById('redirectBtn').addEventListener('click', () => {
        const url = prompt('Enter URL to redirect all students:');
        if (url) {
            sendCommandToAllStudents({ action: 'redirect', url: url });
            showNotification(`Redirecting all students to ${url}`, 'info');
        }
    });

    document.getElementById('redirectToBtn').addEventListener('click', () => {
        const url = document.getElementById('redirectUrl').value;
        if (url) {
            sendCommandToAllStudents({ action: 'redirect', url: url });
            showNotification(`Redirecting all students to ${url}`, 'info');
            document.getElementById('redirectUrl').value = '';
        }
    });

    document.getElementById('closeTabsBtn').addEventListener('click', () => {
        if (confirm('Close current tabs for all students?')) {
            sendCommandToAllStudents({ action: 'closeTabs' });
            showNotification('Closing tabs for all students', 'warning');
        }
    });

    document.getElementById('playSoundBtn').addEventListener('click', () => {
        sendCommandToAllStudents({ action: 'playSound' });
        showNotification('Alert sound played', 'info');
    });

    document.getElementById('muteAllBtn').addEventListener('click', () => {
        sendCommandToAllStudents({ action: 'muteAll' });
        showNotification('All tabs muted', 'info');
    });

    document.getElementById('blockSiteBtn').addEventListener('click', () => {
        const url = document.getElementById('blockSiteUrl').value;
        if (url) {
            blockSite(url);
            document.getElementById('blockSiteUrl').value = '';
        }
    });

    document.getElementById('startMonitoringBtn').addEventListener('click', () => {
        startMonitoring();
    });

    document.getElementById('stopMonitoringBtn').addEventListener('click', () => {
        stopMonitoring();
    });

    document.getElementById('clearBlockedBtn').addEventListener('click', () => {
        if (confirm('Clear all blocked sites?')) {
            clearAllBlocks();
        }
    });

    document.getElementById('setAdminCodeBtn').addEventListener('click', () => {
        const code = document.getElementById('adminCode').value;
        if (code) {
            setAdminCode(code);
        }
    });

    // Load initial data
    loadBlockedSites();
    loadUnblockRequests();
    loadStudentList();

    // Functions
    function sendCommandToAllStudents(command) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                    chrome.tabs.sendMessage(tab.id, command).catch(() => {
                        // Ignore errors for tabs that don't have the student extension
                    });
                }
            });
        });

        // Also store command for new tabs
        chrome.storage.local.set({ lastCommand: command });
    }

    function blockSite(url) {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const blockedSites = result.blockedSites || [];
            const domain = new URL(url).hostname;
            
            if (!blockedSites.includes(domain)) {
                blockedSites.push(domain);
                chrome.storage.local.set({ blockedSites }, () => {
                    showNotification(`Blocked ${domain}`, 'success');
                    loadBlockedSites();
                    sendCommandToAllStudents({ action: 'updateBlocks', sites: blockedSites });
                });
            }
        });
    }

    function loadBlockedSites() {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const blockedSites = result.blockedSites || [];
            const container = document.getElementById('blockedSitesList');
            
            if (blockedSites.length === 0) {
                container.innerHTML = '<p class="info-text">No sites blocked</p>';
            } else {
                container.innerHTML = blockedSites.map(site => 
                    `<div class="blocked-item">
                        <span>${site}</span>
                        <button class="btn-small btn-deny" onclick="unblockSite('${site}')">Remove</button>
                    </div>`
                ).join('');
            }
        });
    }

    function loadUnblockRequests() {
        chrome.storage.local.get(['unblockRequests'], (result) => {
            const requests = result.unblockRequests || [];
            const container = document.getElementById('unblockRequests');
            const badge = document.getElementById('requestBadge');
            
            if (requests.length === 0) {
                container.innerHTML = '<p class="info-text">No pending requests</p>';
                badge.classList.add('hidden');
            } else {
                container.innerHTML = requests.map((request, index) => 
                    `<div class="request-item">
                        <div>
                            <strong>${request.site}</strong><br>
                            <small>Reason: ${request.reason}</small>
                        </div>
                        <div class="request-actions">
                            <button class="btn-small btn-approve" onclick="approveRequest(${index})">Approve</button>
                            <button class="btn-small btn-deny" onclick="denyRequest(${index})">Deny</button>
                        </div>
                    </div>`
                ).join('');
                badge.textContent = requests.length;
                badge.classList.remove('hidden');
            }
        });
    }

    function loadStudentList() {
        // This would connect to active student extensions
        const container = document.getElementById('studentList');
        container.innerHTML = '<p class="info-text">Student monitoring system ready</p>';
    }

    function startMonitoring() {
        sendCommandToAllStudents({ action: 'startScreenCapture' });
        showNotification('Monitoring started', 'success');
    }

    function stopMonitoring() {
        sendCommandToAllStudents({ action: 'stopScreenCapture' });
        showNotification('Monitoring stopped', 'info');
    }

    function clearAllBlocks() {
        chrome.storage.local.set({ blockedSites: [] }, () => {
            showNotification('All blocks cleared', 'success');
            loadBlockedSites();
            sendCommandToAllStudents({ action: 'updateBlocks', sites: [] });
        });
    }

    function setAdminCode(code) {
        chrome.storage.local.set({ adminCode: code }, () => {
            showNotification('Admin code updated', 'success');
            document.getElementById('adminCode').value = '';
        });
    }

    function showNotification(message, type) {
        // For extension window, show alert instead of notifications
        if (window.location.protocol === 'chrome-extension:') {
            // Create a nice in-window notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#28a745' : type === 'danger' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#667eea'};
                color: ${type === 'warning' ? '#212529' : 'white'};
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-weight: 500;
                max-width: 300px;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        } else {
            console.log(`VISION: ${message}`);
        }
    }

    // Global functions for onclick handlers
    window.unblockSite = function(site) {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const blockedSites = result.blockedSites || [];
            const updated = blockedSites.filter(s => s !== site);
            chrome.storage.local.set({ blockedSites: updated }, () => {
                showNotification(`Unblocked ${site}`, 'success');
                loadBlockedSites();
                sendCommandToAllStudents({ action: 'updateBlocks', sites: updated });
            });
        });
    };

    window.approveRequest = function(index) {
        chrome.storage.local.get(['unblockRequests'], (result) => {
            const requests = result.unblockRequests || [];
            const request = requests[index];
            
            // Remove from blocked sites
            chrome.storage.local.get(['blockedSites'], (blockedResult) => {
                const blockedSites = blockedResult.blockedSites || [];
                const updated = blockedSites.filter(s => s !== request.site);
                chrome.storage.local.set({ blockedSites: updated });
                sendCommandToAllStudents({ action: 'updateBlocks', sites: updated });
            });
            
            // Remove request
            requests.splice(index, 1);
            chrome.storage.local.set({ unblockRequests: requests }, () => {
                loadUnblockRequests();
                loadBlockedSites();
                showNotification(`Approved access to ${request.site}`, 'success');
            });
        });
    };

    window.denyRequest = function(index) {
        chrome.storage.local.get(['unblockRequests'], (result) => {
            const requests = result.unblockRequests || [];
            const request = requests[index];
            requests.splice(index, 1);
            chrome.storage.local.set({ unblockRequests: requests }, () => {
                loadUnblockRequests();
                showNotification(`Denied request for ${request.site}`, 'info');
            });
        });
    };
});
