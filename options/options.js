document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    
    // Theme toggle functionality
    function toggleTheme() {
        const newTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        document.body.classList.toggle('light-theme');
        themeToggle.querySelector('.material-icons-round').textContent = newTheme === 'light' ? 'dark_mode' : 'light_mode';
        chrome.storage.local.set({ theme: newTheme });
    }

    // Initialize theme
    chrome.storage.local.get(['theme'], (result) => {
        if (result.theme) {
            if (result.theme === 'light') {
                document.body.classList.add('light-theme');
                themeToggle.querySelector('.material-icons-round').textContent = 'dark_mode';
            }
        }
    });

    // Add theme toggle click handler
    themeToggle.addEventListener('click', toggleTheme);

    const saveKeysButton = document.getElementById('save-keys-button');
    const archetypesList = document.querySelector('.archetypes-list');
    const newArchetypeInput = document.getElementById('new-archetype');
    const addArchetypeButton = document.getElementById('add-archetype-button');
    const archetypeEditor = document.getElementById('archetype-editor');
    const archetypePrompt = document.getElementById('archetype-prompt');
    const editingArchetypeName = document.getElementById('editing-archetype-name');
    const saveArchetypeButton = document.getElementById('save-archetype');
    const cancelEditButton = document.getElementById('cancel-edit');
    const enhanceArchetypeButton = document.getElementById('enhance-archetype');
    const enhanceModelSelect = document.getElementById('enhance-model');

    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(tabId) {
        // Update tab buttons
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabId);
        });

        // Update tab contents
        tabContents.forEach(content => {
            if (content.id === `${tabId}-tab`) {
                content.classList.add('active');
                // Trigger animation
                requestAnimationFrame(() => {
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                });
            } else {
                content.classList.remove('active');
                content.style.opacity = '0';
                content.style.transform = 'translateY(10px)';
            }
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.tab);
        });
    });

    // Default archetypes with their prompts
    const defaultArchetypes = {
        'Summarizer': 'Summarize the following text concisely, focusing on the core message and main arguments. Aim for brevity and clarity, extracting only the most important information and removing unnecessary details. Maintain the original tone where possible, but prioritize conciseness above all else:',
        'Notetaker': 'Create concise and well-formatted notes from the following text, using bullet points. Focus on capturing the key concepts and information in an understandable way, without getting overly technical or verbose. Aim for clarity, brevity, and good organization:',
        'Formalizer': 'Rewrite the following text to be more formal and professional in tone. Enhance clarity, improve sentence structure, and ensure sophisticated vocabulary. Remove any casual language, slang, or overly colloquial expressions. Aim for a style appropriate for business correspondence, academic writing, or formal reports. Maintain the original meaning and depth, but elevate the language to a more refined register:',
        'Explain Code': 'Explain the following code snippet in detail. Break down the code step-by-step, explaining what each part of the code does, its purpose, and how it contributes to the overall functionality. Assume the reader has some basic programming knowledge but may not be familiar with the specific language or libraries used. Clarify any complex algorithms, data structures, or programming concepts involved. Provide clear and concise explanations for each line or block of code to ensure a comprehensive understanding of the code\'s behavior:',
        'Explain Like I\'m 5': 'Explain the following text as if you were talking to a five-year-old child. Use very simple words, short sentences, and relatable examples or analogies that a young child would understand. Avoid jargon, complex vocabulary, and abstract concepts. Focus on conveying the basic idea or core concept in the most straightforward and accessible way possible. Imagine you are explaining this to someone who knows very little about the topic:',
        'Socratic Seminar Lead': 'Generate a series of open-ended, probing questions based on the following text. These questions should encourage critical thinking, deeper exploration of the text\'s themes, and diverse perspectives. The questions should be suitable for leading a Socratic seminar-style discussion, prompting participants to engage with the text, challenge assumptions, and explore different interpretations. Focus on questions that have no single \'right\' answer and stimulate thoughtful dialogue and inquiry:',
        'LinkedInese': 'Rewrite the following text for LinkedIn, but with a heavy dose of irony and satire. Exaggerate the professional tone, enthusiasm, and business buzzwords to an absurd degree, highlighting the often hollow and performative nature of LinkedIn content. Emphasize career growth, networking, and innovation in an over-the-top, ridiculous way. The goal is to create a LinkedIn-style post that is clearly satirical and humorous through its excessive and insincere professionalism:',
        'Reply Guy': 'Analyze the tone, style, and perspective of the following text. Then, write a reply to this text as if you were a "Reply Guy" on Twitter or Instagram, in a relatively dishevled stream of consiousness way. Your reply should be in the style of someone who frequently comments on posts for exposure, often adding their own take, agreeing or disagreeing, or offering a slightly different angle, while sounding like it naturally fits within a conversation with the original author. Keep the reply relatively brief and to-the-point, as is typical of social media replies, but aim to foster interesting discussion. Be philisophical/socratic when warranted. Only print the reply -- and do not use hashtags. Never use emojis.:',
        'Schizophrenic Tweeter': 'Create an engaging, potentially viral tweet from the following text. Embrace unexpected juxtapositions and non-sequiturs. Do not use hashtags or emojis. It\'s okay if the tweet is longer than normal if needed to get the idea across, but prefer to keep it wihtin character limit. Aim for punchy intellectual, philisophical or psychological humor, or a thought provoking stream of consiousness:'
    };

    const enhanceSystemPrompts = {
        hone: `You are a master of concise, precise system prompts. Your task is to refine the provided archetype prompt titled "{archetype}" into a more direct and efficient version while preserving its core intent. The output must use only plain text - no special characters, no formatting, no symbols, no markdown, no bullets, no numbers. Make it clear and unambiguous but remove all unnecessary words. Focus on essential requirements and constraints from the original prompt: "{prompt}". Include only critical edge cases and format requirements. Aim for maximum clarity with minimum words. Output ONLY the refined prompt with no other text.`,
        
        flesh: `You are an eloquent system prompt architect with a gift for comprehensive instruction design. Your mission is to expand and enrich the provided archetype prompt titled "{archetype}" while maintaining its fundamental purpose, staying within a strict 150-word limit. Starting from the original: "{prompt}", develop a more detailed and nuanced version that:

1. Elaborates on the core objectives with rich, descriptive language
2. Anticipates and addresses key edge cases
3. Provides guidance on tone, style, and approach
4. Includes essential format specifications
5. Uses sophisticated language while being precise

IMPORTANT: Use only plain text in your response - no special characters, no formatting, no symbols, no markdown, no bullets, no numbers. Your enhanced prompt must be EXACTLY 150 WORDS OR LESS. This is a hard requirement. Output ONLY the enhanced prompt with no other text.`
    };

    let currentlyEditing = null;
    let currentEnhancePort = null;

    // Add word counter function
    function countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    // Add word counter update function
    function updateWordCount() {
        const text = archetypePrompt.value;
        const wordCount = countWords(text);
        const wordCountDisplay = document.getElementById('word-count');
        const isOverLimit = wordCount > 150;
        
        wordCountDisplay.textContent = `${wordCount}/150 words`;
        wordCountDisplay.style.color = isOverLimit ? 'var(--error)' : 'var(--text-secondary)';
        saveArchetypeButton.disabled = isOverLimit;
    }

    // Load saved keys and archetypes on options page load
    chrome.storage.sync.get(['openaiApiKey', 'deepseekApiKey', 'grokApiKey', 'geminiApiKey', 'archetypePrompts', 'archetypeVisibility', 'modelVisibility'], (result) => {
        document.getElementById('openai-api-key').value = result.openaiApiKey || '';
        document.getElementById('deepseek-api-key').value = result.deepseekApiKey || '';
        document.getElementById('grok-api-key').value = result.grokApiKey || '';
        document.getElementById('gemini-api-key').value = result.geminiApiKey || '';
        
        // Initialize archetypes with prompts
        const savedPrompts = result.archetypePrompts || defaultArchetypes;
        const savedVisibility = result.archetypeVisibility || {};
        renderArchetypes(Object.keys(savedPrompts));

        // Load available models and initialize model visibility
        loadAvailableModels();
        initializeModelVisibility(result.modelVisibility || {});
    });

    function loadAvailableModels() {
        chrome.runtime.sendMessage({ action: "getModelList" }, (response) => {
            if (response && response.models && response.models.length > 0) {
                const truncatedModels = response.models.map(model => {
                    // Extract just the model name without version or provider
                    const name = model.name
                        .replace(' (OpenAI)', '')
                        .replace(' (DeepSeek)', '')
                        .replace(' (xAI)', '')
                        .replace(' (Google)', '')
                        .replace('Gemini ', '')
                        .replace('-Lite', ' Lite');
                    return { ...model, displayName: name };
                });
                
                enhanceModelSelect.innerHTML = truncatedModels
                    .map(model => `<option value="${model.value}">${model.displayName}</option>`)
                    .join('');

                // Initialize model visibility management with saved order
                chrome.storage.sync.get(['modelProviderOrder'], (result) => {
                    const savedOrder = result.modelProviderOrder || ['OpenAI', 'Google', 'xAI', 'DeepSeek'];
                    renderModelVisibilityGroups(response.models, savedOrder);
                });
            }
        });
    }

    function initializeModelVisibility(savedVisibility) {
        // Store the initial visibility state
        window.modelVisibility = savedVisibility;
    }

    function renderModelVisibilityGroups(models, providerOrder) {
        const modelGroups = {};
        const providerLogos = {
            'OpenAI': '/icons/ailogos/OpenAI200.png',
            'Google': '/icons/ailogos/Gemini200.png',
            'DeepSeek': '/icons/ailogos/deepseek200.png',
            'xAI': '/icons/ailogos/grok200.png'
        };

        // Group models by provider
        models.forEach(model => {
            const provider = model.name.match(/\((.*?)\)$/)[1];
            if (!modelGroups[provider]) {
                modelGroups[provider] = [];
            }
            modelGroups[provider].push(model);
        });

        const container = document.getElementById('model-visibility-groups');
        container.innerHTML = '';

        // Create provider groups in specified order
        providerOrder.forEach(provider => {
            if (modelGroups[provider]) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'model-provider-group';
                groupDiv.draggable = true;
                groupDiv.dataset.provider = provider;

                // Add drag handle
                const dragHandle = document.createElement('div');
                dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '<span class="material-icons-round">drag_indicator</span>';

                // Add provider header with logo
                const headerDiv = document.createElement('div');
                headerDiv.className = 'provider-header';
                headerDiv.innerHTML = `
                    <div class="provider-info">
                        <img src="${providerLogos[provider]}" alt="${provider} Logo" class="provider-logo">
                        <span class="provider-name">${provider}</span>
                    </div>
                `;
                headerDiv.insertBefore(dragHandle, headerDiv.firstChild);
                groupDiv.appendChild(headerDiv);

                // Add model list
                const modelList = document.createElement('div');
                modelList.className = 'model-list';
                modelList.dataset.provider = provider;

                modelGroups[provider].forEach(model => {
                    const isVisible = window.modelVisibility[model.value] !== false;
                    const modelItem = document.createElement('div');
                    modelItem.className = 'model-item';
                    modelItem.draggable = true;
                    modelItem.dataset.modelId = model.value;
                    modelItem.innerHTML = `
                        <div class="model-drag-handle">
                            <span class="material-icons-round">drag_indicator</span>
                        </div>
                        <span class="model-name">${model.name}</span>
                        <button class="model-visibility-toggle" data-model="${model.value}" title="${isVisible ? 'Hide from dropdowns' : 'Show in dropdowns'}">
                            <span class="material-icons-round">${isVisible ? 'visibility' : 'visibility_off'}</span>
                        </button>
                    `;

                    // Add click handler for visibility toggle
                    const toggleButton = modelItem.querySelector('.model-visibility-toggle');
                    toggleButton.addEventListener('click', () => toggleModelVisibility(model.value, toggleButton));

                    // Add drag and drop handlers for models
                    modelItem.addEventListener('dragstart', handleModelDragStart);
                    modelItem.addEventListener('dragend', handleModelDragEnd);
                    modelItem.addEventListener('dragover', handleModelDragOver);
                    modelItem.addEventListener('drop', handleModelDrop);

                    modelList.appendChild(modelItem);
                });

                groupDiv.appendChild(modelList);

                // Add drag and drop event listeners for provider groups
                groupDiv.addEventListener('dragstart', handleProviderDragStart);
                groupDiv.addEventListener('dragend', handleProviderDragEnd);
                groupDiv.addEventListener('dragover', handleProviderDragOver);
                groupDiv.addEventListener('drop', handleProviderDrop);

                container.appendChild(groupDiv);
            }
        });
    }

    // Model drag and drop handlers
    let draggedModel = null;

    function handleModelDragStart(e) {
        draggedModel = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.modelId);
        // Stop event propagation to prevent provider drag
        e.stopPropagation();
    }

    function handleModelDragEnd(e) {
        this.classList.remove('dragging');
        draggedModel = null;
        e.stopPropagation();
    }

    function handleModelDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Only allow dropping within the same provider group
        const sourceProvider = draggedModel.closest('.model-list').dataset.provider;
        const targetProvider = this.closest('.model-list').dataset.provider;
        
        if (sourceProvider === targetProvider) {
            const bounding = this.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            
            if (e.clientY - offset > 0) {
                this.style.borderBottom = '2px solid var(--accent)';
                this.style.borderTop = '';
            } else {
                this.style.borderTop = '2px solid var(--accent)';
                this.style.borderBottom = '';
            }
        }
        
        e.stopPropagation();
    }

    function handleModelDrop(e) {
        e.preventDefault();
        this.style.borderTop = '';
        this.style.borderBottom = '';
        
        // Only allow dropping within the same provider group
        const sourceProvider = draggedModel.closest('.model-list').dataset.provider;
        const targetProvider = this.closest('.model-list').dataset.provider;
        
        if (draggedModel === this || sourceProvider !== targetProvider) return;
        
        const modelList = this.parentNode;
        const bounding = this.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        const shouldInsertAfter = e.clientY - offset > 0;
        
        if (shouldInsertAfter) {
            modelList.insertBefore(draggedModel, this.nextSibling);
        } else {
            modelList.insertBefore(draggedModel, this);
        }
        
        e.stopPropagation();
    }

    // Provider drag and drop handlers
    let draggedProvider = null;

    function handleProviderDragStart(e) {
        draggedProvider = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.provider);
    }

    function handleProviderDragEnd(e) {
        this.classList.remove('dragging');
        draggedProvider = null;
        
        // Save the new order
        saveProviderOrder();
    }

    function handleProviderDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const bounding = this.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        
        if (e.clientY - offset > 0) {
            this.style.borderBottom = '2px solid var(--accent)';
            this.style.borderTop = '';
        } else {
            this.style.borderTop = '2px solid var(--accent)';
            this.style.borderBottom = '';
        }
    }

    function handleProviderDrop(e) {
        e.preventDefault();
        this.style.borderTop = '';
        this.style.borderBottom = '';
        
        if (draggedProvider === this) return;
        
        const container = document.getElementById('model-visibility-groups');
        const bounding = this.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        const shouldInsertAfter = e.clientY - offset > 0;
        
        if (shouldInsertAfter) {
            this.parentNode.insertBefore(draggedProvider, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedProvider, this);
        }
        
        saveProviderOrder();
    }

    function saveProviderOrder() {
        const container = document.getElementById('model-visibility-groups');
        const newOrder = Array.from(container.children).map(group => 
            group.dataset.provider
        );
        
        // Save to storage and update constants
        chrome.storage.sync.set({ modelProviderOrder: newOrder }, () => {
            // Notify that provider order has changed
            chrome.runtime.sendMessage({ 
                action: "modelProviderOrderUpdated",
                order: newOrder
            });

            // Notify all tabs about the update
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "modelProviderOrderUpdated",
                        order: newOrder
                    }).catch(() => {
                        // Silently ignore errors for inactive tabs
                        console.debug(`Tab ${tab.id} not ready for messages`);
                    });
                });
            });

            // Update the archetype editor's model select immediately
            chrome.runtime.sendMessage({ action: "getModelList" }, (response) => {
                if (response && response.models) {
                    const enhanceModelSelect = document.getElementById('enhance-model');
                    if (enhanceModelSelect) {
                        const truncatedModels = response.models.map(model => {
                            const name = model.name
                                .replace(' (OpenAI)', '')
                                .replace(' (DeepSeek)', '')
                                .replace(' (xAI)', '')
                                .replace(' (Google)', '')
                                .replace('Gemini ', '')
                                .replace('-Lite', ' Lite');
                            return { ...model, displayName: name };
                        });
                        
                        enhanceModelSelect.innerHTML = truncatedModels
                            .map(model => `<option value="${model.value}">${model.displayName}</option>`)
                            .join('');
                    }
                }
            });
        });
    }

    function toggleModelVisibility(modelId, button) {
        const isCurrentlyVisible = window.modelVisibility[modelId] !== false;
        window.modelVisibility[modelId] = !isCurrentlyVisible;

        // Update button state
        button.innerHTML = `<span class="material-icons-round">${window.modelVisibility[modelId] ? 'visibility' : 'visibility_off'}</span>`;
        button.title = window.modelVisibility[modelId] ? 'Hide from dropdowns' : 'Show in dropdowns';

        // Save to storage
        chrome.storage.sync.set({ modelVisibility: window.modelVisibility }, () => {
            // Notify that model visibility has changed
            chrome.runtime.sendMessage({ 
                action: "modelVisibilityUpdated",
                visibility: window.modelVisibility
            });
        });
    }

    function renderArchetypes(archetypes) {
        chrome.storage.sync.get(['archetypeOrder'], (result) => {
            const order = result.archetypeOrder || [];
            
            // Sort archetypes based on saved order, putting new items at the end
            const sortedArchetypes = [
                ...order.filter(name => archetypes.includes(name)),
                ...archetypes.filter(name => !order.includes(name))
            ];
            
            archetypesList.innerHTML = '';
            sortedArchetypes.forEach(archetype => {
                const archetypeItem = createArchetypeItem(archetype);
                archetypesList.appendChild(archetypeItem);
            });
        });
    }

    function createArchetypeItem(archetype) {
        const item = document.createElement('div');
        item.className = 'archetype-item';
        item.draggable = true;
        
        // Add drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<span class="material-icons-round">drag_indicator</span>';
        item.appendChild(dragHandle);
        
        const name = document.createElement('span');
        name.className = 'archetype-name';
        name.textContent = archetype;
        name.addEventListener('click', () => editArchetype(archetype));
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'archetype-buttons';

        // Get visibility state
        chrome.storage.sync.get(['archetypeVisibility'], (result) => {
            const visibility = result.archetypeVisibility || {};
            const isVisible = visibility[archetype] !== false;
            
            const visibilityButton = document.createElement('button');
            visibilityButton.className = 'icon-button visibility-toggle';
            visibilityButton.title = isVisible ? 'Hide from dropdown' : 'Show in dropdown';
            visibilityButton.innerHTML = `<span class="material-icons-round">${isVisible ? 'visibility' : 'visibility_off'}</span>`;
            visibilityButton.addEventListener('click', () => toggleArchetypeVisibility(archetype, visibilityButton));
            
            const copyButton = document.createElement('button');
            copyButton.className = 'icon-button copy-archetype';
            copyButton.title = 'Copy archetype';
            copyButton.innerHTML = '<span class="material-icons-round">content_copy</span>';
            copyButton.addEventListener('click', () => copyArchetype(archetype));
            
            const removeButton = document.createElement('button');
            removeButton.className = 'icon-button remove-archetype';
            removeButton.title = 'Remove archetype';
            removeButton.innerHTML = '<span class="material-icons-round">delete</span>';
            removeButton.addEventListener('click', () => removeArchetype(archetype));
            
            buttonsContainer.appendChild(visibilityButton);
            buttonsContainer.appendChild(copyButton);
            buttonsContainer.appendChild(removeButton);
        });
        
        item.appendChild(name);
        item.appendChild(buttonsContainer);

        // Add drag event listeners
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);

        return item;
    }

    // Drag and drop handlers
    let draggedItem = null;

    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.querySelector('.archetype-name').textContent);
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        draggedItem = null;
        saveArchetypeOrder();
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const bounding = this.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        
        if (e.clientY - offset > 0) {
            this.style.borderBottom = '2px solid var(--accent)';
            this.style.borderTop = '';
        } else {
            this.style.borderTop = '2px solid var(--accent)';
            this.style.borderBottom = '';
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        this.style.borderTop = '';
        this.style.borderBottom = '';
        
        if (draggedItem === this) return;
        
        const bounding = this.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        const shouldInsertAfter = e.clientY - offset > 0;
        
        if (shouldInsertAfter) {
            this.parentNode.insertBefore(draggedItem, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedItem, this);
        }
        
        saveArchetypeOrder();
    }

    function saveArchetypeOrder() {
        const archetypes = Array.from(archetypesList.children).map(item => 
            item.querySelector('.archetype-name').textContent
        );
        
        chrome.storage.sync.get(['archetypePrompts', 'archetypeVisibility'], (result) => {
            const prompts = result.archetypePrompts || {};
            const visibility = result.archetypeVisibility || {};
            
            // Save the order and update all related storage
            chrome.storage.sync.set({ 
                archetypeOrder: archetypes,
                archetypePrompts: prompts,
                archetypeVisibility: visibility
            }, () => {
                // Update the chat archetype selector if it exists
                if (chatArchetypeSelect) {
                    updateChatArchetypes();
                }
                
                // Notify all components about the update
                try {
                    // Notify background script
                    chrome.runtime.sendMessage({ 
                        action: "archetypesUpdated",
                        order: archetypes,
                        prompts: prompts,
                        visibility: visibility
                    });
                    
                    // Notify all tabs including popup
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, { 
                                action: "archetypesUpdated",
                                order: archetypes,
                                prompts: prompts,
                                visibility: visibility
                            }).catch(() => {
                                // Silently ignore errors for inactive tabs
                                console.debug(`Tab ${tab.id} not ready for messages`);
                            });
                        });
                    });
                    
                    // Update any open popups
                    chrome.runtime.sendMessage({ 
                        action: "updatePopupArchetypes",
                        order: archetypes,
                        prompts: prompts,
                        visibility: visibility
                    });
                } catch (e) {
                    console.debug('Could not notify all components:', e);
                }
            });
        });
    }

    function toggleArchetypeVisibility(archetype, button) {
        chrome.storage.sync.get(['archetypeVisibility'], (result) => {
            const visibility = result.archetypeVisibility || {};
            const isCurrentlyVisible = visibility[archetype] !== false;
            
            // Toggle visibility
            visibility[archetype] = !isCurrentlyVisible;
            
            // Update storage
            chrome.storage.sync.set({ archetypeVisibility: visibility }, () => {
                // Update button icon
                button.innerHTML = `<span class="material-icons-round">${visibility[archetype] ? 'visibility' : 'visibility_off'}</span>`;
                button.title = visibility[archetype] ? 'Hide from dropdown' : 'Show in dropdown';
            });
        });
    }

    function copyArchetype(archetype) {
        chrome.storage.sync.get(['archetypePrompts', 'archetypeVisibility'], (result) => {
            const prompts = result.archetypePrompts || defaultArchetypes;
            const visibility = result.archetypeVisibility || {};
            let newName = `${archetype} -- Copy`;
            let counter = 1;
            
            while (prompts[newName]) {
                counter++;
                newName = `${archetype} -- Copy ${counter}`;
            }
            
            prompts[newName] = prompts[archetype];
            visibility[newName] = visibility[archetype] !== false; // Copy visibility setting
            
            chrome.storage.sync.set({ 
                archetypePrompts: prompts,
                archetypeVisibility: visibility 
            }, () => {
                renderArchetypes(Object.keys(prompts));
                editArchetype(newName);
            });
        });
    }

    async function enhanceArchetype() {
        if (!currentlyEditing) return;

        const model = enhanceModelSelect.value;
        const enhanceStyle = document.getElementById('enhance-style').value;
        
        if (!model) {
            alert('Please select an AI model for enhancement');
            return;
        }

        // Disable button and show loading state
        enhanceArchetypeButton.disabled = true;
        const originalButtonText = enhanceArchetypeButton.innerHTML;
        enhanceArchetypeButton.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Enhancing...';

        // Get current content before clearing
        const currentContent = archetypePrompt.value;

        // Clear existing text
        archetypePrompt.value = '';

        try {
            // Cleanup any existing port
            if (currentEnhancePort) {
                try {
                    currentEnhancePort.disconnect();
                } catch (e) {
                    console.log('Port already disconnected:', e);
                }
                currentEnhancePort = null;
            }

            const enhancePrompt = enhanceSystemPrompts[enhanceStyle]
                .replace('{archetype}', currentlyEditing)
                .replace('{prompt}', currentContent);

            // Create new port and store reference
            const port = chrome.runtime.connect({ name: "streamConnection" });
            currentEnhancePort = port;
            let isFirstChunk = true;
            let messageHandler;

            // Create message handler function that we can remove later
            messageHandler = (message) => {
                if (message.type === 'stream') {
                    // For first chunk, trim any potential prefixes
                    if (isFirstChunk) {
                        const cleanedChunk = message.chunk.replace(/^[^a-zA-Z]*/, '');
                        archetypePrompt.value = cleanedChunk;
                        isFirstChunk = false;
                    } else {
                        archetypePrompt.value += message.chunk;
                    }
                    
                    // Auto-scroll textarea and update word count
                    archetypePrompt.scrollTop = archetypePrompt.scrollHeight;
                    updateWordCount();
                } else if (message.type === 'end') {
                    // Clean up the final result
                    archetypePrompt.value = archetypePrompt.value.trim()
                        .replace(/^[^a-zA-Z]*/, '') // Remove any non-letter characters from start
                        .replace(/^(prompt:|enhanced:|output:)/i, '') // Remove any common prefixes
                        .trim();
                    
                    // Final word count update
                    updateWordCount();
                    cleanup();
                } else if (message.type === 'error') {
                    console.error('Enhancement error:', message.error);
                    alert('Failed to enhance archetype: ' + message.error);
                    cleanup();
                }
            };

            // Add disconnect handler
            port.onDisconnect.addListener(() => {
                console.log('Port disconnected');
                cleanup();
            });

            // Add message handler
            port.onMessage.addListener(messageHandler);

            // Function to cleanup port and UI
            function cleanup() {
                if (currentEnhancePort) {
                    try {
                        // Remove message handler to prevent memory leaks
                        currentEnhancePort.onMessage.removeListener(messageHandler);
                        currentEnhancePort.disconnect();
                    } catch (e) {
                        console.log('Cleanup error:', e);
                    }
                    currentEnhancePort = null;
                }
                enhanceArchetypeButton.disabled = false;
                enhanceArchetypeButton.innerHTML = originalButtonText;
            }

            // Send the message
            port.postMessage({
                action: "processText",
                text: enhancePrompt,
                personality: 'None',
                model: model
            });

        } catch (error) {
            console.error('Error enhancing archetype:', error);
            alert('Failed to enhance archetype. Please try again.');
            if (currentEnhancePort) {
                try {
                    currentEnhancePort.disconnect();
                } catch (e) {
                    console.log('Error disconnecting port:', e);
                }
                currentEnhancePort = null;
            }
            enhanceArchetypeButton.disabled = false;
            enhanceArchetypeButton.innerHTML = originalButtonText;
        }
    }

    // Add function to convert markdown bold to HTML
    function convertMarkdownToHtml(text) {
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    // Add function to safely set HTML content
    function setHtmlContent(element, text) {
        // Convert markdown to HTML
        const htmlContent = convertMarkdownToHtml(text);
        element.innerHTML = htmlContent;
    }

    function editArchetype(archetype) {
        chrome.storage.sync.get(['archetypePrompts'], (result) => {
            const prompts = result.archetypePrompts || defaultArchetypes;
            currentlyEditing = archetype;
            
            // Show editor before updating content to ensure smooth transition
            archetypeEditor.classList.remove('hidden');
            
            // Update editor header with edit button and word counter
            editingArchetypeName.innerHTML = `
                <div class="archetype-header">
                    <span class="archetype-title">${archetype}</span>
                    <button class="icon-button edit-name-button" title="Edit archetype name">
                        <span class="material-icons-round">edit</span>
                    </button>
                </div>
                <span id="word-count" class="word-count">0/150 words</span>
            `;

            // Add click handler for the edit button
            const editButton = editingArchetypeName.querySelector('.edit-name-button');
            editButton.addEventListener('click', () => {
                const titleSpan = editingArchetypeName.querySelector('.archetype-title');
                const currentName = titleSpan.textContent;
                
                // Create input field
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'edit-name-input';
                input.value = currentName;
                
                // Replace title with input
                titleSpan.replaceWith(input);
                input.focus();
                input.select();
                
                // Handle input events
                function handleRename() {
                    const newName = input.value.trim();
                    if (newName && newName !== currentName) {
                        renameArchetype(currentName, newName);
                    } else {
                        // Restore original title if no change
                        input.replaceWith(titleSpan);
                    }
                }
                
                input.addEventListener('blur', handleRename);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRename();
                    }
                });
                input.addEventListener('keyup', (e) => {
                    if (e.key === 'Escape') {
                        input.replaceWith(titleSpan);
                    }
                });
            });

            // Update content and handle markdown
            archetypePrompt.value = prompts[archetype] || '';
            updateWordCount(); // Initial word count update
            
            // Ensure the editor is visible and focused
            archetypePrompt.focus();
            
            // Reset any ongoing animations
            archetypeEditor.style.display = 'block';
            archetypeEditor.style.opacity = '1';
            archetypeEditor.style.transform = 'translateY(0)';
            
            // Ensure the model select is properly initialized
            if (enhanceModelSelect) {
                enhanceModelSelect.style.zIndex = '3';
            }
        });
    }

    function renameArchetype(oldName, newName) {
        chrome.storage.sync.get(['archetypePrompts', 'archetypeVisibility'], (result) => {
            const prompts = result.archetypePrompts || defaultArchetypes;
            const visibility = result.archetypeVisibility || {};
            
            if (prompts[newName]) {
                alert('An archetype with this name already exists.');
                editArchetype(oldName); // Refresh the editor with old name
                return;
            }
            
            // Copy values with new name
            prompts[newName] = prompts[oldName];
            visibility[newName] = visibility[oldName];
            
            // Remove old entries
            delete prompts[oldName];
            delete visibility[oldName];
            
            // Update storage
            chrome.storage.sync.set({ 
                archetypePrompts: prompts,
                archetypeVisibility: visibility 
            }, () => {
                currentlyEditing = newName;
                renderArchetypes(Object.keys(prompts));
                editArchetype(newName);
            });
        });
    }

    function addArchetype(archetype) {
        if (!archetype.trim()) return;
        
        chrome.storage.sync.get(['archetypePrompts'], (result) => {
            const prompts = result.archetypePrompts || defaultArchetypes;
            if (!prompts[archetype]) {
                prompts[archetype] = ''; // Initialize with empty prompt
                chrome.storage.sync.set({ archetypePrompts: prompts }, () => {
                    renderArchetypes(Object.keys(prompts));
                    newArchetypeInput.value = '';
                    editArchetype(archetype); // Open editor for new archetype
                });
            }
        });
    }

    function removeArchetype(archetype) {
        chrome.storage.sync.get(['archetypePrompts', 'archetypeVisibility'], (result) => {
            const prompts = result.archetypePrompts || defaultArchetypes;
            const visibility = result.archetypeVisibility || {};
            
            delete prompts[archetype];
            delete visibility[archetype];
            
            chrome.storage.sync.set({ 
                archetypePrompts: prompts,
                archetypeVisibility: visibility 
            }, () => {
                renderArchetypes(Object.keys(prompts));
                if (currentlyEditing === archetype) {
                    archetypeEditor.classList.add('hidden');
                    currentlyEditing = null;
                }
            });
        });
    }

    function saveArchetype() {
        if (!currentlyEditing) {
            console.error('No archetype currently being edited');
            return;
        }
        
        // Show saving state
        const saveIcon = saveArchetypeButton.querySelector('.material-icons-round');
        const originalButtonContent = saveArchetypeButton.innerHTML;
        saveArchetypeButton.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Saving...';
        saveArchetypeButton.disabled = true;
        
        chrome.storage.sync.get(['archetypePrompts', 'archetypeVisibility'], (result) => {
            const prompts = result.archetypePrompts || defaultArchetypes;
            const visibility = result.archetypeVisibility || {};
            
            // Update the prompt
            prompts[currentlyEditing] = archetypePrompt.value;
            
            // Ensure visibility is set to true for new archetypes
            if (visibility[currentlyEditing] === undefined) {
                visibility[currentlyEditing] = true;
            }
            
            chrome.storage.sync.set({ 
                archetypePrompts: prompts,
                archetypeVisibility: visibility 
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving archetype:', chrome.runtime.lastError);
                    saveArchetypeButton.innerHTML = '<span class="material-icons-round">error</span> Error';
                    setTimeout(() => {
                        saveArchetypeButton.innerHTML = originalButtonContent;
                        saveArchetypeButton.disabled = false;
                    }, 2000);
                    return;
                }
                
                // Show success message
                saveArchetypeButton.innerHTML = '<span class="material-icons-round">check</span> Saved!';
                setTimeout(() => {
                    saveArchetypeButton.innerHTML = originalButtonContent;
                    saveArchetypeButton.disabled = false;
                }, 1500);
                
                // Try to notify background script and tabs
                try {
                    chrome.runtime.sendMessage({ action: "archetypesUpdated" });
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                            if (tab.url && tab.url.startsWith('http')) {
                                chrome.tabs.sendMessage(tab.id, { action: "archetypesUpdated" })
                                    .catch(() => {
                                        // Silently ignore errors for inactive tabs
                                        console.debug(`Tab ${tab.id} not ready for messages`);
                                    });
                            }
                        });
                    });
                } catch (e) {
                    console.debug('Could not notify all components:', e);
                }
                
                // Update the list
                renderArchetypes(Object.keys(prompts));
            });
        });
    }

    function loadArchetypes() {
        chrome.storage.sync.get(['archetypePrompts', 'archetypeVisibility'], (result) => {
            const prompts = result.archetypePrompts || {};
            const visibility = result.archetypeVisibility || {};
            
            archetypesList.innerHTML = '';
            
            // Sort archetypes alphabetically
            Object.keys(prompts).sort().forEach(name => {
                const item = createArchetypeItem(name, prompts[name], visibility[name] !== false);
                archetypesList.appendChild(item);
            });
            
            console.log('Loaded archetypes:', Object.keys(prompts));
        });
    }

    cancelEditButton.addEventListener('click', () => {
        // First fade out
        archetypeEditor.style.opacity = '0';
        archetypeEditor.style.transform = 'translateY(-20px)';
        
        // Then hide after animation
        setTimeout(() => {
            archetypeEditor.classList.add('hidden');
            currentlyEditing = null;
            // Reset the editor state
            archetypePrompt.value = '';
            editingArchetypeName.innerHTML = '';
        }, 300); // Match the CSS transition duration
    });

    enhanceArchetypeButton.addEventListener('click', enhanceArchetype);
    saveArchetypeButton.addEventListener('click', saveArchetype);

    // Event listener for adding new archetype
    addArchetypeButton.addEventListener('click', () => {
        addArchetype(newArchetypeInput.value.trim());
    });

    newArchetypeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addArchetype(newArchetypeInput.value.trim());
        }
    });

    // Event listener for "Save Keys" button
    saveKeysButton.addEventListener('click', () => {
        const openaiApiKey = document.getElementById('openai-api-key').value.trim();
        const deepseekApiKey = document.getElementById('deepseek-api-key').value.trim();
        const grokApiKey = document.getElementById('grok-api-key').value.trim();

        chrome.storage.sync.set({ openaiApiKey, deepseekApiKey, grokApiKey }, () => {
            alert('API keys saved successfully!');
            chrome.runtime.sendMessage({ action: "reloadApiKeys" });
            loadAvailableModels(); // Reload models after API keys change
        });
    });

    // Add event listener for word count
    archetypePrompt.addEventListener('input', updateWordCount);
    archetypePrompt.addEventListener('keyup', updateWordCount);
    archetypePrompt.addEventListener('paste', () => setTimeout(updateWordCount, 0));

    // Update the CSS for the buttons container
    const style = document.createElement('style');
    style.textContent = `
        .archetype-buttons {
            display: flex;
            gap: 4px;
        }
        
        .copy-archetype {
            color: var(--accent);
        }
        
        .copy-archetype:hover {
            color: var(--accent-hover);
            background-color: rgba(59, 130, 246, 0.1);
        }

        .visibility-toggle {
            color: var(--text-secondary);
        }

        .visibility-toggle:hover {
            color: var(--text-primary);
            background-color: rgba(156, 163, 175, 0.1);
        }

        .archetype-editor {
            margin-top: 16px;
            padding: 20px;
            background-color: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 8px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-height: 500px;
            opacity: 0;
            transform: translateY(-20px);
            overflow: hidden;
        }

        .archetype-editor.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .archetype-editor.hidden {
            max-height: 0;
            padding: 0;
            margin: 0;
            opacity: 0;
            border: none;
            pointer-events: none;
        }

        .editor-header {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            padding: 0;
            font-size: 1.1em;
            gap: 8px;
        }

        .editor-header h3 {
            margin: 0;
            font-size: 1.1em;
            font-weight: 500;
            color: var(--text-primary);
            white-space: nowrap;
        }

        #editing-archetype-name {
            display: inline-flex;
            align-items: center;
            flex: 1;
            gap: 8px;
        }

        .archetype-header {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        #archetype-prompt {
            width: 100%;
            min-height: 150px;
            padding: 12px;
            margin: 0;
            border: 1px solid var(--border);
            border-radius: 8px;
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 0.9375rem;
            line-height: 1.5;
            resize: vertical;
        }

        .archetype-title {
            font-weight: 500;
            font-size: 1.1em;
            line-height: 1;
        }

        .word-count {
            font-size: 0.9em;
            color: var(--text-secondary);
            margin-left: 12px;
            white-space: nowrap;
        }

        /* API Key Input Styles */
        #api-keys-tab label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
            margin-bottom: 8px;
            color: var(--text-primary);
            font-weight: 500;
        }

        #api-keys-tab label img {
            width: 24px;
            height: 24px;
            object-fit: contain;
        }

        #api-keys-tab label:first-of-type {
            margin-top: 8px;
        }

        #api-keys-tab input[type="password"] {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 0.9375rem;
        }

        /* Model Visibility Management Styles */
        .model-visibility-section {
            margin-top: 24px;
            padding: 16px;
            background-color: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 8px;
        }

        .model-visibility-header {
            margin-bottom: 16px;
        }

        .model-visibility-header h3 {
            margin: 0;
            font-size: 1.1em;
            font-weight: 500;
            color: var(--text-primary);
        }

        .model-visibility-header p {
            margin: 8px 0 0;
            color: var(--text-secondary);
            font-size: 0.9375rem;
        }

        .model-provider-group {
            margin-bottom: 16px;
            padding: 12px;
            background-color: var(--bg-secondary);
            border-radius: 6px;
        }

        .model-provider-group:last-child {
            margin-bottom: 0;
        }

        .provider-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border);
        }

        .provider-name {
            font-weight: 500;
            color: var(--text-primary);
        }

        .model-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .model-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px;
            border-radius: 4px;
            background-color: var(--bg-primary);
        }

        .model-name {
            color: var(--text-primary);
        }

        .model-visibility-toggle {
            background: none;
            border: none;
            padding: 4px;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
        }

        .model-visibility-toggle:hover {
            background-color: var(--hover-bg);
            color: var(--text-primary);
        }

        .model-visibility-toggle .material-icons-round {
            font-size: 20px;
        }

        .warning-card {
            margin: 16px 0;
            padding: 12px 16px;
            background-color: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            color: rgba(0, 0, 0, 0.85);
        }

        .warning-card p {
            margin: 0;
            line-height: 1.5;
        }

        .warning-card p::before {
            content: "WARNING: ";
            font-weight: 600;
            color: rgb(220, 38, 38);
        }

        /* Dark theme override */
        body:not(.light-theme) .warning-card {
            color: rgba(255, 255, 255, 0.85);
        }

        .provider-info {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .provider-logo {
            width: 24px;
            height: 24px;
            object-fit: contain;
        }
    `;
    document.head.appendChild(style);

    // Add real-time formatting for archetype editor
    function setupArchetypeEditorFormatting() {
        const archetypePrompt = document.getElementById('archetype-prompt');
        if (!archetypePrompt) return;

        let lastValue = '';
        let lastSelectionStart = 0;
        let lastSelectionEnd = 0;
        
        function updatePreview() {
            const currentValue = archetypePrompt.value;
            if (currentValue !== lastValue) {
                lastValue = currentValue;
                lastSelectionStart = archetypePrompt.selectionStart;
                lastSelectionEnd = archetypePrompt.selectionEnd;
                
                // Apply formatting to the textarea itself
                const formatted = convertMarkdownToHtml(currentValue);
                if (formatted !== currentValue) {
                    archetypePrompt.value = formatted;
                    archetypePrompt.setSelectionRange(lastSelectionStart, lastSelectionEnd);
                }
            }
        }
        
        archetypePrompt.addEventListener('input', updatePreview);
        archetypePrompt.addEventListener('keyup', updatePreview);
        archetypePrompt.addEventListener('mouseup', updatePreview);
    }

    // Call setup function when document is ready
    setupArchetypeEditorFormatting();

    // Add storage change listener
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.modelProviderOrder) {
            // Update the archetype editor's model select
            chrome.runtime.sendMessage({ action: "getModelList" }, (response) => {
                if (response && response.models) {
                    const enhanceModelSelect = document.getElementById('enhance-model');
                    if (enhanceModelSelect) {
                        const truncatedModels = response.models.map(model => {
                            const name = model.name
                                .replace(' (OpenAI)', '')
                                .replace(' (DeepSeek)', '')
                                .replace(' (xAI)', '')
                                .replace(' (Google)', '')
                                .replace('Gemini ', '')
                                .replace('-Lite', ' Lite');
                            return { ...model, displayName: name };
                        });
                        
                        enhanceModelSelect.innerHTML = truncatedModels
                            .map(model => `<option value="${model.value}">${model.displayName}</option>`)
                            .join('');
                    }
                }
            });
        }
    });
});