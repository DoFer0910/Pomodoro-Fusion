document.addEventListener('DOMContentLoaded', () => {
    const targetUrlInput = document.getElementById('targetUrl');
    const appUrlInput = document.getElementById('appUrl');
    const saveButton = document.getElementById('save');
    const status = document.getElementById('status');

    // Load settings
    chrome.storage.sync.get(['targetUrl', 'appUrl'], (result) => {
        if (result.targetUrl) targetUrlInput.value = result.targetUrl;
        if (result.appUrl) appUrlInput.value = result.appUrl;
        else appUrlInput.value = "http://localhost:3000";
    });

    // Save settings
    saveButton.addEventListener('click', () => {
        const targetUrl = targetUrlInput.value;
        const appUrl = appUrlInput.value;

        chrome.storage.sync.set({ targetUrl, appUrl }, () => {
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 2000);
        });
    });
});
