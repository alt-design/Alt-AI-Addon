/**
 * Alt AI Addon for Statamic
 *
 * Preps the agent and kicks off the widget.
 */

import { initTiptapAiAgent } from './modules/tiptap-ai-agent.js';
import { initChatWidget } from './modules/chat-widget.js';

// Initialise - waits for Statamic to be ready
initTiptapAiAgent();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}
