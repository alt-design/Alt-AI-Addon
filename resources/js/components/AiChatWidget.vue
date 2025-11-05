<template>
    <div class="ai-chat-widget" :class="{ 'minimized': isMinimized }">
        <!-- Minimized State -->
        <div v-if="isMinimized" class="chat-button" @click="toggleMinimize">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
        </div>

        <!-- Expanded State -->
        <div v-else class="chat-window">
            <!-- Header -->
            <div class="chat-header">
                <div class="header-content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>
                    </svg>
                    <span class="title">AI Assistant</span>
                    <span class="context-indicator" v-if="currentContext.title" :title="contextTooltip">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </span>
                </div>
                <div class="header-actions">
                    <button @click="clearConversation" class="btn-icon" title="Clear conversation">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <button @click="toggleMinimize" class="btn-icon" title="Minimize">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Messages -->
            <div class="chat-messages" ref="messagesContainer">
                <div v-if="messages.length === 0" class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>Hi! I'm your AI assistant. I can help you with content creation, editing, and general questions about what you're working on.</p>
                    <p class="context-info" v-if="currentContext.route">Currently viewing: <strong>{{ currentContext.route }}</strong></p>
                </div>

                <div v-for="(message, index) in messages" :key="index" class="message" :class="message.role">
                    <div class="message-content">
                        <div class="message-text" v-html="formatMessage(message.content)"></div>
                        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                    </div>
                </div>

                <div v-if="isLoading" class="message assistant">
                    <div class="message-content">
                        <div class="loading-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Input -->
            <div class="chat-input">
                <textarea
                    ref="messageInput"
                    v-model="currentMessage"
                    @keydown.enter.exact.prevent="sendMessage"
                    @keydown.enter.shift.exact="currentMessage += '\n'"
                    placeholder="Ask me anything... (Shift+Enter for new line)"
                    rows="1"
                    :disabled="isLoading"
                ></textarea>
                <button
                    @click="sendMessage"
                    class="btn-send"
                    :disabled="!currentMessage.trim() || isLoading"
                    title="Send message (Enter)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'AiChatWidget',

    data() {
        return {
            isMinimized: true,
            currentMessage: '',
            messages: [],
            isLoading: false,
            unreadCount: 0,
            currentContext: {},
        };
    },

    computed: {
        config() {
            return this.$store?.state?.statamic?.config?.tiptapAiConfig || {};
        },

        chatEndpoint() {
            return this.config.endpoints?.chat || '/cp/tiptap-ai-agent/chat';
        },

        contextTooltip() {
            const parts = [];
            if (this.currentContext.route) parts.push(`Route: ${this.currentContext.route}`);
            if (this.currentContext.collection) parts.push(`Collection: ${this.currentContext.collection}`);
            if (this.currentContext.blueprint) parts.push(`Blueprint: ${this.currentContext.blueprint}`);
            if (this.currentContext.title) parts.push(`Title: ${this.currentContext.title}`);
            return parts.join('\n');
        }
    },

    mounted() {
        // Load conversation from session storage
        this.loadConversation();

        // Extract initial context
        this.updateContext();

        // Watch for route changes
        if (this.$root.$route) {
            this.$watch(() => this.$root.$route.path, () => {
                this.updateContext();
            });
        }

        // Listen for context updates from other components
        this.$events.$on('ai-chat:update-context', this.updateContext);
    },

    beforeDestroy() {
        this.$events.$off('ai-chat:update-context', this.updateContext);
    },

    methods: {
        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            if (!this.isMinimized) {
                this.unreadCount = 0;
                this.$nextTick(() => {
                    this.$refs.messageInput?.focus();
                    this.scrollToBottom();
                });
            }
        },

        async sendMessage() {
            if (!this.currentMessage.trim() || this.isLoading) return;

            const userMessage = this.currentMessage.trim();
            this.currentMessage = '';

            // Add user message to conversation
            this.messages.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date(),
            });

            this.isLoading = true;
            this.scrollToBottom();

            try {
                const response = await this.$axios.post(this.chatEndpoint, {
                    message: userMessage,
                    conversation_history: this.getConversationHistory(),
                    context: this.currentContext,
                });

                // Add assistant response
                this.messages.push({
                    role: 'assistant',
                    content: response.data.message,
                    timestamp: new Date(),
                });

                if (this.isMinimized) {
                    this.unreadCount++;
                }

                this.saveConversation();
                this.scrollToBottom();

            } catch (error) {
                console.error('AI Chat error:', error);

                this.messages.push({
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again. ' +
                             (error.response?.data?.error || error.message),
                    timestamp: new Date(),
                    isError: true,
                });
            } finally {
                this.isLoading = false;
            }
        },

        getConversationHistory() {
            // Return last 10 messages for context (to avoid token limits)
            return this.messages.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content,
            }));
        },

        clearConversation() {
            if (confirm('Clear the entire conversation?')) {
                this.messages = [];
                this.saveConversation();
            }
        },

        updateContext() {
            // Extract context from current page
            const context = {
                route: window.location.pathname,
            };

            // Try to extract collection/blueprint info from URL
            const pathParts = window.location.pathname.split('/');
            if (pathParts.includes('collections')) {
                const collectionIndex = pathParts.indexOf('collections');
                if (pathParts[collectionIndex + 1]) {
                    context.collection = pathParts[collectionIndex + 1];
                }
            }

            // Try to get title from publish form
            if (this.$root.$refs?.publish) {
                const publishComponent = this.$root.$refs.publish;
                if (publishComponent.values?.title) {
                    context.title = publishComponent.values.title;
                }
                if (publishComponent.blueprint) {
                    context.blueprint = publishComponent.blueprint;
                }
            }

            // Try alternative method to get title from page
            const titleInput = document.querySelector('input[name="title"]');
            if (titleInput?.value) {
                context.title = titleInput.value;
            }

            this.currentContext = context;
        },

        saveConversation() {
            try {
                sessionStorage.setItem('ai-chat-messages', JSON.stringify(this.messages));
            } catch (e) {
                console.error('Failed to save conversation:', e);
            }
        },

        loadConversation() {
            try {
                const saved = sessionStorage.getItem('ai-chat-messages');
                if (saved) {
                    this.messages = JSON.parse(saved).map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp),
                    }));
                }
            } catch (e) {
                console.error('Failed to load conversation:', e);
            }
        },

        scrollToBottom() {
            this.$nextTick(() => {
                const container = this.$refs.messagesContainer;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            });
        },

        formatMessage(content) {
            // Basic markdown-style formatting
            let formatted = content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');

            return formatted;
        },

        formatTime(timestamp) {
            const now = new Date();
            const diff = now - timestamp;

            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

            return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        },
    },
};
</script>

