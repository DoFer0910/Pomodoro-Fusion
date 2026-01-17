// Default settings
const DEFAULT_APP_URL = "http://localhost:3000";

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only trigger when loading is complete and we have a URL
    if (changeInfo.status === "complete" && tab.url) {

        // Get stored settings
        chrome.storage.sync.get(["targetUrl", "appUrl"], async (result) => {
            const targetUrlFragment = result.targetUrl || "";
            const appUrl = result.appUrl || DEFAULT_APP_URL;

            // If no target set, do nothing
            if (!targetUrlFragment) return;

            // Check if visited URL contains the target fragment
            if (tab.url.includes(targetUrlFragment)) {

                // Avoid infinite loop if target is part of app URL (unlikely but safe)
                if (tab.url.includes(appUrl)) return;

                // Check if App is already open
                const tabs = await chrome.tabs.query({});
                const appTab = tabs.find(t => t.url && t.url.includes(appUrl));

                if (appTab) {
                    // If open, focus it
                    chrome.tabs.update(appTab.id, { active: true });
                    chrome.windows.update(appTab.windowId, { focused: true });
                } else {
                    // If not open, create it
                    chrome.tabs.create({ url: appUrl });
                }
            }
        });
    }
});
