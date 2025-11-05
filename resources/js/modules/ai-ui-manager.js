/**
 * AI UI Manager
 *
 * Handles all UI-related operations for the AI Agent including:
 * - Loading spinners
 * - AI Agent modal
 * - Conversation rendering
 */

/**
 * Show loading spinner in Bard editor
 * @param {Object} editor - TipTap editor instance
 * @returns {HTMLElement|null} The spinner element or null
 */
export function showLoadingSpinner(editor) {
    // Find the Bard editor container
    const editorElement = editor.view.dom;
    const bardContainer = editorElement.closest('.bard-fieldtype');

    if (!bardContainer) return null;

    // Check if spinner already exists
    let spinner = bardContainer.querySelector('.ai-loading-overlay');
    if (spinner) return spinner;

    // Create loading overlay
    spinner = document.createElement('div');
    spinner.className = 'ai-loading-overlay';
    spinner.innerHTML = `
        <div class="ai-loading-spinner">
            <svg class="ai-spinner-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            <div class="ai-loading-text">AI Processing...</div>
        </div>
    `;

    // Make sure the bard container has position relative
    if (getComputedStyle(bardContainer).position === 'static') {
        bardContainer.style.position = 'relative';
    }

    bardContainer.appendChild(spinner);
    return spinner;
}

/**
 * Hide loading spinner
 * @param {HTMLElement} spinner - The spinner element to hide
 */
export function hideLoadingSpinner(spinner) {
    if (spinner && spinner.parentNode) {
        spinner.parentNode.removeChild(spinner);
    }
}

/**
 * AI Agent Modal Manager
 * Handles the conversational AI modal interface
 */
export class AIAgentModal {
    constructor() {
        this.modal = null;
        this.conversation = [];
        this.currentEditor = null;
    }

    /**
     * Create and show the AI Agent modal
     * @param {Object} editor - TipTap editor instance
     */
    create(editor) {
        this.currentEditor = editor;

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'ai-agent-modal-overlay';
        overlay.innerHTML = `
            <div class="ai-agent-modal">
                <div class="ai-agent-header">
                    <div class="ai-agent-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>AI Writing Agent</span>
                    </div>
                    <button class="ai-agent-close" title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="ai-agent-messages"></div>
                <div class="ai-agent-input-area">
                    <textarea class="ai-agent-input" placeholder="Ask the AI to help with your content... (e.g., 'Make this more formal', 'Add more detail about X', 'Suggest improvements')" rows="2"></textarea>
                    <button class="ai-agent-send" title="Send (Enter)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.modal = overlay;

        // Show initial message or render conversation
        const messagesContainer = overlay.querySelector('.ai-agent-messages');
        if (this.conversation.length === 0) {
            this.showEmptyState(messagesContainer);
        } else {
            this.renderConversation(messagesContainer);
        }

        // Set up event listeners
        this.setupEventListeners(overlay, editor);
    }

    /**
     * Show empty state message
     * @param {HTMLElement} container - Messages container element
     */
    showEmptyState(container) {
        container.innerHTML = `
            <div class="ai-agent-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p><strong>AI Writing Agent is ready!</strong></p>
                <p>I can help you with your content. Ask me to improve text, add details, change tone, or make suggestions.</p>
                <p style="margin-top: 16px; font-size: 13px; color: #9ca3af;">I have access to your full document and any selected text.</p>
            </div>
        `;
    }

    /**
     * Set up event listeners for modal interactions
     * @param {HTMLElement} overlay - Modal overlay element
     * @param {Object} editor - TipTap editor instance
     */
    setupEventListeners(overlay, editor) {
        const closeBtn = overlay.querySelector('.ai-agent-close');
        const sendBtn = overlay.querySelector('.ai-agent-send');
        const input = overlay.querySelector('.ai-agent-input');

        closeBtn.onclick = () => this.close();
        overlay.onclick = (e) => {
            if (e.target === overlay) this.close();
        };

        sendBtn.onclick = () => this.sendMessage(editor, input);

        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(editor, input);
            }
        };

        input.focus();
    }

    /**
     * Close the modal
     */
    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }

    /**
     * Render the conversation history
     * @param {HTMLElement} container - Messages container element
     */
    renderConversation(container) {
        container.innerHTML = this.conversation.map(msg => `
            <div class="ai-agent-message ${msg.role}">
                <div class="ai-agent-message-content">${msg.content.replace(/\n/g, '<br>')}</div>
                ${msg.role === 'assistant' && msg.content.length > 50 ? `
                    <div class="ai-agent-message-actions">
                        <button class="ai-agent-action-btn" onclick="window.applyAgentSuggestion('${escape(msg.content)}')">
                            Apply to Editor
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Show loading indicator in conversation
     * @param {HTMLElement} container - Messages container element
     */
    showLoading(container) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-agent-message assistant';
        loadingDiv.innerHTML = '<div class="ai-agent-loading"><span></span><span></span><span></span></div>';
        container.appendChild(loadingDiv);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Send a message to the AI agent
     * @param {Object} editor - TipTap editor instance
     * @param {HTMLElement} input - Input textarea element
     */
    async sendMessage(editor, input) {
        const message = input.value.trim();
        if (!message) return;

        const messagesContainer = this.modal.querySelector('.ai-agent-messages');
        const sendBtn = this.modal.querySelector('.ai-agent-send');

        const config = Statamic.$store?.state?.statamic?.config?.altAiConfig || {};
        const agentEndpoint = config.endpoints?.agent || '/cp/alt-ai/agent';

        // Add user message
        this.conversation.push({
            role: 'user',
            content: message
        });

        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;

        // Render conversation with loading
        this.renderConversation(messagesContainer);
        this.showLoading(messagesContainer);

        try {
            // Get document content
            const documentContent = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n');
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, ' ');

            // Call backend
            const response = await fetch(agentEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': Statamic.$config.get('csrfToken'),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    message: message,
                    document_content: documentContent,
                    selected_text: selectedText,
                    conversation_history: this.conversation.slice(0, -1).slice(-10),
                }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            // Add assistant response
            this.conversation.push({
                role: 'assistant',
                content: data.message
            });

            this.renderConversation(messagesContainer);

        } catch (error) {
            console.error('AI Agent error:', error);
            this.conversation.push({
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again. ' + error.message
            });
            this.renderConversation(messagesContainer);
        } finally {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }

    /**
     * Apply a suggestion to the editor
     * @param {string} content - Content to apply
     */
    applySuggestion(content) {
        if (this.currentEditor) {
            const unescaped = unescape(content);
            const { from, to } = this.currentEditor.state.selection;
            if (from !== to) {
                this.currentEditor.commands.insertContentAt({ from, to }, unescaped);
            } else {
                this.currentEditor.commands.insertContent(unescaped);
            }
            this.close();
        }
    }
}
