document.addEventListener('DOMContentLoaded', function() {
    const colorButtons = document.querySelectorAll('.color-button');
    const clearBtn = document.getElementById('clearAll');
    const enableSite = document.getElementById('enableSite');
    const disableSiteForever = document.getElementById('disableSiteForever');
    const disableSiteSession = document.getElementById('disableSiteSession');

    // Utility: disable all controls and show a message
    function showNoContentScript() {
        colorButtons.forEach(btn => btn.disabled = true);
        clearBtn.disabled = true;
        enableSite.disabled = true;
        disableSiteForever.disabled = true;
        disableSiteSession.disabled = true;
        let msg = document.createElement('div');
        msg.style.cssText = "color:#fd4757;font-size:13px;margin:10px 0;text-align:center;";
        msg.textContent = "PageBoard is not available on this page.";
        document.querySelector('.pb-popup-container').appendChild(msg);
    }

    // Send a message to the content script, call cb(response) if present, else cb(null)
    function sendToContentScript(tab, msg, cb) {
        chrome.tabs.sendMessage(tab.id, msg, function(response) {
            if (chrome.runtime.lastError) {
                if (cb) cb(null);
            } else {
                if (cb) cb(response);
            }
        });
    }

    // Get current tab and hostname
    function getCurrentTab(cb) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            cb(tabs[0]);
        });
    }
    function getCurrentHostname(cb) {
        getCurrentTab(tab => {
            try {
                const url = new URL(tab.url);
                cb(url.hostname, tab);
            } catch {
                cb(null, tab);
            }
        });
    }

    // Update color palette UI
    function updateActiveColor(color) {
        colorButtons.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-color="${color}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    // Query content script for current state
    getCurrentTab(tab => {
        sendToContentScript(tab, {action: 'getPageBoardState'}, function(response) {
            if (response && response.color) {
                updateActiveColor(response.color);
            } else {
                showNoContentScript();
            }
        });
    });

    // Color palette
    colorButtons.forEach(button => {
        button.addEventListener('click', function() {
            const color = this.dataset.color;
            getCurrentTab(tab => {
                sendToContentScript(tab, {action: 'setColor', color: color});
            });
            updateActiveColor(color);
        });
    });

    // Clear all
    clearBtn.addEventListener('click', function() {
        getCurrentTab(tab => {
            sendToContentScript(tab, {action: 'clearAll'});
        });
    });

    // Enable/disable for site logic
    getCurrentHostname(function(hostname, tab) {
        if (!hostname) return;
        chrome.storage.sync.get(['pb_disabled_sites', 'pb_disabled_session'], function(result) {
            const disabledSites = result.pb_disabled_sites || [];
            const disabledSession = result.pb_disabled_session || [];
            enableSite.checked = !(disabledSites.includes(hostname) || disabledSession.includes(hostname));
        });
    });

    enableSite.addEventListener('change', function() {
        getCurrentHostname(function(hostname, tab) {
            if (!hostname) return;
            chrome.storage.sync.get(['pb_disabled_sites', 'pb_disabled_session'], function(result) {
                let disabledSites = result.pb_disabled_sites || [];
                let disabledSession = result.pb_disabled_session || [];
                if (!enableSite.checked) {
                    // Disable for session by default
                    if (!disabledSession.includes(hostname)) disabledSession.push(hostname);
                } else {
                    disabledSites = disabledSites.filter(h => h !== hostname);
                    disabledSession = disabledSession.filter(h => h !== hostname);
                }
                chrome.storage.sync.set({pb_disabled_sites: disabledSites, pb_disabled_session: disabledSession}, function() {
                    chrome.tabs.reload(tab.id);
                });
            });
        });
    });

    disableSiteForever.addEventListener('click', function() {
        getCurrentHostname(function(hostname, tab) {
            if (!hostname) return;
            chrome.storage.sync.get(['pb_disabled_sites'], function(result) {
                let disabledSites = result.pb_disabled_sites || [];
                if (!disabledSites.includes(hostname)) disabledSites.push(hostname);
                chrome.storage.sync.set({pb_disabled_sites: disabledSites}, function() {
                    enableSite.checked = false;
                    chrome.tabs.reload(tab.id);
                });
            });
        });
    });

    disableSiteSession.addEventListener('click', function() {
        getCurrentHostname(function(hostname, tab) {
            if (!hostname) return;
            chrome.storage.sync.get(['pb_disabled_session'], function(result) {
                let disabledSession = result.pb_disabled_session || [];
                if (!disabledSession.includes(hostname)) disabledSession.push(hostname);
                chrome.storage.sync.set({pb_disabled_session: disabledSession}, function() {
                    enableSite.checked = false;
                    chrome.tabs.reload(tab.id);
                });
            });
        });
    });
});
