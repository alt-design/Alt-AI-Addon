/**
 * Chat State Manager
 *
 * Manages chat state including messages, minimized state, and session storage.
 */

/**
 * Chat state object
 */
export const chatState = {
    messages: [],
    isMinimized: true,
    unreadCount: 0,
    currentContext: {}
};

/**
 * Load chat messages from session storage
 * @returns {Array} Loaded messages or empty array
 */
export function loadMessages() {
    try {
        const saved = sessionStorage.getItem('ai-chat-messages');
        if (saved) {
            chatState.messages = JSON.parse(saved);
            return chatState.messages;
        }
    } catch (e) {
        console.error('Failed to load chat history:', e);
    }
    return [];
}

/**
 * Save chat messages to session storage
 * @param {Array} messages - Messages to save
 */
export function saveMessages(messages) {
    try {
        chatState.messages = messages;
        sessionStorage.setItem('ai-chat-messages', JSON.stringify(messages));
    } catch (e) {
        console.error('Failed to save chat history:', e);
    }
}

/**
 * Clear all chat messages
 */
export function clearMessages() {
    chatState.messages = [];
    sessionStorage.removeItem('ai-chat-messages');
}

/**
 * Add a message to the chat
 * @param {Object} message - Message object to add
 */
export function addMessage(message) {
    chatState.messages.push(message);
    saveMessages(chatState.messages);
}

/**
 * Get all messages
 * @returns {Array} All messages
 */
export function getMessages() {
    return chatState.messages;
}

/**
 * Set minimized state
 * @param {boolean} isMinimized - New minimized state
 */
export function setMinimized(isMinimized) {
    chatState.isMinimized = isMinimized;
    if (!isMinimized) {
        chatState.unreadCount = 0;
    }
}

/**
 * Get minimized state
 * @returns {boolean} Current minimized state
 */
export function isMinimized() {
    return chatState.isMinimized;
}

/**
 * Increment unread count
 */
export function incrementUnreadCount() {
    chatState.unreadCount++;
}

/**
 * Get unread count
 * @returns {number} Current unread count
 */
export function getUnreadCount() {
    return chatState.unreadCount;
}

/**
 * Set current context
 * @param {Object} context - Context object
 */
export function setCurrentContext(context) {
    chatState.currentContext = context;
}

/**
 * Get current context
 * @returns {Object} Current context
 */
export function getCurrentContext() {
    return chatState.currentContext;
}
