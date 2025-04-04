document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const modelSelect = document.getElementById('model-select');
    const personalitySelect = document.getElementById('personality-select');
    const outputLabel = document.getElementById('output-label');
    const responseDiv = document.getElementById('response');
    const weaveButton = document.getElementById('send-button');
    const copyButton = document.getElementById('copy-button');
    const clearButton = document.getElementById('clear-button');
    const themeToggle = document.getElementById('theme-toggle');
    const optionsHint = document.querySelector('.options-hint');
    const charCount = document.getElementById('char-count');
    const tokenEstimate = document.getElementById('token-estimate');
    const outputCharCount = document.getElementById('output-char-count');
    const outputTokenCount = document.getElementById('output-token-count');
    const archetypePrompt = document.getElementById('archetype-prompt');

    // Check if this is a right-click window
    const urlParams = new URLSearchParams(window.location.search);
    const shouldAutoWeave = urlParams.get('autoWeave') === 'true';
    const isRightClickWindow = urlParams.get('windowType') === 'rightClick';

    // Apply right-click window styles if needed
    if (isRightClickWindow) {
        document.body.classList.add('right-click-window');
        
        // Dynamically load the right-click CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'rightclick.css';
        document.head.appendChild(link);
    }

    let popupState = {
        inputText: "",
        selectedModel: 'gpt-4o-mini-2024-07-18',
        selectedPersonality: 'None',
        outputText: "",
        theme: 'dark',
        isStreaming: false
    };

    let apiKeysConfigured = false;
    let streamController = null;
    let autoWeaveInitiated = false;

    function toggleTheme() {
        const newTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        document.body.classList.toggle('light-theme');
        themeToggle.querySelector('.material-icons-round').textContent = newTheme === 'light' ? 'dark_mode' : 'light_mode';
        popupState.theme = newTheme;
        chrome.storage.local.set({ theme: newTheme });
    }

    function initializeTheme() {
        chrome.storage.local.get(['theme'], (result) => {
            if (result.theme) {
                popupState.theme = result.theme;
                if (result.theme === 'light') {
                    document.body.classList.add('light-theme');
                    themeToggle.querySelector('.material-icons-round').textContent = 'dark_mode';
                }
            }
        });
    }

    function updateCharCount() {
        const count = textInput.value.length;
        charCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
        const estimatedTokens = Math.ceil(count / 4);
        tokenEstimate.textContent = `~${estimatedTokens} token${estimatedTokens !== 1 ? 's' : ''}`;
    }

    function updateOutputCounts(text) {
        const charCount = text.length;
        const estimatedTokens = Math.ceil(charCount / 4);
        outputCharCount.textContent = `${charCount} character${charCount !== 1 ? 's' : ''}`;
        outputTokenCount.textContent = `~${estimatedTokens} token${estimatedTokens !== 1 ? 's' : ''}`;
    }

    function processChainOfThought(text) {
        // Process <think> tags in DeepSeek output
        return text.replace(/<think>(.*?)<\/think>/gs, (match, content) => {
            return `<div class="chain-of-thought">💭 ${content.trim()}</div>`;
        });
    }

    function startStreaming() {
        responseDiv.innerHTML = '<div class="streaming-cursor"></div>';
        weaveButton.classList.add('loading');
        popupState.isStreaming = true;
        
        // Update output label with current model
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        if (!selectedOption) {
            document.querySelector('.model-name').textContent = 'Output:';
            document.getElementById('provider-logo').src = '';
            document.getElementById('provider-logo').alt = '';
            return;
        }
        
        let modelDisplayName = selectedOption.text.split(' (')[0];
        const providerMatch = selectedOption.text.match(/\((.*?)\)$/);
        const provider = providerMatch ? providerMatch[1] : '';
        
        // Set the provider logo based on the provider
        const providerLogo = document.getElementById('provider-logo');
        switch (provider) {
            case 'OpenAI':
                providerLogo.src = '/icons/ailogos/OpenAI200.png';
                providerLogo.alt = 'OpenAI Logo';
                break;
            case 'Google':
                providerLogo.src = '/icons/ailogos/Gemini200.png';
                providerLogo.alt = 'Google Logo';
                break;
            case 'DeepSeek':
                providerLogo.src = '/icons/ailogos/deepseek200.png';
                providerLogo.alt = 'DeepSeek Logo';
                break;
            case 'xAI':
                providerLogo.src = '/icons/ailogos/grok200.png';
                providerLogo.alt = 'xAI Logo';
                break;
            default:
                providerLogo.src = '';
                providerLogo.alt = '';
        }
        
        document.querySelector('.model-name').textContent = `${modelDisplayName} Output:`;
    }

    // Add function to convert all markdown formats to HTML
    function convertMarkdownToHtml(text) {
        // Handle code blocks with triple backticks
        text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `<pre><code>${code.trim()}</code></pre>`;
        });
        
        // Handle inline code with single backticks
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Handle headers (# Header) - up to 6 levels
        text = text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
            const level = hashes.length;
            return `<h${level}>${content}</h${level}>`;
        });
        
        // Handle bold+italic (***text***)
        text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        
        // Handle bold (**text**)
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Handle italic (*text*)
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Handle links [text](url)
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Handle hashtags with double hash symbols (but not headers)
        text = text.replace(/(?<!#)##(.*?)##/g, '<span class="hashtag">#$1</span>');
        
        return text;
    }

    // Function to handle real-time formatting for textareas
    function setupRealtimeFormatting(textarea, previewDiv) {
        let lastValue = '';
        let lastSelectionStart = 0;
        let lastSelectionEnd = 0;
        
        function updatePreview() {
            const currentValue = textarea.value;
            if (currentValue !== lastValue) {
                lastValue = currentValue;
                lastSelectionStart = textarea.selectionStart;
                lastSelectionEnd = textarea.selectionEnd;
                
                const formatted = convertMarkdownToHtml(currentValue);
                previewDiv.innerHTML = formatted;
                
                // Restore cursor position
                textarea.setSelectionRange(lastSelectionStart, lastSelectionEnd);
            }
        }
        
        textarea.addEventListener('input', updatePreview);
        textarea.addEventListener('keyup', updatePreview);
        textarea.addEventListener('mouseup', updatePreview);
        
        // Initial preview
        updatePreview();
    }

    // Add function to safely set HTML content
    function setHtmlContent(element, text) {
        // First process chain of thought if present
        text = processChainOfThought(text);
        // Then convert markdown to HTML
        const htmlContent = convertMarkdownToHtml(text);
        element.innerHTML = htmlContent;
    }

    function appendStreamChunk(chunk) {
        const cursor = responseDiv.querySelector('.streaming-cursor');
        if (cursor) {
            // Process chain of thought and markdown formatting
            const processedChunk = processChainOfThought(chunk);
            
            // Convert markdown to HTML for the chunk
            const formattedChunk = convertMarkdownToHtml(processedChunk);
            
            // Insert the formatted chunk before the cursor
            cursor.insertAdjacentHTML('beforebegin', formattedChunk);
            
            // Ensure proper scrolling
            responseDiv.scrollTop = responseDiv.scrollHeight;
            
            // Update output counts
            const currentText = responseDiv.textContent;
            updateOutputCounts(currentText);
        }
    }

    function endStreaming() {
        weaveButton.classList.remove('loading');
        const cursor = responseDiv.querySelector('.streaming-cursor');
        if (cursor) cursor.remove();
        
        // Format the entire output text after streaming ends
        const currentText = responseDiv.textContent;
        setHtmlContent(responseDiv, currentText);
        
        // Update state and counts
        popupState.outputText = currentText;
        popupState.isStreaming = false;
        updateOutputCounts(currentText);
        saveState();
    }

    function updateOutputLabel(modelValue) {
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        if (!selectedOption) {
            document.querySelector('.model-name').textContent = 'Output:';
            document.getElementById('provider-logo').src = '';
            document.getElementById('provider-logo').alt = '';
            return;
        }
        
        let modelDisplayName = selectedOption.text.split(' (')[0];
        const providerMatch = selectedOption.text.match(/\((.*?)\)$/);
        const provider = providerMatch ? providerMatch[1] : '';
        
        // Set the provider logo based on the provider
        const providerLogo = document.getElementById('provider-logo');
        switch (provider) {
            case 'OpenAI':
                providerLogo.src = '/icons/ailogos/OpenAI200.png';
                providerLogo.alt = 'OpenAI Logo';
                break;
            case 'Google':
                providerLogo.src = '/icons/ailogos/Gemini200.png';
                providerLogo.alt = 'Google Logo';
                break;
            case 'DeepSeek':
                providerLogo.src = '/icons/ailogos/deepseek200.png';
                providerLogo.alt = 'DeepSeek Logo';
                break;
            case 'xAI':
                providerLogo.src = '/icons/ailogos/grok200.png';
                providerLogo.alt = 'xAI Logo';
                break;
            default:
                providerLogo.src = '';
                providerLogo.alt = '';
        }
        
        document.querySelector('.model-name').textContent = `${modelDisplayName} Output:`;
    }

    function clearOutput() {
        responseDiv.innerHTML = '';
        popupState.outputText = '';
        updateOutputCounts('');
        saveState();
    }

    function saveState() {
        chrome.storage.local.set(popupState);
    }

    function restoreState() {
        chrome.storage.local.get(null, (data) => {
            if (data.inputText !== undefined) popupState.inputText = data.inputText;
            if (data.selectedModel !== undefined) popupState.selectedModel = data.selectedModel;
            if (data.selectedPersonality !== undefined) popupState.selectedPersonality = data.selectedPersonality;
            if (data.outputText !== undefined) popupState.outputText = data.outputText;
            if (data.theme !== undefined) popupState.theme = data.theme;
            applyStateToUI();
        });
    }

    function applyStateToUI() {
        textInput.value = popupState.inputText;
        modelSelect.value = popupState.selectedModel;
        personalitySelect.value = popupState.selectedPersonality;
        setHtmlContent(responseDiv, processChainOfThought(popupState.outputText));
        updateOutputLabel(popupState.selectedModel);
        updateCharCount();
        updateOutputCounts(popupState.outputText);
    }

    async function processText() {
        const { inputText, selectedPersonality, selectedModel } = popupState;
        
        if (streamController) {
            streamController.abort();
        }
        streamController = new AbortController();

        weaveButton.disabled = true;
        modelSelect.disabled = true;
        personalitySelect.disabled = true;
        startStreaming();

        try {
            const port = chrome.runtime.connect({ name: "streamConnection" });
            
            port.onMessage.addListener((message) => {
                if (message.type === 'stream') {
                    appendStreamChunk(message.chunk);
                } else if (message.type === 'end') {
                    endStreaming();
                    popupState.outputText = responseDiv.textContent;
                    saveState();
                    weaveButton.disabled = false;
                    modelSelect.disabled = false;
                    personalitySelect.disabled = false;
                    streamController = null;
                }
            });

            port.postMessage({
                action: "processText",
                text: inputText,
                personality: selectedPersonality,
                model: selectedModel
            });

        } catch (error) {
            console.error('Streaming error:', error);
            endStreaming();
            responseDiv.textContent = 'An error occurred while processing your request.';
            weaveButton.disabled = false;
            modelSelect.disabled = false;
            personalitySelect.disabled = false;
            streamController = null;
        }
    }

    weaveButton.addEventListener('click', processText);

    textInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            processText();
        }
    });

    copyButton.addEventListener('click', () => {
        // Get text content while preserving markdown
        const textToCopy = responseDiv.textContent
            .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```$1```')
            .replace(/<code>(.*?)<\/code>/g, '`$1`')
            .replace(/<strong><em>(.*?)<\/em><\/strong>/g, '***$1***')
            .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
            .replace(/<em>(.*?)<\/em>/g, '*$1*')
            .replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)')
            .replace(/<h([1-6])>(.*?)<\/h\1>/g, (_, level, content) => '#'.repeat(level) + ' ' + content)
            .replace(/<span class="hashtag">#(.*?)<\/span>/g, '##$1##');
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const icon = copyButton.querySelector('.material-icons-round');
            icon.textContent = 'check';
            setTimeout(() => {
                icon.textContent = 'content_copy';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text to clipboard.');
        });
    });

    clearButton.addEventListener('click', clearOutput);
    themeToggle.addEventListener('click', toggleTheme);

    textInput.addEventListener('input', () => {
        popupState.inputText = textInput.value;
        updateCharCount();
        saveState();
    });

    modelSelect.addEventListener('change', () => {
        popupState.selectedModel = modelSelect.value;
        saveState();
    });

    personalitySelect.addEventListener('change', () => {
        popupState.selectedPersonality = personalitySelect.value;
        // Also save to sync storage to persist across popup opens
        chrome.storage.sync.set({ selectedPersonality: personalitySelect.value });
        saveState();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getText" && request.text) {
            // Only clear output if the input text has changed
            if (request.text !== popupState.inputText) {
                popupState.inputText = request.text;
                popupState.outputText = "";
                responseDiv.innerHTML = '';
                updateOutputCounts('');
            } else {
                popupState.inputText = request.text;
            }
            saveState();
            applyStateToUI();
        }
    });

    initializeTheme();
    restoreState();

    // Get the stored text when popup opens
    chrome.runtime.sendMessage({ action: "getText" }, (response) => {
        if (response && response.text) {
            textInput.value = response.text;
            popupState.inputText = response.text;
            updateCharCount();
            saveState();

            // Only auto-weave if opened from context menu
            if (shouldAutoWeave && !autoWeaveInitiated && !weaveButton.disabled) {
                autoWeaveInitiated = true;
                // Small delay to ensure model list and other components are loaded
                setTimeout(() => {
                    weaveButton.click();
                }, 500);
            }
        }
    });

    // Check API keys and initialize models
    chrome.storage.sync.get(['openaiApiKey', 'deepseekApiKey', 'grokApiKey', 'geminiApiKey', 'modelVisibility', 'modelProviderOrder'], (result) => {
        const openaiApiKeyPresent = !!result.openaiApiKey;
        const deepseekApiKeyPresent = !!result.deepseekApiKey;
        const grokApiKeyPresent = !!result.grokApiKey;
        const geminiApiKeyPresent = !!result.geminiApiKey;
        const modelVisibility = result.modelVisibility || {};
        const providerOrder = result.modelProviderOrder || ['OpenAI', 'Google', 'xAI', 'DeepSeek'];

        if (openaiApiKeyPresent || deepseekApiKeyPresent || grokApiKeyPresent || geminiApiKeyPresent) {
            modelSelect.disabled = false;
            weaveButton.disabled = false;
            optionsHint.textContent = '';

            chrome.runtime.sendMessage({ action: "getModelList" }, (response) => {
                if (response && response.models) {
                    const sortedModels = [...response.models]
                        // Filter out hidden models
                        .filter(model => modelVisibility[model.value] !== false)
                        .sort((a, b) => {
                            // Extract provider names from model names
                            const aProvider = a.name.match(/\((.*?)\)$/)[1];
                            const bProvider = b.name.match(/\((.*?)\)$/)[1];
                            // Get index from provider order
                            const aIndex = providerOrder.indexOf(aProvider);
                            const bIndex = providerOrder.indexOf(bProvider);
                            // Sort by provider order
                            return aIndex - bIndex;
                        });

                    modelSelect.innerHTML = sortedModels
                        .map(model => `<option value="${model.value}">${model.name}</option>`)
                        .join('');

                    // Update selected model
                    chrome.storage.local.get(['selectedModel'], (data) => {
                        if (data.selectedModel && sortedModels.some(model => model.value === data.selectedModel)) {
                            popupState.selectedModel = data.selectedModel;
                        } else if (sortedModels.length > 0) {
                            popupState.selectedModel = sortedModels[0].value;
                        }
                        saveState();
                        applyStateToUI();
                    });
                }
            });
        } else {
            optionsHint.textContent = 'API keys required. Open extension settings to add them.';
            weaveButton.disabled = true;
            modelSelect.disabled = true;
            alert('API keys are not configured. Please open the extension options page to enter your API keys.');
        }
    });

    // Initialize personality select with default archetypes
    const defaultArchetypes = {
        'Summarizer': 'Summarize the following text concisely...',
        'Notetaker': 'Create concise and well-formatted notes...',
        'Formalizer': 'Rewrite the following text to be more formal...',
        'Explain Code': 'Explain the following code snippet in detail...',
        'Explain Like I\'m 5': 'Explain the following text as if you were talking to a five-year-old...'
    };

    function updatePersonalitySelect() {
        chrome.storage.sync.get(['archetypePrompts', 'archetypeVisibility', 'selectedPersonality', 'archetypeOrder'], (result) => {
            const prompts = result.archetypePrompts || defaultArchetypes;
            const visibility = result.archetypeVisibility || {};
            const order = result.archetypeOrder || [];
            
            // Save current selection
            const currentSelection = personalitySelect.value;
            
            // Clear existing options except the default "None" option
            while (personalitySelect.options.length > 1) {
                personalitySelect.remove(1);
            }
            
            // Sort archetypes based on saved order
            const sortedArchetypes = [
                ...order.filter(name => prompts[name] !== undefined),
                ...Object.keys(prompts).filter(name => !order.includes(name))
            ];
            
            // Add visible archetypes in the correct order
            sortedArchetypes
                .filter(archetype => visibility[archetype] !== false)
                .forEach(archetype => {
                    const option = document.createElement('option');
                    option.value = archetype;
                    option.textContent = archetype;
                    personalitySelect.appendChild(option);
                });
            
            // First try to restore the saved selection from storage
            const savedSelection = result.selectedPersonality;
            if (savedSelection && Array.from(personalitySelect.options).some(opt => opt.value === savedSelection)) {
                personalitySelect.value = savedSelection;
                popupState.selectedPersonality = savedSelection;
            }
            // If no saved selection or it's not available, try to keep current selection
            else if (currentSelection && Array.from(personalitySelect.options).some(opt => opt.value === currentSelection)) {
                personalitySelect.value = currentSelection;
                popupState.selectedPersonality = currentSelection;
            }
            // Otherwise default to "None"
            else {
                personalitySelect.value = 'None';
                popupState.selectedPersonality = 'None';
            }
            
            saveState();
            console.log('Updated personality select with ordered archetypes:', sortedArchetypes, 'Selected:', personalitySelect.value);
        });
    }

    // Update personality select when popup opens and when storage changes
    updatePersonalitySelect();

    // Listen for archetype updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "archetypesUpdated" || request.action === "updatePopupArchetypes") {
            console.log('Received archetypesUpdated message');
            updatePersonalitySelect();
        }
    });

    // Update when storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && (changes.archetypePrompts || changes.archetypeVisibility)) {
            console.log('Storage changed, updating personality select');
            updatePersonalitySelect();
        }
    });

    if (archetypePrompt) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'preview-content';
        archetypePrompt.parentNode.insertBefore(previewDiv, archetypePrompt.nextSibling);
        setupRealtimeFormatting(archetypePrompt, previewDiv);
    }

    // Function to update archetype dropdown with correct order
    function updateArchetypeDropdown() {
        chrome.storage.sync.get(['archetypePrompts', 'archetypeVisibility', 'archetypeOrder', 'modelVisibility', 'modelProviderOrder'], (result) => {
            const prompts = result.archetypePrompts || {};
            const visibility = result.archetypeVisibility || {};
            const order = result.archetypeOrder || [];
            const modelVisibility = result.modelVisibility || {};
            const providerOrder = result.modelProviderOrder || ['OpenAI', 'Google', 'xAI', 'DeepSeek'];
            const select = document.getElementById('archetype-select');
            const enhanceModelSelect = document.getElementById('enhance-model-select');
            
            if (enhanceModelSelect) {
                // Get models from background
                chrome.runtime.sendMessage({ action: "getModelList" }, (response) => {
                    if (response && response.models) {
                        const sortedModels = [...response.models]
                            // Filter out hidden models
                            .filter(model => modelVisibility[model.value] !== false)
                            .sort((a, b) => {
                                // Extract provider names from model names
                                const aProvider = a.name.match(/\((.*?)\)$/)[1];
                                const bProvider = b.name.match(/\((.*?)\)$/)[1];
                                // Get index from provider order
                                const aIndex = providerOrder.indexOf(aProvider);
                                const bIndex = providerOrder.indexOf(bProvider);
                                // Sort by provider order
                                return aIndex - bIndex;
                            });

                        // Update the enhance model select
                        enhanceModelSelect.innerHTML = sortedModels
                            .map(model => {
                                const name = model.name
                                    .replace(' (OpenAI)', '')
                                    .replace(' (DeepSeek)', '')
                                    .replace(' (xAI)', '')
                                    .replace(' (Google)', '')
                                    .replace('Gemini ', '')
                                    .replace('-Lite', ' Lite');
                                return `<option value="${model.value}">${name}</option>`;
                            })
                            .join('');
                    }
                });
            }
            
            // Clear existing options except "None"
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Sort archetypes based on saved order
            const sortedArchetypes = [
                ...order.filter(name => prompts[name] !== undefined),
                ...Object.keys(prompts).filter(name => !order.includes(name))
            ];
            
            // Add visible archetypes in the correct order
            sortedArchetypes
                .filter(name => visibility[name] !== false)
                .forEach(name => {
                    const option = document.createElement('option');
                    option.value = prompts[name];
                    option.textContent = name;
                    select.appendChild(option);
                });
        });
    }

    // Initial load of archetypes
    updateArchetypeDropdown();

    // Add listener for model visibility and order updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "modelVisibilityUpdated" || request.action === "modelProviderOrderUpdated") {
            // Update both the main model select and archetype editor model select
            updateModelSelects();
        }
    });

    function updateModelSelects() {
        chrome.storage.sync.get(['modelVisibility', 'modelProviderOrder'], (result) => {
            const modelVisibility = result.modelVisibility || {};
            const providerOrder = result.modelProviderOrder || ['OpenAI', 'Google', 'xAI', 'DeepSeek'];

            // Get models from background
            chrome.runtime.sendMessage({ action: "getModelList" }, (response) => {
                if (response && response.models) {
                    const sortedModels = [...response.models]
                        // Filter out hidden models
                        .filter(model => modelVisibility[model.value] !== false)
                        .sort((a, b) => {
                            // Extract provider names from model names
                            const aProvider = a.name.match(/\((.*?)\)$/)[1];
                            const bProvider = b.name.match(/\((.*?)\)$/)[1];
                            // Get index from provider order
                            const aIndex = providerOrder.indexOf(aProvider);
                            const bIndex = providerOrder.indexOf(bProvider);
                            // Sort by provider order
                            return aIndex - bIndex;
                        });

                    // Update the main model select
                    if (modelSelect) {
                        modelSelect.innerHTML = sortedModels
                            .map(model => `<option value="${model.value}">${model.name}</option>`)
                            .join('');
                    }

                    // Update the enhance model select in archetype editor if it exists
                    const enhanceModelSelect = document.getElementById('enhance-model-select');
                    if (enhanceModelSelect) {
                        enhanceModelSelect.innerHTML = sortedModels
                            .map(model => {
                                const name = model.name
                                    .replace(' (OpenAI)', '')
                                    .replace(' (DeepSeek)', '')
                                    .replace(' (xAI)', '')
                                    .replace(' (Google)', '')
                                    .replace('Gemini ', '')
                                    .replace('-Lite', ' Lite');
                                return `<option value="${model.value}">${name}</option>`;
                            })
                            .join('');
                    }

                    // Ensure a valid model is selected
                    if (!Array.from(modelSelect.options).some(opt => opt.value === popupState.selectedModel)) {
                        if (modelSelect.options.length > 0) {
                            popupState.selectedModel = modelSelect.options[0].value;
                            saveState();
                            applyStateToUI();
                        }
                    }
                }
            });
        });
    }
});