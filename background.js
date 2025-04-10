let highlightedText = '';
let openaiApiKey = '';
let deepseekApiKey = '';
let grokApiKey = '';
let geminiApiKey = '';
let availableModels = [];
let activeConnections = new Map();

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'weaveHighlightedText',
        title: 'Weave with Context Weaver',
        contexts: ['selection']
    });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'weaveHighlightedText') {
        // Store the selected text
        highlightedText = info.selectionText;
        
        // Get the current window to position the popup relative to it
        chrome.windows.getCurrent((currentWindow) => {
            // Calculate position - center the popup in the current window
            const width = 600;
            const height = 800;
            const left = Math.round(currentWindow.left + (currentWindow.width - width) / 2);
            const top = Math.round(currentWindow.top + (currentWindow.height - height) / 2);
            
            // Open the popup with calculated position and autoWeave parameter
            chrome.windows.create({
                url: chrome.runtime.getURL('popup/popup.html?autoWeave=true&windowType=rightClick'),
                type: 'popup',
                width: width,
                height: height,
                left: left,
                top: top
            });
        });
    }
});

// Function to generate model list based on available API keys
function generateModelList() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['modelProviderOrder'], (result) => {
            const providerOrder = result.modelProviderOrder || ['OpenAI', 'Google', 'xAI', 'DeepSeek'];
            const modelsByProvider = {
                'OpenAI': openaiApiKey ? [
                    { value: 'gpt-4o-mini-2024-07-18', name: '4o mini (OpenAI)' },
                    { value: 'o1-mini-2024-09-12', name: 'o1 mini (OpenAI)'}
                ] : [],
                'xAI': grokApiKey ? [
                    { value: 'grok-2', name: 'Grok-2 (xAI)' },
                    { value: 'grok-3-beta', name: 'Grok-3 Beta (xAI)' }
                ] : [],
                'DeepSeek': deepseekApiKey ? [
                    { value: 'deepseek-chat', name: 'V3 Chat (DeepSeek)' },
                    { value: 'deepseek-reasoner', name: 'R1 Reasoner (DeepSeek)' }
                ] : [],
                'Google': geminiApiKey ? [
                    { value: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Google)' },
                    { value: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite (Google)' }
                ] : []
            };

            // Return models in the specified order
            const models = [];
            providerOrder.forEach(provider => {
                if (modelsByProvider[provider]) {
                    models.push(...modelsByProvider[provider]);
                }
            });
            
            resolve(models);
        });
    });
}

// Function to load API keys and generate available model list
function loadApiKeysAndGenerateModelList() {
    chrome.storage.sync.get(['openaiApiKey', 'deepseekApiKey', 'grokApiKey', 'geminiApiKey'], (result) => {
        openaiApiKey = result.openaiApiKey || '';
        deepseekApiKey = result.deepseekApiKey || '';
        grokApiKey = result.grokApiKey || '';
        geminiApiKey = result.geminiApiKey || '';

        console.log("API Keys loaded from storage.");

        generateModelList().then(models => {
            availableModels = models;

            if (availableModels.length === 0) {
                console.warn("Warning: No API keys configured. No AI models available.");
            } else {
                console.log("Available models:", availableModels.map(model => model.value));
            }
        });
    });
}

// Load API keys and generate model list initially
loadApiKeysAndGenerateModelList();

// Message and Port handling
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "streamConnection") {
        port.onMessage.addListener(async (request) => {
            if (request.action === "processText") {
                try {
                    await handleStreamingAICall(request, port);
                } catch (error) {
                    port.postMessage({
                        type: 'error',
                        error: error.message
                    });
                    port.disconnect();
                }
            }
        });

        port.onDisconnect.addListener(() => {
            const controller = activeConnections.get(port);
            if (controller) {
                controller.abort();
                activeConnections.delete(port);
            }
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "updateText":
            highlightedText = request.text;
            console.log('Received updateText:', request.text);
            break;

        case "getText":
            sendResponse({ text: highlightedText });
            console.log('Sending getText response:', highlightedText);
            break;

        case "processText":
            if (availableModels.length === 0) {
                sendResponse({
                    result: `Error: No AI models available.\n\nPlease open the extension options and enter at least one API key to enable models.`
                });
                console.error("Error: No AI models available - processText blocked.");
                return true; // Indicate async response
            }
            handleAICall(request, sendResponse);
            return true; // Keep channel open

        case "reloadApiKeys":
            loadApiKeysAndGenerateModelList();
            sendResponse({ success: true, models: availableModels });
            return true;

        case "getModelList":
            generateModelList().then(models => {
                sendResponse({ models });
            });
            return true;

        case "modelVisibilityUpdated":
            // Notify all open popups about the visibility change
            chrome.runtime.sendMessage({ 
                action: "modelVisibilityUpdated",
                visibility: request.visibility 
            });
            return true;

        default:
            sendResponse({ result: "Unknown action" });
    }
});

