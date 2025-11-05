/**
 * AI Prompt Builder
 *
 * Builds system and user prompts for different AI actions.
 * Each action has specific instructions optimized for the desired outcome.
 */

/**
 * Build system and user prompts based on the action type
 *
 * @param {string} action - The AI action to perform
 * @param {Object} payload - The data payload containing text and parameters
 * @param {string} payload.text - The text to process
 * @param {string} [payload.target_language] - Target language for translation
 * @param {string} [payload.tone] - Desired tone for tone adjustment
 * @returns {Object} Object containing system and user prompts
 */
export function buildPrompts(action, payload) {
    const { text, target_language, tone } = payload;

    switch (action) {
        case 'completion':
            return {
                system: 'You are a helpful AI writing assistant. Complete the user\'s text naturally and coherently, maintaining the same style and tone.',
                user: `Please complete the following text:\n\n${text}`
            };

        case 'enhance':
            return {
                system: 'You are a professional editor. Improve the given text by enhancing clarity, grammar, and readability while maintaining the original meaning and tone.',
                user: `Please enhance the following text:\n\n${text}`
            };

        case 'summarize':
            return {
                system: 'You are a skilled summarizer. Create a concise summary that captures the key points of the given text.',
                user: `Please summarize the following text:\n\n${text}`
            };

        case 'translate':
            return {
                system: `You are a professional translator. Translate the given text to ${target_language} while maintaining the original meaning, tone, and context.`,
                user: `Please translate the following text to ${target_language}:\n\n${text}`
            };

        case 'adjust_tone':
            return {
                system: `You are a writing expert. Adjust the tone of the given text to be more ${tone} while preserving the core message.`,
                user: `Please adjust the tone of the following text to be more ${tone}:\n\n${text}`
            };

        default:
            return {
                system: 'You are a helpful AI assistant.',
                user: text
            };
    }
}
