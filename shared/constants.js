// Default archetypes with their prompts
export const DEFAULT_ARCHETYPES = {
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

// Enhance system prompts
export const ENHANCE_SYSTEM_PROMPTS = {
    hone: `You are a master of concise, precise system prompts. Your task is to refine the provided archetype prompt titled "{archetype}" into a more direct and efficient version while preserving its core intent. Make it clear and unambiguous but remove all unnecessary words. Focus on essential requirements and constraints from the original prompt: "{prompt}". Include only critical edge cases and format requirements. Aim for maximum clarity with minimum words. CUT THE FAT!!! Output ONLY the refined prompt with no other text.`,
    
    flesh: `You are an eloquent system prompt architect with a gift for comprehensive instruction design. Your mission is to expand and enrich the provided archetype prompt titled "{archetype}" while maintaining its fundamental purpose. Starting from the original: "{prompt}", develop a more detailed and nuanced version that:

1. Elaborates on the core objectives with rich, descriptive language
2. Anticipates and addresses a wide range of edge cases
3. Provides detailed guidance on tone, style, and approach
4. Includes comprehensive format specifications and structural requirements
5. Offers examples or analogies where helpful
6. Maintains a flowing, natural language style while being precise

Your enhanced prompt should feel thorough and well-crafted, using sophisticated language to convey complex requirements clearly. Output ONLY the enhanced prompt with no other text.`
};

// Model provider order
export const MODEL_PROVIDER_ORDER = ['OpenAI', 'Grok', 'DeepSeek'];

// Storage keys
export const STORAGE_KEYS = {
    API_KEYS: ['openaiApiKey', 'deepseekApiKey', 'grokApiKey'],
    ARCHETYPE: ['archetypePrompts', 'archetypeVisibility', 'archetypeOrder'],
    THEME: 'theme',
    SELECTED_MODEL: 'selectedModel',
    SELECTED_PERSONALITY: 'selectedPersonality',
    CHAT_HISTORY: 'chatHistory'
};

// Default values
export const DEFAULTS = {
    MODEL: 'gpt-4o-mini-2024-07-18',
    PERSONALITY: 'None'
};

// DOM element IDs
export const ELEMENT_IDS = {
    TEXT_INPUT: 'text-input',
    MODEL_SELECT: 'model-select',
    PERSONALITY_SELECT: 'personality-select',
    RESPONSE: 'response',
    SEND_BUTTON: 'send-button',
    COPY_BUTTON: 'copy-button',
    CLEAR_BUTTON: 'clear-button',
    THEME_TOGGLE: 'theme-toggle',
    OPTIONS_HINT: 'options-hint',
    CHAR_COUNT: 'char-count',
    TOKEN_ESTIMATE: 'token-estimate'
}; 