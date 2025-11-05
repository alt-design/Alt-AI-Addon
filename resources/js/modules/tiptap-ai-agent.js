/**
 * TipTap AI Agent Extension for Statamic Bard
 *
 * This extension integrates TipTap's AI Agent capabilities into the Bard editor.
 * Reference: https://tiptap.dev/docs/content-ai/capabilities/agent/overview
 */

import { AIAgentModal } from './ai-ui-manager.js';
import { createAICommands } from './ai-commands.js';

// Global AI Agent Modal instance
let agentModal = null;

export function initTiptapAiAgent() {
    // Check if Statamic and Bard are available
    if (typeof Statamic === 'undefined' || !Statamic.$bard) {
        setTimeout(initTiptapAiAgent, 100);
        return;
    }

    // Initialize the AI Agent Modal
    agentModal = new AIAgentModal();

    // Register the Bard extension with Statamic
    Statamic.$bard.addExtension(() => {
        // Access TipTap Extension from Statamic's global scope
        const Extension = Statamic.$bard.tiptap.core.Extension;

        return Extension.create({
            name: 'aiAgent',

            addOptions() {
                // Access config from Vuex store (provided via provideToScript -> StatamicConfig -> Statamic.config())
                // The data flow is: Backend provideToScript() -> StatamicConfig JSON -> Statamic.config() -> Vuex store

                const config = Statamic.$store?.state?.statamic?.config?.altAiConfig || {};
                return {
                    apiKey: config.apiKey || '',
                    capabilities: config.capabilities || {
                        completion: true,
                        enhancement: true,
                        summarization: true,
                        translation: true,
                        tone_adjustment: true,
                    },
                    model: config.model || {
                        name: 'gpt-4',
                        temperature: 0.7,
                        max_tokens: 2000,
                    },
                    ui: config.ui || {
                        floating_menu: true,
                        keyboard_shortcuts: true,
                        show_suggestions: true,
                    },
                };
            },

            addKeyboardShortcuts() {
                const shortcuts = {};

                if (this.options.ui.keyboard_shortcuts) {
                    // AI Completion shortcut (Ctrl/Cmd + Space)
                    shortcuts['Mod-Space'] = () => {
                        return this.editor.commands.aiComplete();
                    };

                    // AI Enhancement shortcut (Ctrl/Cmd + Shift + E)
                    shortcuts['Mod-Shift-e'] = () => {
                        return this.editor.commands.aiEnhance();
                    };
                }

                return shortcuts;
            },

            onCreate() {
                // Initialize AI Agent
                const apiKey = this.options.apiKey;
                if (!apiKey) {
                    console.warn('TipTap AI Agent: API key not configured. Please set OPENAI_API_KEY in your .env file.');
                }
            },

            addCommands() {
                // Create and return AI commands using the commands module
                return createAICommands(this);
            },
        });
    });

    // Global function to apply suggestions from the AI Agent Modal
    window.applyAgentSuggestion = (content) => {
        if (agentModal) {
            agentModal.applySuggestion(content);
        }
    };

    // Register Bard toolbar buttons for AI features
    Statamic.$bard.buttons((buttons, buttonFn) => {
        return [
            buttonFn({
                name: 'aiAgent',
                text: __('AI Agent'),
                html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
                command: (editor) => agentModal.create(editor),
            }),
            buttonFn({
                name: 'aiComplete',
                text: __('AI Complete'),
                html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>',
                command: (editor) => editor.commands.aiComplete(),
            }),
            buttonFn({
                name: 'aiEnhance',
                text: __('AI Enhance'),
                html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>',
                command: (editor) => editor.commands.aiEnhance(),
            }),
            buttonFn({
                name: 'aiSummarize',
                text: __('AI Summarize'),
                html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
                command: (editor) => editor.commands.aiSummarize(),
            }),
        ];
    });
}
