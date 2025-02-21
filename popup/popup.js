document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const modelSelect = document.getElementById('model-select');
    const personalitySelect = document.getElementById('personality-select');
    const outputLabel = document.getElementById('output-label');
    const responseDiv = document.getElementById('response');
    const weaveButton = document.getElementById('send-button');
    const copyButton = document.getElementById('copy-button');
    const optionsHint = document.querySelector('.options-hint');

    let popupState = { // Centralized popup state object
        inputText: "",
        selectedModel: 'gpt-4o-mini-2024-07-18', // Default model
        selectedPersonality: 'None',
        outputText: ""
    };

    let apiKeysConfigured = false;

    // Function to update output label with model name
    function updateOutputLabel(modelValue) {
        let modelDisplayNameFull = modelSelect.options[modelSelect.selectedIndex].text; // Get full text from dropdown
        let modelDisplayName = modelDisplayNameFull.split(' (')[0]; // Split by " (" and take first part (model name only)
        outputLabel.textContent = `${modelDisplayName} Output:`; // Display model name only, no brackets
    }

    // Function to save popup state to storage
    function saveState() {
        chrome.storage.local.set(popupState);
        console.log("Popup state saved:", popupState); // DEBUG - State saving
    }

    // Function to restore popup state from storage
    function restoreState() {
        chrome.storage.local.get(null, (data) => { // Get all data from storage
            if (data.inputText !== undefined) popupState.inputText = data.inputText;
            if (data.selectedModel !== undefined) popupState.selectedModel = data.selectedModel;
            if (data.selectedPersonality !== undefined) popupState.selectedPersonality = data.selectedPersonality;
            if (data.outputText !== undefined) popupState.outputText = data.outputText;

            console.log("Popup state restored:", popupState); // DEBUG - State loading
            applyStateToUI(); // Apply loaded state to UI elements
        });
    }

    // Function to apply popup state to UI elements
    function applyStateToUI() {
        textInput.value = popupState.inputText;
        modelSelect.value = popupState.selectedModel;
        personalitySelect.value = popupState.selectedPersonality;
        responseDiv.innerHTML = popupState.outputText;
        updateOutputLabel(popupState.selectedModel);
    }


    // Handle Weave button click
    weaveButton.addEventListener('click', () => {
        popupState.outputText = "Weaving..."; // Update state immediately
        saveState(); // Save "Weaving..." state
        applyStateToUI(); // Update UI to show "Weaving..."
        processText();
    });

    // Handle Enter key press in textarea for submission
    textInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            processText();
        }
    });

    function processText() {
        const { inputText, selectedPersonality, selectedModel } = popupState; // Get state values directly
        weaveButton.textContent = "WEAVING...";
        weaveButton.disabled = true;
        modelSelect.disabled = true;
        personalitySelect.disabled = true;

        chrome.runtime.sendMessage(
            { action: "processText", text: inputText, personality: selectedPersonality, model: selectedModel },
            (response) => {
                const formattedText = response.result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                popupState.outputText = formattedText; // Update state with output
                saveState(); // Save updated state
                applyStateToUI(); // Apply updated state to UI
                weaveButton.textContent = "WEAVE";
                weaveButton.disabled = false;
                modelSelect.disabled = false;
                personalitySelect.disabled = false;
            }
        );
    }

    // Copy button event listener
    copyButton.addEventListener('click', function() {
        const textToCopy = responseDiv.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text to clipboard.');
        });
    });


    // Input text change - Update state and clear output immediately (OLD BEHAVIOR RESTORED)
    textInput.addEventListener('input', () => {
        popupState.inputText = textInput.value; // Update state
        popupState.outputText = ""; // Clear output in state - OLD BEHAVIOR
        saveState(); // Save updated state
        applyStateToUI(); // Update UI from state (clears output)
    });

    modelSelect.addEventListener('change', () => {
        popupState.selectedModel = modelSelect.value; // Update state
        saveState(); // Save updated state
        updateOutputLabel(popupState.selectedModel); // Update label immediately
    });

    personalitySelect.addEventListener('change', () => {
        popupState.selectedPersonality = personalitySelect.value; // Update state
        saveState(); // Save updated state
    });


    // Load current text from content script and handle highlighting - REFACTORED
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "getText") {
            console.log("Refactored V5 popup.js: getText message received:", request.text); // DEBUG
            if (request.text) {
                popupState.inputText = request.text; // Update state directly
                popupState.outputText = ""; // Clear output when new highlight - consistent behavior
                saveState(); // Save state with new input and cleared output
                applyStateToUI(); // Update UI from state (input box and cleared output)
                console.log("Refactored V5 popup.js: Input text updated:", popupState.inputText); // DEBUG
            } else {
                console.log("Refactored V5 popup.js: No text or empty text from getText"); // DEBUG
            }
        }
    });


    // --- INITIALIZATION SEQUENCE ---
    restoreState(); // 1. Restore state from storage FIRST

    chrome.runtime.sendMessage({ action: "getText" }, (response) => { // 2. THEN get current text (non-blocking)
        if (response && response.text) {
            popupState.inputText = response.text; // Update state with current text
            saveState(); // Save state with new input
            applyStateToUI(); // Apply to UI
            console.log("Refactored V5 popup.js: Initial input text from highlight applied."); // DEBUG
        }
    });

    // 3. THEN, after restoring state and getting text, check for API Keys and Model List (non-blocking)
    chrome.storage.sync.get(['openaiApiKey', 'deepseekApiKey', 'grokApiKey', 'googleApiKey'], (result) => {
        const openaiApiKeyPresent = !!result.openaiApiKey; // Explicit boolean conversion
        const deepseekApiKeyPresent = !!result.deepseekApiKey;
        const grokApiKeyPresent = !!result.grokApiKey;
        const googleApiKeyPresent = !!result.googleApiKey;
        apiKeysConfigured = openaiApiKeyPresent || deepseekApiKeyPresent || grokApiKeyPresent || googleApiKeyPresent; // Check if at least one is present

        console.log("API Key Check - OpenAI Key Present:", openaiApiKeyPresent); // DEBUG - Log each key's presence
        console.log("API Key Check - DeepSeek Key Present:", deepseekApiKeyPresent);
        console.log("API Key Check - Grok Key Present:", grokApiKeyPresent);
        console.log("API Key Check - Google Key Present:", googleApiKeyPresent);
        console.log("API Key Check - apiKeysConfigured:", apiKeysConfigured); // DEBUG - Log final apiKeysConfigured value


        if (apiKeysConfigured) {
            apiKeysConfigured = true;
            optionsHint.textContent = 'Weaver online. Add or remove API keys in plugin options.';
            weaveButton.disabled = false;
            modelSelect.disabled = false;

            chrome.runtime.sendMessage({ action: "getModelList" }, (response) => {
                const models = response.models;
                modelSelect.innerHTML = '';

                if (models && models.length > 0) {
                    apiKeysConfigured = true;
                    optionsHint.textContent = 'Weaver online. Add or remove API keys in plugin options.';
                    weaveButton.disabled = false;
                    modelSelect.disabled = false;


                    const sortedModels = [...models].sort((a, b) => {
                        const order = ['OpenAI', 'Grok', 'DeepSeek', 'Google']; // Include Google in sort order
                        const aBrand = a.name.includes('OpenAI') ? 'OpenAI' : (a.name.includes('DeepSeek') ? 'DeepSeek' : (a.name.includes('Grok') ? 'Grok' : (a.name.includes('Google') ? 'Google' : 'Other')));
                        const bBrand = b.name.includes('OpenAI') ? 'OpenAI' : (b.name.includes('DeepSeek') ? 'DeepSeek' : (b.name.includes('Grok') ? 'Grok' : (b.name.includes('Google') ? 'Google' : 'Other')));
                        return order.indexOf(aBrand) - order.indexOf(bBrand);
                    });

                    sortedModels.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.value;
                        option.textContent = model.name;
                        modelSelect.appendChild(option);
                    });

                    chrome.storage.local.get(['selectedModel'], (data) => {
                        if (data.selectedModel && models.some(model => model.value === data.selectedModel)) {
                            popupState.selectedModel = data.selectedModel;
                        } else if (models.length > 0) {
                            popupState.selectedModel = sortedModels[0].value;
                        }
                        saveState();
                        applyStateToUI();
                    });


                } else {
                    apiKeysConfigured = false;
                    optionsHint.textContent = 'At least one API key required in extension settings.';
                    weaveButton.disabled = true;
                    modelSelect.disabled = true;
                    modelSelect.innerHTML = '<option value="" class="placeholder-option">No models available</option>';
                    modelSelect.value = '';
                    alert('No API keys configured or no models available. Please open the extension options page to enter at least one API key.');
                }
            });


        } else {
            apiKeysConfigured = false;
            optionsHint.textContent = 'API keys required. Open extension settings to add them.';
            weaveButton.disabled = true;
            modelSelect.disabled = true;
            alert('API keys are not configured. Please open the extension options page to enter your API keys.');
        }
    });

    updateOutputLabel(popupState.selectedModel); // Initial label update on load

});