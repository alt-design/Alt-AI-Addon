/**
 * Chat Template Builder
 *
 * Generates HTML templates for the chat widget interface.
 */

/**
 * Build the main chat widget HTML structure
 * @returns {string} HTML template
 */
export function buildChatWidgetTemplate() {
    return `
        <div class="chat-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="chat-badge hidden">0</span>
        </div>
        <div class="chat-window hidden">
            <div class="chat-header">
                <div class="chat-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>
                    </svg>
                    <span>Alt AI</span>
                </div>
                <div class="chat-actions">
                    <button class="chat-btn-icon chat-clear" title="Clear conversation">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <button class="chat-btn-icon chat-minimize" title="Minimize">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="chat-messages"></div>
            <div class="chat-input-area">
                <textarea class="chat-input" placeholder="Ask away!" rows="1"></textarea>
                <button class="chat-update-fields" title="Request AI to suggest field updates">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="chat-send" title="Send (Enter)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

/**
 * Build empty chat messages template
 * @returns {string} HTML template for empty chat state
 */
export function buildEmptyChatTemplate() {
    return `
        <div class="chat-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 12px 0 8px;">Hi! I'm your AI assistant.</p>
            <p style="font-size: 14px; color: #6b7280; margin: 0;">I can help you with content creation, editing, and questions about what you're working on.</p>
        </div>
    `;
}

/**
 * Build loading indicator template
 * @returns {string} HTML template for loading state
 */
export function buildLoadingTemplate() {
    return '<div class="chat-message-content"><div class="chat-loading"><span></span><span></span><span></span></div></div>';
}
