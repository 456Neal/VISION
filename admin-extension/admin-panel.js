document.addEventListener('DOMContentLoaded', () => {
    // Initialize tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            // Update active states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });

    // Initialize controls
    document.getElementById('lockAllBtn').addEventListener('click', () => {
        sendCommandToAllStudents({ action: 'lockScreen' });
        showNotification('All screens locked', 'success');
    });

    document.getElementById('unlockAllBtn').addEventListener('click', () => {
        sendCommandToAllStudents({ action: 'unlockScreen' });
        showNotification('All screens unlocked', 'success');
    });

    document.getElementById('startMonitoringBtn').addEventListener('click', startMonitoring);
    document.getElementById('stopMonitoringBtn').addEventListener('click', stopMonitoring);
    document.getElementById('clearBlockedBtn').addEventListener('click', clearAllBlocks);
    document.getElementById('setAdminCodeBtn').addEventListener('click', () => {
        const code = document.getElementById('adminCode').value.trim();
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
                if (tab.url && !tab.url.startsWith('chrome://')) {
                    chrome.tabs.sendMessage(tab.id, command).catch(() => {
                        // Ignore errors for tabs that don't have content script
                    });
                }
            });
        });
    }

    function loadBlockedSites() {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const sites = result.blockedSites || [];
            const container = document.getElementById('blockedSitesList');
            
            if (sites.length === 0) {
                container.innerHTML = '<p class="info-text">No sites blocked</p>';
            } else {
                container.innerHTML = sites.map(site => 
                    `<div class="blocked-site">
                        <span>${site}</span>
                        <button class="btn-small" onclick="unblockSite('${site}')">Unblock</button>
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
        // Implementation of notification system
        console.log(`${type}: ${message}`);
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
