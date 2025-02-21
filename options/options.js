document.addEventListener('DOMContentLoaded', () => {
    const saveKeysButton = document.getElementById('save-keys-button');

    // Load saved keys on options page load
    chrome.storage.sync.get(['openaiApiKey', 'deepseekApiKey', 'grokApiKey'], (result) => { // REMOVED: 'googleApiKey' from get
        document.getElementById('openai-api-key').value = result.openaiApiKey || '';
        document.getElementById('deepseek-api-key').value = result.deepseekApiKey || '';
        document.getElementById('grok-api-key').value = result.grokApiKey || '';
        // REMOVED: document.getElementById('google-api-key').value = result.googleApiKey || '';  <- No longer load Google API Key
    });

    // Event listener for "Save Keys" button
    saveKeysButton.addEventListener('click', () => {
        const openaiApiKey = document.getElementById('openai-api-key').value.trim();
        const deepseekApiKey = document.getElementById('deepseek-api-key').value.trim();
        const grokApiKey = document.getElementById('grok-api-key').value.trim();
        // REMOVED: const googleApiKey = document.getElementById('google-api-key').value.trim(); <- No longer get Google API Key

        chrome.storage.sync.set({ openaiApiKey, deepseekApiKey, grokApiKey }, () => { // REMOVED: , googleApiKey from set
            alert('API keys saved successfully!'); // Consider better feedback in final version

            // Send message to background script to reload API keys (and model list will be updated)
            chrome.runtime.sendMessage({ action: "reloadApiKeys" });
        });
    });
});