async function handleAICall(request, sendResponse) {
    try {
        console.log("handleAICall started", request);
        const { text, personality, model } = request;
        const prompt = await generatePrompt(text, personality);
        let apiResponse;
        let currentApiKey = '';

        switch (model) {
            case 'gpt-4o-mini-2024-07-18': // Case for 4o mini
                currentApiKey = openaiApiKey;
                if (!currentApiKey) throw new Error('OpenAI API key not configured');
                console.log("Calling OpenAI API with model: 4o mini"); // Specific log
                apiResponse = await callOpenAI(prompt, 'gpt-4o-mini-2024-07-18', currentApiKey, 8192); // Added token limit
                break;
            case 'o1-mini-2024-09-12': // Case for o1 mini
                currentApiKey = openaiApiKey;
                if (!currentApiKey) throw new Error('OpenAI API key not configured');
                console.log("Calling OpenAI API with model: o1 mini"); // Specific log
                apiResponse = await callOpenAI(prompt, 'o1-mini-2024-09-12', currentApiKey, 8192); // Added token limit
                break;
            case 'grok-2':
                currentApiKey = grokApiKey;
                if (!currentApiKey) throw new Error('Grok API key not configured');
                console.log("Calling Grok API with model:", model);
                apiResponse = await callGrok(prompt, "grok-2", currentApiKey, 8192); // Added token limit
                break;
            case 'grok-3-beta':
                currentApiKey = grokApiKey;
                if (!currentApiKey) throw new Error('Grok API key not configured');
                console.log("Calling Grok API with model:", model);
                apiResponse = await callGrok(prompt, "grok-3-beta", currentApiKey, 8192); // Added token limit
                break;
            case 'deepseek-chat':
                currentApiKey = deepseekApiKey;
                if (!currentApiKey) throw new Error('DeepSeek API key not configured');
                console.log("Calling DeepSeek Chat API with model:", model);
                apiResponse = await callDeepSeekChat(prompt, currentApiKey, 8192); // Added token limit
                break;
            case 'deepseek-reasoner':
                currentApiKey = deepseekApiKey;
                if (!currentApiKey) throw new Error('DeepSeek API key not configured');
                console.log("Calling DeepSeek Reasoner API with model:", model);
                apiResponse = await callDeepSeekReasoner(prompt, currentApiKey, 8192); // Added token limit
                break;
            case 'gemini-2.0-flash':
            case 'gemini-2.0-flash-lite':
                currentApiKey = geminiApiKey;
                if (!currentApiKey) throw new Error('Gemini API key not configured');
                console.log("Calling Gemini API with model:", model);
                apiResponse = await callGemini(prompt, model, currentApiKey, 8192);
                break;
            default:
                throw new Error(`Model "${model}" not supported.`);
        }

        console.log("API call successful, response:", apiResponse);
        sendResponse({ result: apiResponse });

    } catch (error) {
        console.error("Error in handleAICall:", error);
        sendResponse({
            result: `Error: ${error.message}\n\n${error.message} in extension options.`
        });
    }
}

// --- API Call Functions ---
async function callOpenAI(prompt, modelName, apiKey, maxTokens) {
    console.log("callOpenAI API Key:", apiKey ? "present" : "missing");
    try {
        const requestBody = { // Build request body object
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            // temperature: 0.7,  <- Temperature is now conditionally added
        };

        // Conditionally set max_tokens or max_completion_tokens based on modelName
        if (modelName === 'o1-mini-2024-09-12' || modelName === 'o1-2024-12-17' || modelName === 'o1-preview-2024-09-12') {
            requestBody.max_completion_tokens = maxTokens;

        } else {
            requestBody.max_tokens = maxTokens;
            requestBody.temperature = 0.7;
        }


        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody) // Use the dynamically built request body
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenAI API Error Response:", errorData);
            throw new Error(errorData.error?.message || 'OpenAI API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Error in callOpenAI:", error);
        throw error;
    }
}


async function callDeepSeekChat(prompt, apiKey, maxTokens) {
    console.log("callDeepSeekChat API Key:", apiKey ? "present" : "missing");
    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: maxTokens // Use the maxTokens parameter
            })
        });

        console.log("DeepSeek Chat Request Body:", JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: maxTokens
        }));
        console.log("DeepSeek Chat Request Headers:", {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        });


        if (!response.ok) {
            const errorData = await response.json();
            console.error("DeepSeek Chat API Error Response:", errorData);
            throw new Error(errorData.error?.message || 'DeepSeek Chat API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Error in callDeepSeekChat:", error);
        throw error;
    }
}

