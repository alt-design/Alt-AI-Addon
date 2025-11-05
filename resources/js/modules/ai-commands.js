/**
 * AI Commands
 *
 * TipTap command implementations for AI operations.
 * Each command handles editor interaction, API calls, and content updates.
 */

import { callAIAgent } from './ai-api-client.js';
import { showLoadingSpinner, hideLoadingSpinner } from './ai-ui-manager.js';

/**
 * Create AI commands for the TipTap extension
 *
 * @param {Object} extension - The TipTap extension instance
 * @returns {Object} Object containing all AI command implementations
 */
export function createAICommands(extension) {
    return {
        /**
         * AI Completion Command
         * Completes the text from the beginning to the current cursor position
         */
        aiComplete: () => ({ editor }) => {
            return (async () => {
                if (!extension.options.capabilities.completion) return false;

                const { from, to } = editor.state.selection;
                const text = editor.state.doc.textBetween(0, to, ' ');

                // Show loading spinner
                const spinner = showLoadingSpinner(editor);

                try {
                    const completion = await callAIAgent('completion', { text }, extension.options);
                    if (completion) {
                        editor.commands.insertContent(completion);
                    }
                    return true;
                } catch (error) {
                    console.error('AI Completion error:', error);
                    return false;
                } finally {
                    // Hide loading spinner
                    hideLoadingSpinner(spinner);
                }
            })();
        },

        /**
         * AI Enhancement Command
         * Enhances the selected text by improving clarity, grammar, and readability
         */
        aiEnhance: () => ({ editor }) => {
            return (async () => {
                if (!extension.options.capabilities.enhancement) return false;

                const { from, to } = editor.state.selection;
                const selectedText = editor.state.doc.textBetween(from, to, ' ');

                if (!selectedText) {
                    return false;
                }

                // Show loading spinner
                const spinner = showLoadingSpinner(editor);

                try {
                    const enhanced = await callAIAgent('enhance', { text: selectedText }, extension.options);
                    if (enhanced) {
                        editor.commands.insertContentAt({ from, to }, enhanced);
                    }
                    return true;
                } catch (error) {
                    console.error('AI Enhancement error:', error);
                    return false;
                } finally {
                    // Hide loading spinner
                    hideLoadingSpinner(spinner);
                }
            })();
        },

        /**
         * AI Summarization Command
         * Creates a summary of the selected text
         */
        aiSummarize: () => ({ editor }) => {
            return (async () => {
                if (!extension.options.capabilities.summarization) return false;

                const { from, to } = editor.state.selection;
                const selectedText = editor.state.doc.textBetween(from, to, ' ');

                if (!selectedText) {
                    return false;
                }

                // Show loading spinner
                const spinner = showLoadingSpinner(editor);

                try {
                    const summary = await callAIAgent('summarize', { text: selectedText }, extension.options);
                    if (summary) {
                        editor.commands.insertContentAt(to + 1, `\n\nSummary: ${summary}`);
                    }
                    return true;
                } catch (error) {
                    console.error('AI Summarization error:', error);
                    return false;
                } finally {
                    // Hide loading spinner
                    hideLoadingSpinner(spinner);
                }
            })();
        },

        /**
         * AI Translation Command
         * Translates the selected text to the specified language
         *
         * @param {string} language - Target language for translation
         */
        aiTranslate: (language) => ({ editor }) => {
            return (async () => {
                if (!extension.options.capabilities.translation) return false;

                const { from, to } = editor.state.selection;
                const selectedText = editor.state.doc.textBetween(from, to, ' ');

                if (!selectedText) {
                    return false;
                }

                // Show loading spinner
                const spinner = showLoadingSpinner(editor);

                try {
                    const translated = await callAIAgent('translate', {
                        text: selectedText,
                        target_language: language
                    }, extension.options);
                    if (translated) {
                        editor.commands.insertContentAt({ from, to }, translated);
                    }
                    return true;
                } catch (error) {
                    console.error('AI Translation error:', error);
                    return false;
                } finally {
                    // Hide loading spinner
                    hideLoadingSpinner(spinner);
                }
            })();
        },

        /**
         * AI Tone Adjustment Command
         * Adjusts the tone of the selected text
         *
         * @param {string} tone - Desired tone (formal, casual, professional, etc.)
         */
        aiAdjustTone: (tone) => ({ editor }) => {
            return (async () => {
                if (!extension.options.capabilities.tone_adjustment) return false;

                const { from, to } = editor.state.selection;
                const selectedText = editor.state.doc.textBetween(from, to, ' ');

                if (!selectedText) {
                    return false;
                }

                // Show loading spinner
                const spinner = showLoadingSpinner(editor);

                try {
                    const adjusted = await callAIAgent('adjust_tone', {
                        text: selectedText,
                        tone: tone
                    }, extension.options);
                    if (adjusted) {
                        editor.commands.insertContentAt({ from, to }, adjusted);
                    }
                    return true;
                } catch (error) {
                    console.error('AI Tone Adjustment error:', error);
                    return false;
                } finally {
                    // Hide loading spinner
                    hideLoadingSpinner(spinner);
                }
            })();
        },
    };
}
