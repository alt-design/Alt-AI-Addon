/**
 * AI API Client
 *
 * Handles all API communication with OpenAI.
 * Reference: https://tiptap.dev/docs/content-ai/capabilities/agent/custom-llms/get-started/openai-responses
 */

/**
 * Call OpenAI API with the specified action and payload
 *
 * @param {string} action - The AI action to perform (completion, enhance, summarize, etc.)
 * @param {Object} payload - The data payload containing text and other parameters
 * @param {Object} options - Configuration options including apiKey and model settings
 * @returns {Promise<string>} The AI-generated response content
 * @throws {Error} If the API call fails
 */
export async function callAIAgent(action, payload, options) {
    // Import prompt builder
    const { buildPrompts } = await import('./ai-prompt-builder.js');

    // Build the system and user prompts based on the action
    const prompts = buildPrompts(action, payload);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
            model: options.model.name,
            messages: [
                {
                    role: 'system',
                    content: prompts.system
                },
                {
                    role: 'user',
                    content: prompts.user
                }
            ],
            temperature: options.model.temperature,
            max_tokens: options.model.max_tokens,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.statusText} - ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}
