# Context Weaver 2.0

Context Weaver is a powerful Chrome extension that brings AI-powered text transformation and chat capabilities directly into your browser. Simply highlight text anywhere on the web to instantly interact with various AI models.

## 🌟 Key Features

### Instant Text Processing
- **Quick Access**: Highlight any text and click the extension icon for instant AI processing
- **Multi-Model Support**: Choose between different AI models:
  - OpenAI GPT-4 and variants
  - DeepSeek Chat and Reasoner
  - Grok (including Grok-3-beta)
  - More models coming soon (Anthropic, Perplexity)

### Customizable Archetypes
- **Drag-and-Drop Organization**: Reorder archetypes to customize their appearance in dropdowns
- **Visibility Control**: Show/hide archetypes from the popup menu
- **AI-Powered Enhancement**: Use AI to refine archetype prompts with "Hone In" or "Flesh Out" options
- **Default Archetypes**:
  - Summarizer
  - Notetaker
  - Formalizer
  - Code Explainer
  - ELI5 (Explain Like I'm 5)
  - Socratic Seminar Lead
  - LinkedInese (LinkedIn Style Satirist)
  - Reply Guy
  - Schizophrenic Tweeter

### Modern UI/UX Improvements
- **Responsive Design**: Smooth animations and transitions throughout
- **Dark/Light Theme**: System-aware theme with manual toggle
- **Real-time Formatting**:
  - Markdown support in chat and archetype editing
  - Code block syntax highlighting
  - Smart text wrapping and overflow handling
- **Interactive Elements**:
  - Hover effects on buttons and cards
  - Visual feedback for actions
  - Smooth transitions between states

### Chat Interface
- **Streamlined Messaging**:
  - User messages are right-aligned with compact bubbles
  - AI responses are left-aligned with full-width formatting
  - Timestamps and role labels for clear conversation flow
- **Message Actions**:
  - Edit user messages
  - Copy AI responses
  - Regenerate responses
  - Clear chat history
- **Context Persistence**: (Coming Soon)
  - Save and resume conversations
  - Share chat contexts between popup and options page

## 💻 Technical Features

### Storage Management
- Secure API key storage using `chrome.storage.sync`
- Archetype order and visibility persistence
- Chat history synchronization (coming soon)

### Text Processing
- Real-time streaming responses
- Markdown parsing and rendering
- Code block formatting
- Character and token counting

### Browser Integration
- Works on any webpage
- Maintains state between popup and options page
- Efficient message handling through Chrome messaging API

## 🎨 UI Components

### Popup Interface
- Compact, efficient design
- Quick access to common functions
- Real-time preview of formatting
- Character and token count display

### Options Page
- Tab-based navigation:
  - Archetype Management
  - API Configuration
  - Chat Continuation
- Drag-and-drop archetype ordering
- Visual archetype editor with AI enhancement
- Comprehensive chat interface

### Chat Features
- Model selection dropdown
- Archetype selection with preserved order
- Message streaming with typing indicators
- Action buttons for message management

## 🔧 Configuration

### API Keys
- OpenAI API key for GPT models
- DeepSeek API key for Chat and Reasoner
- Grok API key for xAI models (supports both Grok-2 and Grok-3-beta)
- More providers coming soon

### Customization
- Create and modify archetypes
- Adjust visibility settings
- Organize archetype order
- Toggle dark/light theme

## 🚀 Getting Started

1. Install the extension from the Chrome Web Store
2. Configure your API keys in the options page
3. Highlight text on any webpage
4. Click the Context Weaver icon
5. Choose your preferred model and archetype
6. Get instant AI-powered responses

## 🔒 Privacy & Security

- API keys are stored securely in Chrome's sync storage
- No data collection by the extension itself
- Direct communication with AI providers
- Respects provider Terms of Service and Privacy Policies

## 🔜 Coming Soon

- Chat context persistence
- Additional AI models (Anthropic, Perplexity)
- Enhanced archetype sharing
- More customization options

## 👨‍💻 Author

Created by Luke Kabbash ([@LukeKabbash](https://x.com/LukeKabbash) on X)

---

*Context Weaver is not affiliated with OpenAI, DeepSeek, xAI, or any other AI provider. All trademarks are property of their respective owners.*