let highlightedText = '';
let openaiApiKey = '';
let deepseekApiKey = '';
let grokApiKey = '';
let googleApiKey = ''; // REMOVED: Google AI API Key variable (no longer needed)
let availableModels = [];

// Function to load API keys from storage and generate available model list
function loadApiKeysAndGenerateModelList() {
    chrome.storage.sync.get(['openaiApiKey', 'deepseekApiKey', 'grokApiKey', 'googleApiKey'], (result) => { // REMOVED: googleApiKey from storage get
        openaiApiKey = result.openaiApiKey || '';
        deepseekApiKey = result.deepseekApiKey || '';
        grokApiKey = result.grokApiKey || '';
        googleApiKey = ''; // REMOVED: googleApiKey = result.googleApiKey || '';  <- No longer load Google API Key

        console.log("API Keys loaded from storage.");

        availableModels = generateModelList();

        if (availableModels.length === 0) {
            console.warn("Warning: No API keys configured. No AI models available.");
        } else {
            console.log("Available models:", availableModels.map(model => model.value));
        }
    });
}

// Function to generate model list based on available API keys
function generateModelList() {
    const models = [];
    if (openaiApiKey) {
        models.push({ value: 'gpt-4o-mini-2024-07-18', name: '4o mini (OpenAI)' });
        models.push({ value: 'o1-mini-2024-09-12', name: 'o1 mini (OpenAI)'});
    }
    if (grokApiKey) {
        models.push({ value: 'grok-2', name: 'Grok-2 (xAI)' });
    }
    if (deepseekApiKey) {
        models.push({ value: 'deepseek-chat', name: 'V3 Chat (DeepSeek)' });
        models.push({ value: 'deepseek-reasoner', name: 'R1 Reasoner (DeepSeek)' });
    }
    // REMOVED: Gemini models are no longer added
    return models;
}


// Load API keys and generate model list initially
loadApiKeysAndGenerateModelList();

// Message handler
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
            sendResponse({ models: availableModels });
            return true;

        default:
            sendResponse({ result: "Unknown action" });
    }
});

async function handleAICall(request, sendResponse) {
    try {
        console.log("handleAICall started", request); // Debug log - function start
        const { text, personality, model } = request;
        const prompt = generatePrompt(text, personality);
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
            // REMOVED: Cases for Gemini models are removed
            default:
                throw new Error(`Model "${model}" not supported.`);
        }

        console.log("API call successful, response:", apiResponse); // Debug log - successful API call
        sendResponse({ result: apiResponse });

    } catch (error) {
        console.error("Error in handleAICall:", error); // Debug log - error in handleAICall
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
                max_tokens: maxTokens // Use the maxTokens parameter
                // No temperature or other params needed for basic compatibility
            })
        });

        console.log("Grok Request Body:", JSON.stringify({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens
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


function generatePrompt(text, personality) {
    switch (personality) {
        case 'Summarizer':
            return `Summarize the following text concisely, focusing on the core message and main arguments. Aim for brevity and clarity, extracting only the most important information and removing unnecessary details. Maintain the original tone where possible, but prioritize conciseness above all else:\n\n${text}`;
        case 'Formalizer':
            return `Rewrite the following text to be more formal and professional in tone. Enhance clarity, improve sentence structure, and ensure sophisticated vocabulary. Remove any casual language, slang, or overly colloquial expressions. Aim for a style appropriate for business correspondence, academic writing, or formal reports. Maintain the original meaning and depth, but elevate the language to a more refined register:\n\n${text}`;
        case 'Schizophrenic Tweeter':
            return `Create an engaging, potentially viral tweet from the following text. Embrace unexpected juxtapositions and non-sequiturs. Do not use hashtags or emojis.  It's okay if the tweet is longer than normal if needed to get the idea across, but prefer to keep it wihtin character limit. Aim for punchy intellectual, philisophical or psychological humor, or a thought provoking stream of consiousness:\n\n${text}`;
        case 'LinkedInese':
            return `Rewrite the following text for LinkedIn, but with a heavy dose of irony and satire. Exaggerate the professional tone, enthusiasm, and business buzzwords to an absurd degree, highlighting the often hollow and performative nature of LinkedIn content.  Emphasize career growth, networking, and innovation in an over-the-top, ridiculous way. The goal is to create a LinkedIn-style post that is clearly satirical and humorous through its excessive and insincere professionalism:\n\n${text}`;
        case 'Socratic Seminar Lead':
            return `Generate a series of open-ended, probing questions based on the following text. These questions should encourage critical thinking, deeper exploration of the text's themes, and diverse perspectives.  The questions should be suitable for leading a Socratic seminar-style discussion, prompting participants to engage with the text, challenge assumptions, and explore different interpretations. Focus on questions that have no single 'right' answer and stimulate thoughtful dialogue and inquiry:\n\n${text}`;
        case 'Notetaker': // Renamed from 'Concise Bullet Points'
            return `Create concise and well-formatted notes from the following text, using bullet points. Focus on capturing the key concepts and information in an understandable way, without getting overly technical or verbose. Aim for clarity, brevity, and good organization:\n\n${text}`;
        case 'Explain Like I\'m 5':
            return `Explain the following text as if you were talking to a five-year-old child. Use very simple words, short sentences, and relatable examples or analogies that a young child would understand. Avoid jargon, complex vocabulary, and abstract concepts. Focus on conveying the basic idea or core concept in the most straightforward and accessible way possible. Imagine you are explaining this to someone who knows very little about the topic:\n\n${text}`;
        case 'Explain Code':
            return `Explain the following code snippet in detail. Break down the code step-by-step, explaining what each part of the code does, its purpose, and how it contributes to the overall functionality. Assume the reader has some basic programming knowledge but may not be familiar with the specific language or libraries used. Clarify any complex algorithms, data structures, or programming concepts involved. Provide clear and concise explanations for each line or block of code to ensure a comprehensive understanding of the code's behavior:\n\n${text}`;
        case 'Reply Guy': // NEW: Reply Guy Archetype
            return `Analyze the tone, style, and perspective of the following text. Then, write a reply to this text as if you were a "Reply Guy" on Twitter or Instagram, in a relatively dishevled stream of consiousness way.  Your reply should be in the style of someone who frequently comments on posts for exposure, often adding their own take, agreeing or disagreeing, or offering a slightly different angle, while sounding like it naturally fits within a conversation with the original author. Keep the reply relatively brief and to-the-point, as is typical of social media replies, but aim to foster interesting discussion. Be philisophical/socratic when warranted. Only print the reply -- and do not use hashtags. Never use emojis.:\n\n${text}`;
        default: return text;
    }
}