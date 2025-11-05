/**
 * TipTap AI Agent Extension for Statamic Bard
 *
 * This extension integrates TipTap's AI Agent capabilities into the Bard editor.
 * Reference: https://tiptap.dev/docs/content-ai/capabilities/agent/overview
 */

// Wait for Statamic to be ready before registering
(function() {
    // Function to initialize the addon
    function initTiptapAiAgent() {
        // Check if Statamic and Bard are available
        if (typeof Statamic === 'undefined' || !Statamic.$bard) {
            console.log('TipTap AI Agent: Waiting for Statamic Bard to load...');
            setTimeout(initTiptapAiAgent, 100);
            return;
        }

        console.log('TipTap AI Agent: Initializing...');

        // Helper function to show loading spinner in Bard editor
        const showLoadingSpinner = (editor) => {
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
                        <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>
                    </svg>
                    <div class="ai-loading-text">AI Processing...</div>
                </div>
            `;

            // Add styles if not already present
            if (!document.getElementById('ai-loading-styles')) {
                const styles = document.createElement('style');
                styles.id = 'ai-loading-styles';
                styles.textContent = `
                    .ai-loading-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.95);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        border-radius: 8px;
                    }
                    .ai-loading-spinner {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 12px;
                    }
                    .ai-spinner-icon {
                        color: #667eea;
                        animation: ai-spin 1s linear infinite;
                    }
                    @keyframes ai-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .ai-loading-text {
                        color: #667eea;
                        font-size: 14px;
                        font-weight: 600;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    }
                    .bard-fieldtype {
                        position: relative;
                    }
                `;
                document.head.appendChild(styles);
            }

            // Make sure the bard container has position relative
            if (getComputedStyle(bardContainer).position === 'static') {
                bardContainer.style.position = 'relative';
            }

            bardContainer.appendChild(spinner);
            return spinner;
        };

        // Helper function to hide loading spinner
        const hideLoadingSpinner = (spinner) => {
            if (spinner && spinner.parentNode) {
                spinner.parentNode.removeChild(spinner);
            }
        };

        // Helper functions for AI operations (defined outside Extension to be accessible)
        const callAIAgent = async (action, payload, options) => {
            // Call OpenAI API
            // Reference: https://tiptap.dev/docs/content-ai/capabilities/agent/custom-llms/get-started/openai-responses

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
        };

        const buildPrompts = (action, payload) => {
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
        };

        // Register the Bard extension with Statamic
        Statamic.$bard.addExtension(() => {
    // Access TipTap Extension from Statamic's global scope
    const Extension = Statamic.$bard.tiptap.core.Extension;

    return Extension.create({
        name: 'aiAgent',

        addOptions() {
            // Access config from Vuex store (provided via provideToScript -> StatamicConfig -> Statamic.config())
            // The data flow is: Backend provideToScript() -> StatamicConfig JSON -> Statamic.config() -> Vuex store
            console.log('TipTap AI Agent: Accessing config from Vuex store...');
            console.log('TipTap AI Agent: Statamic.$store exists:', !!Statamic.$store);
            console.log('TipTap AI Agent: Store state:', Statamic.$store?.state);
            console.log('TipTap AI Agent: Store statamic.config:', Statamic.$store?.state?.statamic?.config);

            const config = Statamic.$store?.state?.statamic?.config?.tiptapAiConfig || {};
            console.log('TipTap AI Agent: Received config from backend:', config);
            console.log('TipTap AI Agent: API Key value:', config.apiKey);
            console.log('TipTap AI Agent: API Key length:', config.apiKey ? config.apiKey.length : 0);
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
            } else {
                console.log('TipTap AI Agent initialized with capabilities:', this.options.capabilities);
            }
        },

        addCommands() {
            const extension = this;
            return {
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
                aiEnhance: () => ({ editor }) => {
                    return (async () => {
                        if (!extension.options.capabilities.enhancement) return false;

                        const { from, to } = editor.state.selection;
                        const selectedText = editor.state.doc.textBetween(from, to, ' ');

                        if (!selectedText) {
                            console.warn('Please select text to enhance');
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
                aiSummarize: () => ({ editor }) => {
                    return (async () => {
                        if (!extension.options.capabilities.summarization) return false;

                        const { from, to } = editor.state.selection;
                        const selectedText = editor.state.doc.textBetween(from, to, ' ');

                        if (!selectedText) {
                            console.warn('Please select text to summarize');
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
                aiTranslate: (language) => ({ editor }) => {
                    return (async () => {
                        if (!extension.options.capabilities.translation) return false;

                        const { from, to } = editor.state.selection;
                        const selectedText = editor.state.doc.textBetween(from, to, ' ');

                        if (!selectedText) {
                            console.warn('Please select text to translate');
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
                aiAdjustTone: (tone) => ({ editor }) => {
                    return (async () => {
                        if (!extension.options.capabilities.tone_adjustment) return false;

                        const { from, to } = editor.state.selection;
                        const selectedText = editor.state.doc.textBetween(from, to, ' ');

                        if (!selectedText) {
                            console.warn('Please select text to adjust tone');
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
        },
    });
});

        // AI Agent Modal functionality
        let agentModal = null;
        let agentConversation = [];
        let currentEditor = null;

        const createAgentModal = (editor) => {
            currentEditor = editor;

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

            // Add styles
            if (!document.getElementById('ai-agent-styles')) {
                const styles = document.createElement('style');
                styles.id = 'ai-agent-styles';
                styles.textContent = `
                    .ai-agent-modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                        animation: fadeIn 0.2s;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .ai-agent-modal {
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        width: 90%;
                        max-width: 700px;
                        max-height: 80vh;
                        display: flex;
                        flex-direction: column;
                        animation: slideUp 0.3s;
                    }
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .ai-agent-header {
                        padding: 20px;
                        border-bottom: 1px solid #e5e7eb;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .ai-agent-title {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-weight: 600;
                        font-size: 16px;
                        color: #1f2937;
                    }
                    .ai-agent-title svg {
                        color: #667eea;
                    }
                    .ai-agent-close {
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 8px;
                        border-radius: 6px;
                        color: #6b7280;
                        transition: all 0.2s;
                    }
                    .ai-agent-close:hover {
                        background: #f3f4f6;
                        color: #1f2937;
                    }
                    .ai-agent-messages {
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px;
                        background: #f9fafb;
                        min-height: 300px;
                    }
                    .ai-agent-message {
                        margin-bottom: 16px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .ai-agent-message.user {
                        align-items: flex-end;
                    }
                    .ai-agent-message.assistant {
                        align-items: flex-start;
                    }
                    .ai-agent-message-content {
                        max-width: 80%;
                        padding: 12px 16px;
                        border-radius: 12px;
                        line-height: 1.5;
                        font-size: 14px;
                    }
                    .ai-agent-message.user .ai-agent-message-content {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border-bottom-right-radius: 4px;
                    }
                    .ai-agent-message.assistant .ai-agent-message-content {
                        background: white;
                        color: #1f2937;
                        border-bottom-left-radius: 4px;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    }
                    .ai-agent-message-actions {
                        display: flex;
                        gap: 8px;
                    }
                    .ai-agent-action-btn {
                        padding: 6px 12px;
                        border: 1px solid #d1d5db;
                        background: white;
                        border-radius: 6px;
                        font-size: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                        color: #374151;
                    }
                    .ai-agent-action-btn:hover {
                        background: #f3f4f6;
                        border-color: #9ca3af;
                    }
                    .ai-agent-loading {
                        display: flex;
                        gap: 4px;
                        padding: 12px 16px;
                    }
                    .ai-agent-loading span {
                        width: 8px;
                        height: 8px;
                        background: #9ca3af;
                        border-radius: 50%;
                        animation: bounce 1.4s infinite ease-in-out both;
                    }
                    .ai-agent-loading span:nth-child(1) { animation-delay: -0.32s; }
                    .ai-agent-loading span:nth-child(2) { animation-delay: -0.16s; }
                    @keyframes bounce {
                        0%, 80%, 100% { transform: scale(0); }
                        40% { transform: scale(1); }
                    }
                    .ai-agent-input-area {
                        padding: 16px 20px;
                        border-top: 1px solid #e5e7eb;
                        display: flex;
                        gap: 12px;
                        align-items: flex-end;
                        background: white;
                    }
                    .ai-agent-input {
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
                    .ai-agent-input:focus {
                        outline: none;
                        border-color: #667eea;
                    }
                    .ai-agent-send {
                        width: 40px;
                        height: 40px;
                        border: none;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: opacity 0.2s, transform 0.1s;
                        flex-shrink: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .ai-agent-send:hover:not(:disabled) {
                        transform: scale(1.05);
                    }
                    .ai-agent-send:disabled {
                        opacity: 0.4;
                        cursor: not-allowed;
                    }
                    .ai-agent-empty {
                        text-align: center;
                        color: #6b7280;
                        padding: 40px 20px;
                    }
                    .ai-agent-empty svg {
                        opacity: 0.3;
                        margin-bottom: 16px;
                    }
                    .ai-agent-empty p {
                        margin: 8px 0;
                        line-height: 1.5;
                    }
                `;
                document.head.appendChild(styles);
            }

            document.body.appendChild(overlay);
            agentModal = overlay;

            // Show initial message
            const messagesContainer = overlay.querySelector('.ai-agent-messages');
            if (agentConversation.length === 0) {
                messagesContainer.innerHTML = `
                    <div class="ai-agent-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p><strong>AI Writing Agent is ready!</strong></p>
                        <p>I can help you with your content. Ask me to improve text, add details, change tone, or make suggestions.</p>
                        <p style="margin-top: 16px; font-size: 13px; color: #9ca3af;">I have access to your full document and any selected text.</p>
                    </div>
                `;
            } else {
                renderConversation(messagesContainer);
            }

            // Event listeners
            const closeBtn = overlay.querySelector('.ai-agent-close');
            const sendBtn = overlay.querySelector('.ai-agent-send');
            const input = overlay.querySelector('.ai-agent-input');

            closeBtn.onclick = closeAgentModal;
            overlay.onclick = (e) => {
                if (e.target === overlay) closeAgentModal();
            };

            sendBtn.onclick = () => sendAgentMessage(editor, input, messagesContainer, sendBtn);

            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAgentMessage(editor, input, messagesContainer, sendBtn);
                }
            };

            input.focus();
        };

        const closeAgentModal = () => {
            if (agentModal) {
                agentModal.remove();
                agentModal = null;
            }
        };

        const renderConversation = (container) => {
            container.innerHTML = agentConversation.map(msg => `
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
        };

        const sendAgentMessage = async (editor, input, messagesContainer, sendBtn) => {
            const message = input.value.trim();
            if (!message) return;

            const config = Statamic.$store?.state?.statamic?.config?.tiptapAiConfig || {};
            const agentEndpoint = config.endpoints?.agent || '/cp/tiptap-ai-agent/agent';

            // Add user message
            agentConversation.push({
                role: 'user',
                content: message
            });

            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;

            // Render conversation with loading
            renderConversation(messagesContainer);
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'ai-agent-message assistant';
            loadingDiv.innerHTML = '<div class="ai-agent-loading"><span></span><span></span><span></span></div>';
            messagesContainer.appendChild(loadingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

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
                        conversation_history: agentConversation.slice(0, -1).slice(-10),
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const data = await response.json();

                // Add assistant response
                agentConversation.push({
                    role: 'assistant',
                    content: data.message
                });

                renderConversation(messagesContainer);

            } catch (error) {
                console.error('AI Agent error:', error);
                agentConversation.push({
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again. ' + error.message
                });
                renderConversation(messagesContainer);
            } finally {
                input.disabled = false;
                sendBtn.disabled = false;
                input.focus();
            }
        };

        // Global function to apply suggestions
        window.applyAgentSuggestion = (content) => {
            if (currentEditor) {
                const unescaped = unescape(content);
                const { from, to } = currentEditor.state.selection;
                if (from !== to) {
                    currentEditor.commands.insertContentAt({ from, to }, unescaped);
                } else {
                    currentEditor.commands.insertContent(unescaped);
                }
                closeAgentModal();
            }
        };

        // Register Bard toolbar buttons for AI features
        console.log('TipTap AI Agent: Registering buttons...');

        Statamic.$bard.buttons((buttons, buttonFn) => {
            return [
                buttonFn({
                    name: 'aiAgent',
                    text: __('AI Agent'),
                    html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
                    command: (editor) => createAgentModal(editor),
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

        console.log('TipTap AI Agent: Successfully registered extension and buttons');
    }

    // Start initialization
    initTiptapAiAgent();

    // Global AI Chat Widget (vanilla JavaScript implementation)
    let chatWidget = null;
    let chatMessages = [];
    let chatIsMinimized = true;
    let chatUnreadCount = 0;
    let currentContext = {};

    // Helper function to extract plain text from Bard JSON structure
    const extractTextFromBard = (bardContent) => {
        if (!bardContent || typeof bardContent !== 'object') {
            return '';
        }

        let text = '';

        // Recursive function to extract text from nodes
        const extractFromNode = (node) => {
            // If node has text property, add it
            if (node.text) {
                text += node.text;
            }

            // If node has content array, recurse through it
            if (node.content && Array.isArray(node.content)) {
                node.content.forEach(childNode => {
                    extractFromNode(childNode);
                    // Add space or newline between blocks
                    if (childNode.type === 'paragraph' || childNode.type === 'heading') {
                        text += ' ';
                    }
                });
            }
        };

        // Start extraction from root
        if (bardContent.content && Array.isArray(bardContent.content)) {
            bardContent.content.forEach(node => {
                extractFromNode(node);
            });
        } else {
            extractFromNode(bardContent);
        }

        return text.trim();
    };

    // Function to extract context from current page
    const extractContext = () => {
        const context = {
            route: window.location.pathname
        };

        // Extract collection name from URL
        // Pattern: /cp/collections/{collection_name}/...
        const pathParts = window.location.pathname.split('/');
        if (pathParts.includes('collections')) {
            const collectionIndex = pathParts.indexOf('collections');
            if (pathParts[collectionIndex + 1]) {
                context.collection = pathParts[collectionIndex + 1];
            }
        }

        // Extract taxonomy name from URL
        // Pattern: /cp/taxonomies/{taxonomy_name}/...
        if (pathParts.includes('taxonomies')) {
            const taxonomyIndex = pathParts.indexOf('taxonomies');
            if (pathParts[taxonomyIndex + 1]) {
                context.taxonomy = pathParts[taxonomyIndex + 1];
            }
        }

        // Extract globals name from URL
        // Pattern: /cp/globals/{global_name}/...
        if (pathParts.includes('globals')) {
            const globalsIndex = pathParts.indexOf('globals');
            if (pathParts[globalsIndex + 1]) {
                context.global = pathParts[globalsIndex + 1];
            }
        }

        // Extract entry ID from URL (last segment after /entries/)
        if (pathParts.includes('entries')) {
            const entriesIndex = pathParts.indexOf('entries');
            if (pathParts[entriesIndex + 1] && pathParts[entriesIndex + 1] !== 'create') {
                context.entry_id = pathParts[entriesIndex + 1];
            }
        }

        // Try to get comprehensive context from Statamic's Vuex store (preferred) or Vue component tree (fallback)
        try {
            let publishData = null;

            // PREFERRED METHOD: Access publish data from Vuex store
            // Statamic stores publish form data in a dynamic Vuex module at publish/{name}
            // The default name is 'base' for most entry/term/global forms
            if (Statamic.$store && Statamic.$store.state && Statamic.$store.state.publish) {
                // Try common publish module names
                const publishModuleNames = ['base', 'default', 'entry', 'term', 'global'];

                for (const moduleName of publishModuleNames) {
                    if (Statamic.$store.state.publish[moduleName]) {
                        publishData = {
                            values: Statamic.$store.state.publish[moduleName].values || {},
                            blueprint: Statamic.$store.state.publish[moduleName].blueprint || null,
                            meta: Statamic.$store.state.publish[moduleName].meta || {},
                            site: Statamic.$store.state.publish[moduleName].site || null,
                            isRoot: Statamic.$store.state.publish[moduleName].isRoot || false,
                        };
                        console.log('TipTap AI Agent: Context extracted from Vuex store (publish.' + moduleName + ')');
                        break;
                    }
                }
            }

            // FALLBACK METHOD: If Vuex store doesn't have publish data, traverse component tree
            if (!publishData || Object.keys(publishData.values).length === 0) {
                console.log('TipTap AI Agent: Vuex store empty, falling back to component traversal');

                if (Statamic.$app && Statamic.$app.$children) {
                    // Try to find publish component
                    const findPublishComponent = (component) => {
                        if (!component) return null;

                        // Check if this is a publish component
                        if (component.$options && component.$options.name === 'publish-form') {
                            return component;
                        }

                        // Check refs for publish component
                        if (component.$refs && component.$refs.publish) {
                            return component.$refs.publish;
                        }

                        // Recursively search children
                        if (component.$children && component.$children.length > 0) {
                            for (let child of component.$children) {
                                const found = findPublishComponent(child);
                                if (found) return found;
                            }
                        }

                        return null;
                    };

                    const publishComponent = findPublishComponent(Statamic.$app);

                    if (publishComponent) {
                        publishData = {
                            values: publishComponent.values || {},
                            blueprint: publishComponent.blueprint || null,
                            meta: publishComponent.meta || {},
                            site: publishComponent.site || null,
                            isRoot: publishComponent.isRoot || false,
                        };
                        console.log('TipTap AI Agent: Context extracted from Vue component tree');
                    }
                }
            }

            // Process the publish data if we found it (from either Vuex or component)
            if (publishData && publishData.values) {
                // Get blueprint name/handle only (not the entire blueprint object which may contain circular references)
                if (publishData.blueprint) {
                    // Extract only the name/handle from blueprint, not the entire complex object
                    if (typeof publishData.blueprint === 'string') {
                        context.blueprint = publishData.blueprint;
                    } else if (typeof publishData.blueprint === 'object' && publishData.blueprint !== null) {
                        // Blueprint is an object - extract only the handle/name
                        context.blueprint = publishData.blueprint.handle || publishData.blueprint.name || publishData.blueprint.namespace || null;
                    }
                }

                // Extract field labels from blueprint to create handle → display name mapping
                // This allows the AI to understand the relationship between field handles and their display labels
                context.field_labels = {};
                if (publishData.blueprint && typeof publishData.blueprint === 'object' && publishData.blueprint.tabs) {
                    // Blueprint structure: { tabs: [ { sections: [ { fields: [ { handle, display, type, ... } ] } ] } ] }
                    publishData.blueprint.tabs.forEach(tab => {
                        if (tab.sections && Array.isArray(tab.sections)) {
                            tab.sections.forEach(section => {
                                if (section.fields && Array.isArray(section.fields)) {
                                    section.fields.forEach(field => {
                                        if (field.handle && field.display) {
                                            context.field_labels[field.handle] = field.display;
                                        }
                                    });
                                }
                            });
                        }
                    });
                    console.log('TipTap AI Agent: Extracted field labels:', context.field_labels);
                }

                // Get entry values (contains all field data)
                // Extract specific important metadata fields first
                if (publishData.values.title) {
                    context.title = publishData.values.title;
                }
                if (publishData.values.slug) {
                    context.slug = publishData.values.slug;
                }
                if (publishData.values.published !== undefined) {
                    context.status = publishData.values.published ? 'published' : 'draft';
                }

                // Now extract ALL field values from the page
                // This gives the AI complete context about what the user is working on
                context.fields = {};

                // Fields to exclude (system/internal fields that don't add useful context)
                const excludedFields = [
                    'id', 'blueprint', 'published', 'slug', 'title', // Already extracted above
                    'updated_by', 'updated_at', 'created_at', // Timestamps (we capture these separately)
                    'origin', 'site', 'locale', // Site/locale (captured separately)
                ];

                // Iterate through all field values
                Object.keys(publishData.values).forEach(fieldName => {
                    // Skip excluded fields
                    if (excludedFields.includes(fieldName)) {
                        return;
                    }

                    const fieldValue = publishData.values[fieldName];

                    // Skip null, undefined, or empty values
                    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
                        return;
                    }

                    // Debug logging for Bard fields
                    if (fieldName === 'description' || fieldName === 'additional_information' || fieldName === 'contact_information' || fieldName === 'viewing_information') {
                        console.log(`TipTap AI Agent: Bard field "${fieldName}" structure:`, fieldValue);
                        console.log(`TipTap AI Agent: Field type:`, typeof fieldValue);
                        console.log(`TipTap AI Agent: Is array:`, Array.isArray(fieldValue));
                        console.log(`TipTap AI Agent: Has content property:`, fieldValue && typeof fieldValue === 'object' && 'content' in fieldValue);
                    }

                    // Format the value based on its type
                    let formattedValue = fieldValue;

                    // Handle arrays (tags, categories, etc.)
                    if (Array.isArray(fieldValue)) {
                        if (fieldValue.length === 0) return; // Skip empty arrays

                        // Check if this is an array of Bard content blocks (Statamic v3/v4 format)
                        // Bard fields can be arrays of objects with type/content structure
                        const hasBardStructure = fieldValue.length > 0 &&
                                                 fieldValue.every(item => typeof item === 'object' &&
                                                                         (item.type === 'paragraph' || item.type === 'heading' || item.type === 'set' || item.content));

                        if (hasBardStructure) {
                            console.log(`TipTap AI Agent: Detected Bard array structure for "${fieldName}"`);
                            // This is a Bard field - extract text from the array of content blocks
                            let bardText = '';
                            fieldValue.forEach(block => {
                                const blockText = extractTextFromBard(block);
                                if (blockText) {
                                    bardText += blockText + ' ';
                                }
                            });
                            formattedValue = bardText.trim();
                            console.log(`TipTap AI Agent: Extracted Bard text from "${fieldName}":`, formattedValue.substring(0, 100) + '...');

                            if (!formattedValue || formattedValue.length === 0) return; // Skip if no text extracted
                        } else {
                            // Regular array (tags, categories, etc.)
                            formattedValue = fieldValue;
                        }
                    }
                    // Handle Bard/rich text content (single object with content property)
                    else if (typeof fieldValue === 'object' && fieldValue.content) {
                        console.log(`TipTap AI Agent: Detected Bard object structure for "${fieldName}"`);
                        // Extract text from Bard JSON structure
                        formattedValue = extractTextFromBard(fieldValue);
                        console.log(`TipTap AI Agent: Extracted Bard text from "${fieldName}":`, formattedValue ? formattedValue.substring(0, 100) + '...' : 'EMPTY');
                        if (!formattedValue || formattedValue.trim().length === 0) return; // Skip if no text content
                    }
                    // Handle objects (could be assets, relationships, etc.)
                    else if (typeof fieldValue === 'object') {
                        // Try to extract meaningful data from object
                        if (fieldValue.value !== undefined) {
                            formattedValue = fieldValue.value;
                        } else if (fieldValue.url) {
                            formattedValue = fieldValue.url;
                        } else if (fieldValue.path) {
                            formattedValue = fieldValue.path;
                        } else {
                            // For complex objects, store as is (will be JSON stringified later)
                            formattedValue = fieldValue;
                        }
                    }
                    // Handle booleans
                    else if (typeof fieldValue === 'boolean') {
                        formattedValue = fieldValue;
                    }
                    // Handle strings and numbers
                    else {
                        formattedValue = fieldValue;
                    }

                    // Add to context
                    context.fields[fieldName] = formattedValue;
                });

                // Also keep specific fields at top level for backwards compatibility
                if (publishData.values.date) {
                    context.date = publishData.values.date;
                }
                if (publishData.values.created_at) {
                    context.created_at = publishData.values.created_at;
                }
                if (publishData.values.updated_at) {
                    context.updated_at = publishData.values.updated_at;
                }
                if (publishData.values.categories && Array.isArray(publishData.values.categories)) {
                    context.categories = publishData.values.categories;
                }
                if (publishData.values.tags && Array.isArray(publishData.values.tags)) {
                    context.tags = publishData.values.tags;
                }
                if (publishData.values.author) {
                    context.author = publishData.values.author;
                }
                if (publishData.values.parent) {
                    context.parent = publishData.values.parent;
                }

                // Get meta information from publish data
                if (publishData.meta) {
                    // Permalink/URL
                    if (publishData.meta.permalink) {
                        context.permalink = publishData.meta.permalink;
                    }
                }

                // Site information (multisite)
                if (publishData.site) {
                    context.site = publishData.site;
                }

                // Locale/Language
                if (publishData.locale) {
                    context.locale = publishData.locale;
                }

                // Collection handle (might be different from URL)
                if (publishData.collection) {
                    context.collection = publishData.collection;
                }

                // Check if it's a new entry (only available from Vuex store)
                if (publishData.isRoot !== undefined) {
                    context.is_root = publishData.isRoot;
                }
            }

            // Get current user information from Statamic config
            if (Statamic.$config && typeof Statamic.$config.get === 'function') {
                const user = Statamic.$config.get('user');
                if (user) {
                    context.current_user = {
                        name: user.name || user.email,
                        email: user.email,
                        id: user.id
                    };
                }

                // Get site information
                const selectedSite = Statamic.$config.get('selectedSite');
                if (selectedSite && !context.site) {
                    context.site = selectedSite;
                }

                // Get multisite status
                const multisiteEnabled = Statamic.$config.get('multisiteEnabled');
                if (multisiteEnabled !== undefined) {
                    context.multisite = multisiteEnabled;
                }
            }
        } catch (e) {
            console.debug('TipTap AI Agent: Could not access Vue components for context', e);
        }

        // Fallback: Try to get title from DOM input fields
        if (!context.title) {
            const titleInput = document.querySelector('input[name="title"]');
            if (titleInput && titleInput.value) {
                context.title = titleInput.value;
            }
        }

        // Try to get blueprint from meta tags or data attributes
        if (!context.blueprint) {
            const blueprintMeta = document.querySelector('[data-blueprint]');
            if (blueprintMeta) {
                context.blueprint = blueprintMeta.getAttribute('data-blueprint');
            }
        }

        // Extract page type from route
        if (pathParts.includes('collections')) {
            context.page_type = 'collection_entry';
        } else if (pathParts.includes('taxonomies')) {
            context.page_type = 'taxonomy_term';
        } else if (pathParts.includes('globals')) {
            context.page_type = 'global';
        } else if (pathParts.includes('assets')) {
            context.page_type = 'asset';
        } else if (pathParts.includes('navigation')) {
            context.page_type = 'navigation';
        } else {
            context.page_type = 'other';
        }

        console.log('TipTap AI Agent: Extracted context:', context);
        return context;
    };

    const createChatWidget = () => {
        console.log('TipTap AI Agent: Creating chat widget...');

        // Extract initial context
        currentContext = extractContext();

        // Load saved messages
        try {
            const saved = sessionStorage.getItem('ai-chat-messages');
            if (saved) {
                chatMessages = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
        }

        // Create widget container
        const widget = document.createElement('div');
        widget.id = 'ai-chat-widget';
        widget.className = 'ai-chat-widget minimized';

        widget.innerHTML = `
            <div class="chat-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="chat-badge" style="display: none;">0</span>
            </div>
            <div class="chat-window" style="display: none;">
                <div class="chat-header">
                    <div class="chat-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>
                        </svg>
                        <span>AI Assistant</span>
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
                    <textarea class="chat-input" placeholder="Ask me anything... (Shift+Enter for new line)" rows="1"></textarea>
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

        // Add styles
        if (!document.getElementById('ai-chat-widget-styles')) {
            const styles = document.createElement('style');
            styles.id = 'ai-chat-widget-styles';
            styles.textContent = `
                .ai-chat-widget {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                }
                .ai-chat-widget .chat-button {
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
                .ai-chat-widget .chat-button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
                }
                .ai-chat-widget .chat-badge {
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
                .ai-chat-widget.minimized .chat-window {
                    display: none !important;
                }
                .ai-chat-widget:not(.minimized) .chat-button {
                    display: none !important;
                }
                .ai-chat-widget .chat-window {
                    width: 380px;
                    height: 600px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .ai-chat-widget .chat-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .ai-chat-widget .chat-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 600;
                    font-size: 16px;
                }
                .ai-chat-widget .chat-actions {
                    display: flex;
                    gap: 8px;
                }
                .ai-chat-widget .chat-btn-icon {
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
                .ai-chat-widget .chat-btn-icon:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                .ai-chat-widget .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: #f9fafb;
                }
                .ai-chat-widget .chat-empty {
                    text-align: center;
                    color: #6b7280;
                    padding: 40px 20px;
                }
                .ai-chat-widget .chat-empty svg {
                    opacity: 0.3;
                    margin-bottom: 16px;
                }
                .ai-chat-widget .chat-empty p {
                    margin: 8px 0;
                    line-height: 1.5;
                    font-size: 14px;
                }
                .ai-chat-widget .chat-message {
                    margin-bottom: 16px;
                    display: flex;
                }
                .ai-chat-widget .chat-message.user {
                    justify-content: flex-end;
                }
                .ai-chat-widget .chat-message.assistant {
                    justify-content: flex-start;
                }
                .ai-chat-widget .chat-message-content {
                    max-width: 75%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    line-height: 1.5;
                    font-size: 14px;
                }
                .ai-chat-widget .chat-message.user .chat-message-content {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-bottom-right-radius: 4px;
                }
                .ai-chat-widget .chat-message.assistant .chat-message-content {
                    background: white;
                    color: #1f2937;
                    border-bottom-left-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                .ai-chat-widget .chat-loading {
                    display: flex;
                    gap: 4px;
                    padding: 4px 0;
                }
                .ai-chat-widget .chat-loading span {
                    width: 8px;
                    height: 8px;
                    background: #9ca3af;
                    border-radius: 50%;
                    animation: chatBounce 1.4s infinite ease-in-out both;
                }
                .ai-chat-widget .chat-loading span:nth-child(1) { animation-delay: -0.32s; }
                .ai-chat-widget .chat-loading span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes chatBounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
                .ai-chat-widget .chat-input-area {
                    padding: 16px 20px;
                    background: white;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 12px;
                    align-items: flex-end;
                }
                .ai-chat-widget .chat-input {
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
                .ai-chat-widget .chat-input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                .ai-chat-widget .chat-input:disabled {
                    background: #f9fafb;
                    cursor: not-allowed;
                }
                .ai-chat-widget .chat-update-fields {
                    width: 40px;
                    height: 40px;
                    border: 1px solid #667eea;
                    background: white;
                    color: #667eea;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .ai-chat-widget .chat-update-fields:hover:not(:disabled) {
                    background: #667eea;
                    color: white;
                    transform: scale(1.05);
                }
                .ai-chat-widget .chat-update-fields:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                .ai-chat-widget .chat-send {
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
                .ai-chat-widget .chat-send:hover:not(:disabled) {
                    transform: scale(1.05);
                }
                .ai-chat-widget .chat-send:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                .ai-chat-widget .field-updates-card {
                    background: #f0f9ff;
                    border: 2px solid #3b82f6;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 8px 0;
                }
                .ai-chat-widget .field-updates-header {
                    font-weight: 600;
                    color: #1e40af;
                    margin-bottom: 8px;
                    font-size: 13px;
                }
                .ai-chat-widget .field-change-item {
                    background: white;
                    border-radius: 6px;
                    padding: 10px;
                    margin: 6px 0;
                    border-left: 3px solid #3b82f6;
                }
                .ai-chat-widget .field-change-field {
                    font-weight: 600;
                    color: #1f2937;
                    font-size: 12px;
                    margin-bottom: 4px;
                }
                .ai-chat-widget .field-change-values {
                    font-size: 12px;
                    line-height: 1.4;
                }
                .ai-chat-widget .field-change-current {
                    color: #dc2626;
                    text-decoration: line-through;
                    margin-bottom: 2px;
                }
                .ai-chat-widget .field-change-proposed {
                    color: #16a34a;
                    font-weight: 500;
                }
                .ai-chat-widget .field-change-reason {
                    font-size: 11px;
                    color: #6b7280;
                    font-style: italic;
                    margin-top: 4px;
                }
                .ai-chat-widget .field-updates-actions {
                    margin-top: 10px;
                    display: flex;
                    gap: 8px;
                }
                .ai-chat-widget .apply-changes-btn {
                    flex: 1;
                    padding: 8px 16px;
                    background: #16a34a;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .ai-chat-widget .apply-changes-btn:hover {
                    background: #15803d;
                }
                .ai-chat-widget .cancel-changes-btn {
                    padding: 8px 16px;
                    background: #e5e7eb;
                    color: #374151;
                    border: none;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .ai-chat-widget .cancel-changes-btn:hover {
                    background: #d1d5db;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(widget);
        chatWidget = widget;

        // Get elements
        const chatButton = widget.querySelector('.chat-button');
        const chatWindow = widget.querySelector('.chat-window');
        const minimizeBtn = widget.querySelector('.chat-minimize');
        const clearBtn = widget.querySelector('.chat-clear');
        const messagesContainer = widget.querySelector('.chat-messages');
        const input = widget.querySelector('.chat-input');
        const updateFieldsBtn = widget.querySelector('.chat-update-fields');
        const sendBtn = widget.querySelector('.chat-send');
        const badge = widget.querySelector('.chat-badge');

        // Event handlers
        const toggleMinimize = () => {
            chatIsMinimized = !chatIsMinimized;
            widget.classList.toggle('minimized', chatIsMinimized);
            chatWindow.style.display = chatIsMinimized ? 'none' : 'flex';
            chatButton.style.display = chatIsMinimized ? 'flex' : 'none';

            if (!chatIsMinimized) {
                chatUnreadCount = 0;
                badge.style.display = 'none';
                renderMessages();
                setTimeout(() => input.focus(), 100);
            }
        };

        const renderMessages = () => {
            if (chatMessages.length === 0) {
                // Build comprehensive context info string
                let contextSections = [];

                // Entry Information
                let entryInfo = '';
                if (currentContext.title) {
                    entryInfo += `<strong>Title:</strong> ${currentContext.title}<br>`;
                }
                if (currentContext.slug) {
                    entryInfo += `<strong>Slug:</strong> ${currentContext.slug}<br>`;
                }
                if (currentContext.status) {
                    const statusBadge = currentContext.status === 'published'
                        ? '<span style="color: #10b981;">●</span>'
                        : '<span style="color: #f59e0b;">●</span>';
                    entryInfo += `<strong>Status:</strong> ${statusBadge} ${currentContext.status.charAt(0).toUpperCase() + currentContext.status.slice(1)}<br>`;
                }
                if (currentContext.is_new) {
                    entryInfo += `<strong>Mode:</strong> Creating new entry<br>`;
                } else if (currentContext.has_changes) {
                    entryInfo += `<strong>Changes:</strong> Unsaved changes present<br>`;
                }
                if (entryInfo) {
                    contextSections.push(`<div style="margin-bottom: 12px;"><strong style="color: #667eea;">Entry</strong><br>${entryInfo}</div>`);
                }

                // Structure
                let structureInfo = '';
                if (currentContext.collection) {
                    structureInfo += `<strong>Collection:</strong> ${currentContext.collection}<br>`;
                }
                if (currentContext.blueprint) {
                    structureInfo += `<strong>Blueprint:</strong> ${currentContext.blueprint}<br>`;
                }
                if (currentContext.taxonomy) {
                    structureInfo += `<strong>Taxonomy:</strong> ${currentContext.taxonomy}<br>`;
                }
                if (currentContext.global) {
                    structureInfo += `<strong>Global:</strong> ${currentContext.global}<br>`;
                }
                if (currentContext.page_type) {
                    structureInfo += `<strong>Type:</strong> ${currentContext.page_type.replace(/_/g, ' ')}<br>`;
                }
                if (structureInfo) {
                    contextSections.push(`<div style="margin-bottom: 12px;"><strong style="color: #667eea;">Structure</strong><br>${structureInfo}</div>`);
                }

                // Dates & Timeline
                let dateInfo = '';
                if (currentContext.auction_date) {
                    dateInfo += `<strong>Auction:</strong> ${currentContext.auction_date}<br>`;
                }
                if (currentContext.date) {
                    dateInfo += `<strong>Date:</strong> ${currentContext.date}<br>`;
                }
                if (currentContext.created_at) {
                    dateInfo += `<strong>Created:</strong> ${currentContext.created_at}<br>`;
                }
                if (currentContext.updated_at) {
                    dateInfo += `<strong>Updated:</strong> ${currentContext.updated_at}<br>`;
                }
                if (dateInfo) {
                    contextSections.push(`<div style="margin-bottom: 12px;"><strong style="color: #667eea;">Timeline</strong><br>${dateInfo}</div>`);
                }

                // Classification
                let classificationInfo = '';
                if (currentContext.categories && Array.isArray(currentContext.categories) && currentContext.categories.length > 0) {
                    classificationInfo += `<strong>Categories:</strong> ${currentContext.categories.join(', ')}<br>`;
                }
                if (currentContext.tags && Array.isArray(currentContext.tags) && currentContext.tags.length > 0) {
                    classificationInfo += `<strong>Tags:</strong> ${currentContext.tags.join(', ')}<br>`;
                }
                if (currentContext.featured !== undefined) {
                    classificationInfo += `<strong>Featured:</strong> ${currentContext.featured ? 'Yes' : 'No'}<br>`;
                }
                if (classificationInfo) {
                    contextSections.push(`<div style="margin-bottom: 12px;"><strong style="color: #667eea;">Classification</strong><br>${classificationInfo}</div>`);
                }

                // Auction Details
                let auctionInfo = '';
                if (currentContext.auctioneer) {
                    auctionInfo += `<strong>Auctioneer:</strong> ${currentContext.auctioneer}<br>`;
                }
                if (currentContext.location) {
                    auctionInfo += `<strong>Location:</strong> ${currentContext.location}<br>`;
                }
                if (auctionInfo) {
                    contextSections.push(`<div style="margin-bottom: 12px;"><strong style="color: #667eea;">Auction Details</strong><br>${auctionInfo}</div>`);
                }

                // User Information
                let userInfo = '';
                if (currentContext.current_user) {
                    userInfo += `<strong>You:</strong> ${currentContext.current_user.name || currentContext.current_user.email}<br>`;
                }
                if (currentContext.author && currentContext.author !== currentContext.current_user?.name) {
                    userInfo += `<strong>Author:</strong> ${currentContext.author}<br>`;
                }
                if (userInfo) {
                    contextSections.push(`<div style="margin-bottom: 12px;"><strong style="color: #667eea;">User</strong><br>${userInfo}</div>`);
                }

                // Site & Localization
                let siteInfo = '';
                if (currentContext.site) {
                    siteInfo += `<strong>Site:</strong> ${currentContext.site}<br>`;
                }
                if (currentContext.locale) {
                    siteInfo += `<strong>Locale:</strong> ${currentContext.locale}<br>`;
                }
                if (siteInfo) {
                    contextSections.push(`<div style="margin-bottom: 12px;"><strong style="color: #667eea;">Site</strong><br>${siteInfo}</div>`);
                }

                // Field Values - show count of all visible fields
                if (currentContext.fields && typeof currentContext.fields === 'object') {
                    const fieldCount = Object.keys(currentContext.fields).length;
                    if (fieldCount > 0) {
                        const fieldNames = Object.keys(currentContext.fields).slice(0, 5).map(name =>
                            name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        ).join(', ');
                        const moreCount = fieldCount > 5 ? ` and ${fieldCount - 5} more` : '';
                        contextSections.push(`<div style="margin-bottom: 12px;"><strong style="color: #667eea;">Field Values</strong><br><strong>Available Fields (${fieldCount}):</strong> ${fieldNames}${moreCount}<br><span style="font-size: 11px; color: #9ca3af; font-style: italic;">I can see all field values on this page</span></div>`);
                    }
                }

                // Fallback to route if no specific context
                if (contextSections.length === 0 && currentContext.route) {
                    contextSections.push(`<div style="margin-bottom: 12px;"><strong style="color: #667eea;">Location</strong><br><strong>Page:</strong> ${currentContext.route}</div>`);
                }

                const contextSection = contextSections.length > 0 ? `
                    <div style="margin-top: 20px; padding: 16px; background: rgba(102, 126, 234, 0.05); border-radius: 8px; text-align: left; font-size: 12px; color: #4b5563; line-height: 1.6;">
                        <div style="margin-bottom: 12px; font-weight: 600; color: #667eea; font-size: 13px;">📍 Context I Have Access To:</div>
                        ${contextSections.join('')}
                        <div style="margin-top: 12px; font-size: 11px; color: #9ca3af; font-style: italic;">
                            I can answer questions about all this information and provide context-aware assistance.
                        </div>
                    </div>
                ` : '';

                messagesContainer.innerHTML = `
                    <div class="chat-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 12px 0 8px;">Hi! I'm your AI assistant.</p>
                        <p style="font-size: 14px; color: #6b7280; margin: 0;">I can help you with content creation, editing, and questions about what you're working on.</p>
                        ${contextSection}
                    </div>
                `;
            } else {
                messagesContainer.innerHTML = chatMessages.map((msg, index) => {
                    let messageHTML = `<div class="chat-message ${msg.role}">`;
                    messageHTML += `<div class="chat-message-content">${msg.content.replace(/\n/g, '<br>')}</div>`;

                    // Display field updates if present
                    if (msg.field_updates && msg.field_updates.changes && msg.field_updates.changes.length > 0) {
                        messageHTML += `<div class="field-updates-card">`;
                        messageHTML += `<div class="field-updates-header">📝 Proposed Field Changes (${msg.field_updates.changes.length})</div>`;

                        msg.field_updates.changes.forEach(change => {
                            const fieldName = change.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            const currentValue = change.current_value || '(empty)';
                            const proposedValue = change.proposed_value;
                            const reason = change.reason || '';

                            messageHTML += `<div class="field-change-item">`;
                            messageHTML += `<div class="field-change-field">${fieldName}</div>`;
                            messageHTML += `<div class="field-change-values">`;
                            messageHTML += `<div class="field-change-current">Current: ${currentValue.substring(0, 100)}${currentValue.length > 100 ? '...' : ''}</div>`;
                            messageHTML += `<div class="field-change-proposed">Proposed: ${proposedValue.substring(0, 100)}${proposedValue.length > 100 ? '...' : ''}</div>`;
                            if (reason) {
                                messageHTML += `<div class="field-change-reason">${reason}</div>`;
                            }
                            messageHTML += `</div></div>`;
                        });

                        messageHTML += `<div class="field-updates-actions">`;
                        messageHTML += `<button class="apply-changes-btn" onclick="window.applyAIChatFieldChanges(${index})">Apply Changes</button>`;
                        messageHTML += `<button class="cancel-changes-btn" onclick="this.closest('.field-updates-card').remove()">Dismiss</button>`;
                        messageHTML += `</div></div>`;
                    }

                    messageHTML += `</div>`;
                    return messageHTML;
                }).join('');
            }
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        };

        const sendMessage = async (mode = 'chat') => {
            const message = input.value.trim();
            if (!message) return;

            const config = Statamic.$store?.state?.statamic?.config?.tiptapAiConfig || {};
            const chatEndpoint = config.endpoints?.chat || '/cp/tiptap-ai-agent/chat';

            // Re-extract context to get latest values (title might have changed, etc.)
            currentContext = extractContext();

            // Add user message
            chatMessages.push({
                role: 'user',
                content: message,
                mode: mode
            });

            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;
            updateFieldsBtn.disabled = true;

            renderMessages();

            // Add loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chat-message assistant';
            loadingDiv.innerHTML = '<div class="chat-message-content"><div class="chat-loading"><span></span><span></span><span></span></div></div>';
            messagesContainer.appendChild(loadingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            try {
                const response = await fetch(chatEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': Statamic.$config.get('csrfToken'),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({
                        message: message,
                        conversation_history: chatMessages.slice(-10).map(msg => ({
                            role: msg.role,
                            content: msg.content
                        })),
                        context: currentContext,
                        mode: mode
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const data = await response.json();

                // Store the assistant message
                const assistantMessage = {
                    role: 'assistant',
                    content: data.message,
                    field_updates: data.field_updates || null
                };

                chatMessages.push(assistantMessage);

                if (chatIsMinimized) {
                    chatUnreadCount++;
                    badge.textContent = chatUnreadCount;
                    badge.style.display = 'block';
                }

                // Save to session storage
                try {
                    sessionStorage.setItem('ai-chat-messages', JSON.stringify(chatMessages));
                } catch (e) {
                    console.error('Failed to save chat history:', e);
                }

                renderMessages();

            } catch (error) {
                console.error('AI Chat error:', error);
                chatMessages.push({
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.'
                });
                renderMessages();
            } finally {
                input.disabled = false;
                sendBtn.disabled = false;
                updateFieldsBtn.disabled = false;
                input.focus();
            }
        };

        const clearConversation = () => {
            if (confirm('Clear the entire conversation?')) {
                chatMessages = [];
                sessionStorage.removeItem('ai-chat-messages');
                renderMessages();
            }
        };

        const applyFieldChanges = (changes) => {
            if (!changes || !Array.isArray(changes) || changes.length === 0) {
                console.error('No changes to apply');
                return;
            }

            // Check if we have access to the Vuex store
            if (!Statamic.$store || !Statamic.$store.state.publish) {
                console.error('Vuex store not available');
                alert('Cannot apply changes: publish form store not found');
                return;
            }

            // Find the publish module (usually 'base')
            const publishModuleNames = ['base', 'default', 'entry', 'term', 'global'];
            let publishModuleName = null;

            for (const moduleName of publishModuleNames) {
                if (Statamic.$store.state.publish[moduleName]) {
                    publishModuleName = moduleName;
                    break;
                }
            }

            if (!publishModuleName) {
                console.error('No publish module found');
                alert('Cannot apply changes: publish module not found');
                return;
            }

            console.log(`Applying ${changes.length} field changes to publish.${publishModuleName}`);
            console.log('Current store values BEFORE changes:', JSON.parse(JSON.stringify(Statamic.$store.state.publish[publishModuleName].values)));

            // Helper function to normalize field handle (convert Title Case to snake_case if needed)
            const normalizeFieldHandle = (handle) => {
                // If handle contains spaces or capital letters, convert to snake_case
                if (handle.includes(' ') || /[A-Z]/.test(handle)) {
                    return handle
                        .toLowerCase()
                        .replace(/\s+/g, '_')
                        .replace(/[^a-z0-9_]/g, '');
                }
                return handle;
            };

            // Helper function to check if a value is a Bard field (array of content blocks)
            const isBardField = (value) => {
                return Array.isArray(value) && value.length > 0 &&
                       value.every(item => typeof item === 'object' &&
                                   (item.type === 'paragraph' || item.type === 'heading' || item.type === 'set' || item.content));
            };

            // Helper function to convert plain text to Bard JSON format
            const textToBardFormat = (text) => {
                if (!text || typeof text !== 'string') {
                    return [];
                }

                // Split text into paragraphs (by double newlines or single newlines)
                const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

                // Convert each paragraph to a Bard block
                return paragraphs.map(paragraphText => {
                    // Handle single newlines within a paragraph as line breaks
                    const lines = paragraphText.split('\n').filter(l => l.trim().length > 0);

                    // Build content array with text nodes and potential hard breaks
                    const content = [];
                    lines.forEach((line, index) => {
                        if (line.trim()) {
                            content.push({
                                type: 'text',
                                text: line.trim()
                            });
                        }
                        // Add hard break between lines (but not after the last line)
                        if (index < lines.length - 1) {
                            content.push({
                                type: 'hardBreak'
                            });
                        }
                    });

                    return {
                        type: 'paragraph',
                        content: content.length > 0 ? content : [{ type: 'text', text: paragraphText.trim() }]
                    };
                });
            };

            // Apply each change
            let appliedCount = 0;
            let skippedCount = 0;
            const changeDetails = [];

            changes.forEach(change => {
                try {
                    // Normalize field handle (convert "Reason For Sale" to "reason_for_sale")
                    let fieldHandle = normalizeFieldHandle(change.field);
                    let newValue = change.proposed_value;

                    // Get current value
                    let currentValue = Statamic.$store.state.publish[publishModuleName].values[fieldHandle];

                    // If field doesn't exist with normalized handle, try original handle
                    if (currentValue === undefined) {
                        fieldHandle = change.field;
                        currentValue = Statamic.$store.state.publish[publishModuleName].values[fieldHandle];
                    }

                    // Log for debugging
                    console.log(`Field "${fieldHandle}" - Current:`, currentValue);
                    console.log(`Field "${fieldHandle}" - New (raw):`, newValue);

                    // Skip if field doesn't exist in the store
                    if (currentValue === undefined && !Statamic.$store.state.publish[publishModuleName].values.hasOwnProperty(fieldHandle)) {
                        console.warn(`⚠ Field "${fieldHandle}" does not exist in the form`);
                        changeDetails.push(`⚠ ${fieldHandle} (field not found)`);
                        skippedCount++;
                        return;
                    }

                    // Check if this is a Bard field and convert plain text to Bard format
                    if (isBardField(currentValue)) {
                        console.log(`📝 Field "${fieldHandle}" is a Bard field, converting plain text to Bard format`);
                        newValue = textToBardFormat(newValue);
                        console.log(`Field "${fieldHandle}" - New (Bard format):`, newValue);
                    }

                    // Skip if the new value is identical to the current value
                    if (currentValue === newValue || JSON.stringify(currentValue) === JSON.stringify(newValue)) {
                        console.log(`⊘ Skipping "${fieldHandle}" - proposed value is identical to current value`);
                        changeDetails.push(`⊘ ${fieldHandle} (no change needed)`);
                        skippedCount++;
                        return;
                    }

                    // Use Vuex dispatch action instead of Vue.set()
                    // This ensures the emitUpdatedEvent is called, which triggers form field updates
                    Statamic.$store.dispatch(`publish/${publishModuleName}/setFieldValue`, {
                        handle: fieldHandle,
                        value: newValue
                    });
                    console.log(`✓ Dispatched change for "${fieldHandle}" using Vuex action`);

                    // Mark as applied (will verify after Vue.nextTick)
                    appliedCount++;
                    changeDetails.push(`✓ ${fieldHandle}`);

                } catch (error) {
                    console.error(`Failed to apply change to field "${change.field}":`, error);
                    changeDetails.push(`✗ ${change.field} (${error.message})`);
                }
            });

            // Use Vue.nextTick to ensure all Vuex mutations and DOM updates are processed
            // before verifying changes and providing feedback
            const finishApplying = () => {
                console.log('Vue.nextTick: All updates should now be flushed');
                console.log('Store values AFTER Vue.nextTick:', JSON.parse(JSON.stringify(Statamic.$store.state.publish[publishModuleName].values)));

                // Build comprehensive feedback message
                let feedbackMessage = '';

                if (appliedCount > 0) {
                    feedbackMessage = `✓ Successfully updated ${appliedCount} field${appliedCount > 1 ? 's' : ''}`;
                    if (skippedCount > 0) {
                        feedbackMessage += ` (${skippedCount} skipped)`;
                    }
                    feedbackMessage += ':\n\n' + changeDetails.join('\n');
                    feedbackMessage += '\n\nThe fields should now be updated in the form. Make sure to save the form to persist these changes.';
                } else if (skippedCount > 0) {
                    feedbackMessage = `ℹ No changes applied - all ${skippedCount} proposed change${skippedCount > 1 ? 's were' : ' was'} skipped:\n\n`;
                    feedbackMessage += changeDetails.join('\n');
                    feedbackMessage += '\n\nLegend:\n⊘ = No change needed (value already correct)\n⚠ = Field not found in form';
                } else {
                    feedbackMessage = '✗ Failed to apply any changes. Check console for error details.';
                }

                // Add feedback message to chat
                chatMessages.push({
                    role: 'assistant',
                    content: feedbackMessage
                });

                // Re-extract context to show updated values
                currentContext = extractContext();

                renderMessages();

                console.log(`Applied ${appliedCount} of ${changes.length} changes (${skippedCount} skipped)`);
                console.log('Changes applied. Form fields should now display updated values.');
            };

            // Wait for Vue to process all reactive updates before providing feedback
            // Use a double-delay approach: Vue.nextTick + setTimeout to ensure deep component updates
            // This is necessary because some components (especially Bard editors) may need additional
            // time to process the Vuex state changes and re-render their internal state
            if (typeof Vue !== 'undefined' && Vue.nextTick) {
                Vue.nextTick(() => {
                    // Add additional delay to ensure all components have fully updated
                    setTimeout(finishApplying, 100);
                });
            } else if (Statamic.$nextTick) {
                Statamic.$nextTick(() => {
                    setTimeout(finishApplying, 100);
                });
            } else {
                // Fallback: use setTimeout if Vue.nextTick is not available
                setTimeout(finishApplying, 150);
            }
        };

        // Global function accessible from onclick handlers
        window.applyAIChatFieldChanges = (messageIndex) => {
            if (chatMessages[messageIndex] && chatMessages[messageIndex].field_updates) {
                applyFieldChanges(chatMessages[messageIndex].field_updates.changes);
            }
        };

        // Attach events
        chatButton.onclick = toggleMinimize;
        minimizeBtn.onclick = toggleMinimize;
        clearBtn.onclick = clearConversation;
        updateFieldsBtn.onclick = () => sendMessage('update_fields');
        sendBtn.onclick = sendMessage;
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };

        // Initial render
        renderMessages();

        console.log('TipTap AI Agent: Chat widget created successfully');
    };

    // Wait for DOM to be ready before creating chat widget
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createChatWidget);
    } else {
        createChatWidget();
    }
})();
