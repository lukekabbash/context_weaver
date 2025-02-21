class ChatBot {
    constructor() {
        this.messages = [];
        this.currentModel = null;
        this.systemPrompt = null;
        this.port = null;
    }

    async initialize() {
        // Load chat history from storage
        const result = await chrome.storage.sync.get(['chatHistory', 'selectedModel']);
        this.messages = result.chatHistory || [];
        this.currentModel = result.selectedModel || 'gpt-4o-mini-2024-07-18';
        
        // Setup message listener for popup updates
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "getText" && request.text) {
                this.handlePopupText(request.text);
            }
        });
    }

    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
    }

    setModel(model) {
        this.currentModel = model;
    }

    async handlePopupText(text) {
        // Clear existing chat when new text is received from popup
        this.messages = [];
        if (text.trim()) {
            this.messages.push({
                role: 'user',
                content: text,
                timestamp: Date.now()
            });
            await this.saveHistory();
            // Trigger UI update
            document.dispatchEvent(new CustomEvent('chatUpdated'));
        }
    }

    async sendMessage(content, isRegeneration = false) {
        if (!content.trim()) return;

        // Add user message only if this is not a regeneration
        if (!isRegeneration) {
            this.messages.push({
                role: 'user',
                content: content,
                timestamp: Date.now()
            });
            await this.saveHistory();
            document.dispatchEvent(new CustomEvent('chatUpdated'));
        }

        try {
            // Cleanup any existing port
            if (this.port) {
                try {
                    this.port.disconnect();
                } catch (e) {
                    console.debug('Port already disconnected:', e);
                }
                this.port = null;
            }

            // Create new port
            this.port = chrome.runtime.connect({ name: "streamConnection" });
            let responseText = '';

            // Handle incoming stream
            this.port.onMessage.addListener((message) => {
                if (message.type === 'stream') {
                    responseText += message.chunk;
                    // Trigger streaming update
                    document.dispatchEvent(new CustomEvent('chatStreaming', {
                        detail: { text: responseText }
                    }));
                } else if (message.type === 'end') {
                    // Add assistant message
                    this.messages.push({
                        role: 'assistant',
                        content: responseText,
                        timestamp: Date.now()
                    });
                    this.saveHistory();
                    // Trigger final update
                    document.dispatchEvent(new CustomEvent('chatUpdated'));
                } else if (message.type === 'error') {
                    console.error('Chat error:', message.error);
                    document.dispatchEvent(new CustomEvent('chatError', {
                        detail: { error: message.error }
                    }));
                }
            });

            // Send the message
            this.port.postMessage({
                action: "processText",
                text: content,
                personality: this.systemPrompt ? 'Custom' : 'None',
                model: this.currentModel
            });

        } catch (error) {
            console.error('Error sending message:', error);
            document.dispatchEvent(new CustomEvent('chatError', {
                detail: { error: error.message }
            }));
        }
    }

    async editMessage(index, newContent) {
        if (index >= 0 && index < this.messages.length) {
            this.messages[index].content = newContent;
            this.messages[index].edited = true;
            await this.saveHistory();
            document.dispatchEvent(new CustomEvent('chatUpdated'));
        }
    }

    async regenerateMessage(index) {
        if (index >= 0 && index < this.messages.length && this.messages[index].role === 'assistant') {
            const userMessage = this.messages[index - 1];
            // Remove the assistant's response and all subsequent messages
            this.messages = this.messages.slice(0, index);
            await this.saveHistory();
            // Trigger a new message generation using the previous user message
            await this.sendMessage(userMessage.content, true);
        }
    }

    async clearHistory() {
        this.messages = [];
        await this.saveHistory();
        document.dispatchEvent(new CustomEvent('chatUpdated'));
    }

    async saveHistory() {
        await chrome.storage.sync.set({ 
            chatHistory: this.messages,
            selectedModel: this.currentModel
        });
    }
}

// Export the class
window.ChatBot = ChatBot;