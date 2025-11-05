/**
 * Chat API Client
 *
 * Handles communication with the backend AI chat API.
 */

/**
 * Send a message to the AI chat API
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @param {Object} context - Current page context
 * @param {string} mode - Chat mode ('chat' or 'update_fields')
 * @returns {Promise<Object>} API response with message and optional field_updates
 */
export async function sendChatMessage(message, conversationHistory, context, mode = 'chat') {
    const config = Statamic.$store?.state?.statamic?.config?.altAiConfig || {};
    const chatEndpoint = config.endpoints?.chat || '/cp/alt-ai/chat';

    const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': Statamic.$config.get('csrfToken'),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
            message: message,
            conversation_history: conversationHistory.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            context: context,
            mode: mode
        }),
    });

    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
}