async function callDeepSeekReasoner(prompt, apiKey, maxTokens) {
    console.log("callDeepSeekReasoner API Key:", apiKey ? "present" : "missing");
    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-reasoner",
                messages: [{ role: "user", content: prompt }],
                max_tokens: maxTokens // Use the maxTokens parameter
            })
        });

        console.log("DeepSeek Reasoner Request Body:", JSON.stringify({
            model: "deepseek-reasoner",
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens
        }));
        console.log("DeepSeek Reasoner Request Headers:", {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        });


        if (!response.ok) {
            const errorData = await response.json();
            console.error("DeepSeek Reasoner API Error Response:", errorData);
            throw new Error(errorData.error?.message || 'DeepSeek Reasoner API request failed');
        }

        const data = await response.json();
        // For deepseek-reasoner, prioritize reasoning_content if available, else use content
        const choice = data.choices[0].message;
        return choice.reasoning_content || choice.content;
    } catch (error) {
        console.error("Error in callDeepSeekReasoner:", error);
        throw error;
    }
}


async function callGrok(prompt, modelName, apiKey, maxTokens) {
    console.log("callGrok API Key:", apiKey ? "present" : "missing");
    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName, // "grok-2"
                messages: [{ role: "user", content: prompt }],
                max_tokens: maxTokens, // Use the maxTokens parameter
                response_format: { type: "text" }
                // No temperature or other params needed for basic compatibility
            })
        });

        console.log("Grok Request Body:", JSON.stringify({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
            response_format: { type: "text" }
        }));
        console.log("Grok Request Headers:", {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        });


        if (!response.ok) {
            const errorData = await response.json();
            console.error("Grok API Error Response:", errorData);
            throw new Error(errorData.error?.message || 'Grok API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Error in callGrok:", error);
        throw error;
    }
}

// Add Gemini API call function
async function callGemini(prompt, model, apiKey, maxTokens) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "user", content: prompt }
                ],
                max_tokens: maxTokens,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error Response:", errorData);
            throw new Error(errorData.error?.message || 'Gemini API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Error in callGemini:", error);
        throw error;
    }
}

function generatePrompt(text, personality) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['archetypePrompts'], (result) => {
            const prompts = result.archetypePrompts || {
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

            const prompt = prompts[personality] || text;
            resolve(personality === 'None' ? text : `${prompt}\n\n${text}`);
        });
    });
}

async function handleStreamingAICall(request, port) {
    const { text, personality, model } = request;
    const prompt = await generatePrompt(text, personality);
    const controller = new AbortController();
    activeConnections.set(port, controller);

    try {
        let stream;
        switch (model) {
            case 'gpt-4o-mini-2024-07-18':
            case 'o1-mini-2024-09-12':
                if (!openaiApiKey) throw new Error('OpenAI API key not configured');
                stream = await streamOpenAI(prompt, model, openaiApiKey, controller.signal);
                break;
            case 'grok-2':
                if (!grokApiKey) throw new Error('Grok API key not configured');
                stream = await streamGrok(prompt, model, grokApiKey, controller.signal);
                break;
            case 'grok-3-beta':
                if (!grokApiKey) throw new Error('Grok API key not configured');
                stream = await streamGrok(prompt, model, grokApiKey, controller.signal);
                break;
            case 'deepseek-chat':
            case 'deepseek-reasoner':
                if (!deepseekApiKey) throw new Error('DeepSeek API key not configured');
                stream = await streamDeepSeek(prompt, model, deepseekApiKey, controller.signal);
                break;
            case 'gemini-2.0-flash':
            case 'gemini-2.0-flash-lite':
                if (!geminiApiKey) throw new Error('Gemini API key not configured');
                stream = await streamGemini(prompt, model, geminiApiKey, controller.signal);
                break;
            default:
                throw new Error(`Model "${model}" not supported.`);
        }

        for await (const chunk of stream) {
            if (port.disconnected) break;
            port.postMessage({
                type: 'stream',
                chunk: chunk
            });
        }

        port.postMessage({ type: 'end' });
    } catch (error) {
        port.postMessage({
            type: 'error',
            error: error.message
        });
    } finally {
        activeConnections.delete(port);
    }
}

async function* streamOpenAI(prompt, model, apiKey, signal) {
    const requestBody = {
        model: model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        temperature: 0.7,
        max_tokens: 8192,
        presence_penalty: 0,
        frequency_penalty: 0,
        n: 1
    };

    // Add model-specific parameters
    if (model.includes('o1-')) {
        requestBody.max_completion_tokens = 8192;
        delete requestBody.max_tokens;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'OpenAI-Beta': 'assistants=v1'
            },
            body: JSON.stringify(requestBody),
            signal
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let backoffTime = 1000; // Start with 1s backoff

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        try {
                            const json = JSON.parse(data);
                            const content = json.choices[0]?.delta?.content;
                            if (content) {
                                backoffTime = 1000; // Reset backoff on successful chunk
                                yield content;
                            }
                        } catch (e) {
                            console.error('Error parsing OpenAI stream chunk:', e);
                            // Exponential backoff on parse error
                            await new Promise(resolve => setTimeout(resolve, backoffTime));
                            backoffTime = Math.min(backoffTime * 2, 32000); // Max 32s backoff
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request was cancelled');
        }
        throw error;
    }
}

