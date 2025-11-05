/**
 * AI Chat Widget for Statamic Control Panel
 *
 * Provides a floating chat interface for AI-assisted content creation
 * with context awareness of the current entry/page being edited.
 */

import { extractContext } from './chat-context-extractor.js';
import { buildChatWidgetTemplate, buildLoadingTemplate } from './chat-template-builder.js';
import { renderMessages } from './chat-message-renderer.js';
import { sendChatMessage } from './chat-api-client.js';
import { applyFieldChanges } from './chat-field-updater.js';
import {
    loadMessages,
    saveMessages,
    clearMessages,
    addMessage,
    getMessages,
    setMinimized,
    isMinimized,
    incrementUnreadCount,
    getUnreadCount,
    setCurrentContext,
    getCurrentContext
} from './chat-state-manager.js';

export function initChatWidget() {
    let chatWidget = null;

    const createChatWidget = () => {
        // Extract initial context
        setCurrentContext(extractContext());

        // Load saved messages
        loadMessages();

        // Create widget container
        const widget = document.createElement('div');
        widget.id = 'alt-ai-chat-widget';
        widget.className = 'alt-ai-chat-widget minimized';

        widget.innerHTML = buildChatWidgetTemplate();

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
            const newMinimizedState = !isMinimized();
            setMinimized(newMinimizedState);
            widget.classList.toggle('minimized', newMinimizedState);
            chatWindow.classList.toggle('hidden', newMinimizedState);
            chatButton.classList.toggle('hidden', !newMinimizedState);

            if (!newMinimizedState) {
                badge.classList.add('hidden');
                renderMessages(messagesContainer, getMessages());
                setTimeout(() => input.focus(), 100);
            }
        };

        const sendMessage = async (mode = 'chat') => {
            const message = input.value.trim();
            if (!message) return;

            // Re-extract context to get latest values (title might have changed, etc.)
            setCurrentContext(extractContext());

            // Add user message
            addMessage({
                role: 'user',
                content: message,
                mode: mode
            });

            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;
            updateFieldsBtn.disabled = true;

            renderMessages(messagesContainer, getMessages());

            // Add loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chat-message assistant';
            loadingDiv.innerHTML = buildLoadingTemplate();
            messagesContainer.appendChild(loadingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            try {
                const data = await sendChatMessage(
                    message,
                    getMessages(),
                    getCurrentContext(),
                    mode
                );

                // Store the assistant message
                const assistantMessage = {
                    role: 'assistant',
                    content: data.message,
                    field_updates: data.field_updates || null
                };

                addMessage(assistantMessage);

                if (isMinimized()) {
                    incrementUnreadCount();
                    badge.textContent = getUnreadCount();
                    badge.classList.remove('hidden');
                }

                renderMessages(messagesContainer, getMessages());

            } catch (error) {
                console.error('AI Chat error:', error);
                addMessage({
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.'
                });
                renderMessages(messagesContainer, getMessages());
            } finally {
                input.disabled = false;
                sendBtn.disabled = false;
                updateFieldsBtn.disabled = false;
                input.focus();
            }
        };

        const clearConversation = () => {
            if (confirm('Clear the entire conversation?')) {
                clearMessages();
                renderMessages(messagesContainer, getMessages());
            }
        };

        const handleApplyChanges = (changes) => {
            applyFieldChanges(changes, (result) => {
                const { appliedCount, skippedCount, changeDetails } = result;

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
                addMessage({
                    role: 'assistant',
                    content: feedbackMessage
                });

                // Re-extract context to show updated values
                setCurrentContext(extractContext());

                renderMessages(messagesContainer, getMessages());
            });
        };

        // Event delegation for apply/dismiss buttons in messages
        messagesContainer.addEventListener('click', (e) => {
            // Handle "Apply Changes" button
            if (e.target.classList.contains('apply-changes-btn')) {
                const messageIndex = parseInt(e.target.getAttribute('data-message-index'));
                const messages = getMessages();

                if (messages[messageIndex] && messages[messageIndex].field_updates) {
                    // Mark field updates as applied immediately to prevent double-click
                    messages[messageIndex].field_updates.applied = true;
                    saveMessages(messages);

                    // Re-render to remove the apply button and show applied status
                    renderMessages(messagesContainer, messages);

                    // Now handle the actual field changes
                    handleApplyChanges(messages[messageIndex].field_updates.changes);
                }
            }

            // Handle "Dismiss" button
            if (e.target.classList.contains('cancel-changes-btn')) {
                const messageIndex = parseInt(e.target.getAttribute('data-message-index'));
                const messages = getMessages();

                if (messages[messageIndex] && messages[messageIndex].field_updates) {
                    // Mark as applied (dismissed) so it won't show the button again
                    messages[messageIndex].field_updates.applied = true;
                    saveMessages(messages);
                    renderMessages(messagesContainer, messages);
                }
            }
        });

        // Attach events
        chatButton.onclick = toggleMinimize;
        minimizeBtn.onclick = toggleMinimize;
        clearBtn.onclick = clearConversation;
        updateFieldsBtn.onclick = () => sendMessage('update_fields');
        sendBtn.onclick = () => sendMessage();
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };

        // Initial render
        renderMessages(messagesContainer, getMessages());
    };

    // Create the chat widget on initialization
    createChatWidget();
}
