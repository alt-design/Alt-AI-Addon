/**
 * Chat Message Renderer
 *
 * Handles rendering of chat messages including field update cards.
 */

import { buildEmptyChatTemplate } from './chat-template-builder.js';

/**
 * Render a single message with optional field updates
 * @param {Object} msg - Message object
 * @param {number} index - Message index
 * @returns {string} HTML for the message
 */
function renderSingleMessage(msg, index) {
    let messageHTML = `<div class="chat-message ${msg.role}">`;
    messageHTML += `<div class="chat-message-content">${msg.content.replace(/\n/g, '<br>')}</div>`;

    // Display field updates if present
    if (msg.field_updates && msg.field_updates.changes && msg.field_updates.changes.length > 0) {
        messageHTML += `<div class="field-updates-card">`;
        messageHTML += `<div class="field-updates-header">Proposed Field Changes (${msg.field_updates.changes.length})</div>`;

        msg.field_updates.changes.forEach(change => {
            const fieldName = change.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const currentValue = change.current_value || '(empty)';
            const proposedValue = change.proposed_value;
            const reason = change.reason || '';

            messageHTML += `<div class="field-change-item">`;
            messageHTML += `<div class="field-change-field">${fieldName}</div>`;
            messageHTML += `<div class="field-change-values">`;
            messageHTML += `<div class="field-change-current">Current: ${currentValue}</div>`;
            messageHTML += `<div class="field-change-proposed">Proposed: ${proposedValue}</div>`;
            if (reason) {
                messageHTML += `<div class="field-change-reason">${reason}</div>`;
            }
            messageHTML += `</div></div>`;
        });

        // Only show actions if not already applied
        if (!msg.field_updates.applied) {
            messageHTML += `<div class="field-updates-actions">`;
            messageHTML += `<button class="apply-changes-btn" data-message-index="${index}">Apply Changes</button>`;
            messageHTML += `<button class="cancel-changes-btn" data-message-index="${index}">Dismiss</button>`;
            messageHTML += `</div>`;
        } else {
            messageHTML += `<div class="field-updates-applied">✓ Changes Applied</div>`;
        }
        messageHTML += `</div>`;
    }

    messageHTML += `</div>`;
    return messageHTML;
}

/**
 * Render all messages to the container
 * @param {HTMLElement} messagesContainer - Container element for messages
 * @param {Array} chatMessages - Array of message objects
 */
export function renderMessages(messagesContainer, chatMessages) {
    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }

    if (chatMessages.length === 0) {
        messagesContainer.innerHTML = buildEmptyChatTemplate();
    } else {
        messagesContainer.innerHTML = chatMessages.map((msg, index) => {
            return renderSingleMessage(msg, index);
        }).join('');
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