async function* streamDeepSeek(prompt, model, apiKey, signal) {
    const requestBody = {
        model: model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        temperature: 0.7,
        max_tokens: 8192,
        presence_penalty: 0,
        frequency_penalty: 0,
        n: 1
    };

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-API-Version': '2024-03-01'
            },
            body: JSON.stringify(requestBody),
            signal
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `DeepSeek API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let backoffTime = 1000;
        let retryCount = 0;
        const maxRetries = 3;
        let isInThinkingMode = false;
        let thinkingBuffer = '';

        try {
            while (true) {
                try {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                if (thinkingBuffer) {
                                    yield `<think>${thinkingBuffer}</think>`;
                                    thinkingBuffer = '';
                                }
                                continue;
                            }
                            try {
                                const json = JSON.parse(data);
                                const content = json.choices[0]?.delta?.content;
                                if (content) {
                                    backoffTime = 1000;
                                    retryCount = 0;

                                    // Handle chain of thought markers
                                    if (content.includes('[THINKING]')) {
                                        isInThinkingMode = true;
                                        continue;
                                    } else if (content.includes('[/THINKING]')) {
                                        isInThinkingMode = false;
                                        yield `<think>${thinkingBuffer}</think>`;
                                        thinkingBuffer = '';
                                        continue;
                                    }

                                    if (isInThinkingMode) {
                                        thinkingBuffer += content;
                                    } else {
                                        yield content;
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing DeepSeek stream chunk:', e);
                                retryCount++;
                                if (retryCount > maxRetries) {
                                    throw new Error('Max retries exceeded for chunk parsing');
                                }
                                await new Promise(resolve => setTimeout(resolve, backoffTime));
                                backoffTime = Math.min(backoffTime * 2, 32000);
                            }
                        }
                    }
                } catch (error) {
                    if (error.name === 'AbortError' || retryCount > maxRetries) {
                        throw error;
                    }
                    console.warn('Stream error, retrying:', error);
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                    backoffTime = Math.min(backoffTime * 2, 32000);
                }
            }
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request was cancelled');
        }
        throw error;
    }
}

async function* streamGrok(prompt, model, apiKey, signal) {
    const requestBody = {
        model: model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        temperature: 0.7,
        max_tokens: 8192,
        presence_penalty: 0,
        frequency_penalty: 0,
        n: 1
    };

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-API-Version': '2024-03-01'
            },
            body: JSON.stringify(requestBody),
            signal
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `xAI API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let backoffTime = 1000;
        let retryCount = 0;
        const maxRetries = 3;

        try {
            while (true) {
                try {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            try {
                                const json = JSON.parse(data);
                                // Handle both streaming and non-streaming responses
                                const content = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content;
                                if (content) {
                                    backoffTime = 1000;
                                    retryCount = 0;
                                    yield content;
                                }
                            } catch (e) {
                                console.error('Error parsing xAI stream chunk:', e);
                                console.error('Raw chunk data:', data);
                                retryCount++;
                                if (retryCount > maxRetries) {
                                    throw new Error('Max retries exceeded for chunk parsing');
                                }
                                await new Promise(resolve => setTimeout(resolve, backoffTime));
                                backoffTime = Math.min(backoffTime * 2, 32000);
                            }
                        }
                    }
                } catch (error) {
                    if (error.name === 'AbortError' || retryCount > maxRetries) {
                        throw error;
                    }
                    console.warn('Stream error, retrying:', error);
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                    backoffTime = Math.min(backoffTime * 2, 32000);
                }
            }
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request was cancelled');
        }
        throw error;
    }
}

async function* streamGemini(prompt, model, apiKey, signal) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "user", content: prompt }
                ],
                stream: true,
                max_tokens: 8192,
                temperature: 0.7
            }),
            signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error Response:", errorData);
            throw new Error(errorData.error?.message || 'Gemini API request failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let backoffTime = 1000;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        try {
                            const json = JSON.parse(data);
                            const content = json.choices[0]?.delta?.content;
                            if (content) {
                                backoffTime = 1000;
                                yield content;
                            }
                        } catch (e) {
                            console.error('Error parsing Gemini stream chunk:', e);
                            await new Promise(resolve => setTimeout(resolve, backoffTime));
                            backoffTime = Math.min(backoffTime * 2, 32000);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request was cancelled');
        }
        throw error;
    }
}