<style scoped>
.ai-chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.chat-button {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative;
}

.chat-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.chat-button .badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ef4444;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: bold;
    min-width: 20px;
    text-align: center;
}

.chat-window {
    width: 380px;
    height: 600px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.header-content .title {
    font-weight: 600;
    font-size: 16px;
}

.context-indicator {
    display: inline-flex;
    align-items: center;
    opacity: 0.8;
    cursor: help;
}

.header-actions {
    display: flex;
    gap: 8px;
}

.btn-icon {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-icon:hover {
    background: rgba(255, 255, 255, 0.3);
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f9fafb;
}

.empty-state {
    text-align: center;
    color: #6b7280;
    padding: 40px 20px;
}

.empty-state svg {
    opacity: 0.3;
    margin-bottom: 16px;
}

.empty-state p {
    margin: 8px 0;
    line-height: 1.5;
}

.empty-state .context-info {
    margin-top: 16px;
    font-size: 13px;
    color: #9ca3af;
}

.message {
    margin-bottom: 16px;
    display: flex;
}

.message.user {
    justify-content: flex-end;
}

.message.assistant {
    justify-content: flex-start;
}

.message-content {
    max-width: 75%;
    padding: 12px 16px;
    border-radius: 12px;
    position: relative;
}

.message.user .message-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
    background: white;
    color: #1f2937;
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-text {
    line-height: 1.5;
    font-size: 14px;
}

.message-text code {
    background: rgba(0, 0, 0, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
}

.message.assistant .message-text code {
    background: #f3f4f6;
}

.message-time {
    font-size: 11px;
    opacity: 0.6;
    margin-top: 4px;
}

.loading-indicator {
    display: flex;
    gap: 4px;
    padding: 4px 0;
}

.loading-indicator span {
    width: 8px;
    height: 8px;
    background: #9ca3af;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
}

.loading-indicator span:nth-child(1) {
    animation-delay: -0.32s;
}

.loading-indicator span:nth-child(2) {
    animation-delay: -0.16s;
}

@keyframes bounce {
    0%, 80%, 100% {
        transform: scale(0);
    }
    40% {
        transform: scale(1);
    }
}

.chat-input {
    padding: 16px 20px;
    background: white;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 12px;
    align-items: flex-end;
}

.chat-input textarea {
    flex: 1;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    font-family: inherit;
    resize: none;
    max-height: 120px;
    transition: border-color 0.2s;
}

.chat-input textarea:focus {
    outline: none;
    border-color: #667eea;
}

.chat-input textarea:disabled {
    background: #f9fafb;
    cursor: not-allowed;
}

.btn-send {
    width: 40px;
    height: 40px;
    border: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    flex-shrink: 0;
}

.btn-send:hover:not(:disabled) {
    transform: scale(1.05);
}

.btn-send:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.btn-send:active:not(:disabled) {
    transform: scale(0.95);
}

/* Scrollbar styling */
.chat-messages::-webkit-scrollbar {
    width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
    background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
}
</style>
