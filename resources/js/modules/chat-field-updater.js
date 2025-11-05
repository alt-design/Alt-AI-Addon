/**
 * Chat Field Updater
 *
 * Handles applying AI-suggested field updates to Statamic's Vuex store.
 * Includes support for Bard fields and various field types.
 */

/**
 * Helper function to normalize field handle (convert Title Case to snake_case if needed)
 * @param {string} handle - Field handle
 * @returns {string} Normalized handle
 */
function normalizeFieldHandle(handle) {
    // If handle contains spaces or capital letters, convert to snake_case
    if (handle.includes(' ') || /[A-Z]/.test(handle)) {
        return handle
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
    }
    return handle;
}

/**
 * Helper function to check if a value is a Bard field (array of content blocks)
 * @param {*} value - Field value to check
 * @returns {boolean} True if value is a Bard field
 */
function isBardField(value) {
    // Bard fields are stored as arrays - either empty [] or containing content blocks
    if (!Array.isArray(value)) {
        return false;
    }

    // Empty array is a valid empty Bard field
    if (value.length === 0) {
        return true;
    }

    // Non-empty array: check if it contains Bard content blocks
    return value.every(item => typeof item === 'object' &&
                       (item.type === 'paragraph' || item.type === 'heading' || item.type === 'set' || item.content));
}

/**
 * Helper function to convert plain text to Bard JSON format
 * @param {string|object} text - Plain text to convert (or malformed object to extract text from)
 * @returns {Array} Bard content blocks
 */
function textToBardFormat(text) {
    // Handle null, undefined, or empty values
    if (!text) {
        return [];
    }

    // If text is an object instead of a string, try to extract the text content
    // This handles cases where the AI might return malformed JSON like {type: 'doc', content: 'text'}
    if (typeof text === 'object') {
        console.warn('[textToBardFormat] Received object instead of string:', text);

        // Try to extract text from various possible structures
        if (typeof text.content === 'string') {
            // Handle {type: 'doc', content: 'string'} - INVALID FORMAT from AI
            console.warn('[textToBardFormat] Extracting string from object.content');
            text = text.content;
        } else if (typeof text.text === 'string') {
            // Handle {text: 'string'}
            text = text.text;
        } else if (Array.isArray(text)) {
            // If it's already an array (possibly already formatted), return it as-is
            console.warn('[textToBardFormat] Input is already an array, returning as-is');
            return text;
        } else {
            // Can't extract text, log error and return empty
            console.error('[textToBardFormat] Cannot extract text from object:', text);
            return [];
        }
    }

    // Now ensure we have a string
    if (typeof text !== 'string') {
        console.error('[textToBardFormat] Cannot convert non-string value:', typeof text, text);
        return [];
    }

    // Trim and check for empty string
    text = text.trim();
    if (text.length === 0) {
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
}

/**
 * Apply field changes to the Statamic Vuex store
 * @param {Array} changes - Array of field change objects
 * @param {Function} onComplete - Callback function called after changes are applied
 * @returns {Object} Result object with applied and skipped counts
 */
export function applyFieldChanges(changes, onComplete) {
    if (!changes || !Array.isArray(changes) || changes.length === 0) {
        console.error('No changes to apply');
        return { appliedCount: 0, skippedCount: 0, changeDetails: [] };
    }

    // Check if we have access to the Vuex store
    if (!Statamic.$store || !Statamic.$store.state.publish) {
        console.error('Vuex store not available');
        alert('Cannot apply changes: publish form store not found');
        return { appliedCount: 0, skippedCount: 0, changeDetails: [] };
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
        return { appliedCount: 0, skippedCount: 0, changeDetails: [] };
    }

    // Prepare changes array with normalized handles and converted values
    const processedChanges = [];
    let appliedCount = 0;
    let skippedCount = 0;
    const changeDetails = [];

    // First pass: validate and prepare all changes
    changes.forEach(change => {
        try {
            // Normalize field handle (convert "Reason For Sale" to "reason_for_sale")
            let fieldHandle = normalizeFieldHandle(change.field);
            let newValue = change.proposed_value;

            console.log(`\n[DEBUG] ========== Processing field: "${fieldHandle}" ==========`);
            console.log('[DEBUG] Proposed value type:', typeof newValue);
            console.log('[DEBUG] Proposed value:', newValue);

            // Get current value
            let currentValue = Statamic.$store.state.publish[publishModuleName].values[fieldHandle];

            // If field doesn't exist with normalized handle, try original handle
            if (currentValue === undefined) {
                fieldHandle = change.field;
                currentValue = Statamic.$store.state.publish[publishModuleName].values[fieldHandle];
            }

            console.log('[DEBUG] Current value type:', typeof currentValue);
            console.log('[DEBUG] Current value (first 200 chars):', JSON.stringify(currentValue).substring(0, 200));

            // Skip if field doesn't exist in the store
            if (currentValue === undefined && !Statamic.$store.state.publish[publishModuleName].values.hasOwnProperty(fieldHandle)) {
                console.warn(`⚠ Field "${fieldHandle}" does not exist in the form`);
                changeDetails.push(`⚠ ${fieldHandle} (field not found)`);
                skippedCount++;
                return;
            }

            // Check if current value is a Bard field
            const isBard = isBardField(currentValue);
            console.log('[DEBUG] isBardField(currentValue) =', isBard);

            // Check if this is a Bard field and convert plain text to Bard format
            if (isBard) {
                console.log(`[DEBUG] ✓ Field "${fieldHandle}" IS a Bard field - converting proposed value...`);
                console.log('[DEBUG] BEFORE conversion - proposed_value type:', typeof newValue);
                console.log('[DEBUG] BEFORE conversion - proposed_value:', JSON.stringify(newValue, null, 2));

                newValue = textToBardFormat(newValue);

                console.log('[DEBUG] AFTER conversion - newValue type:', typeof newValue);
                console.log('[DEBUG] AFTER conversion - newValue:', JSON.stringify(newValue, null, 2));
            } else {
                console.log(`[DEBUG] ✗ Field "${fieldHandle}" is NOT a Bard field - no conversion needed`);
            }

            // Skip if the new value is identical to the current value
            if (currentValue === newValue || JSON.stringify(currentValue) === JSON.stringify(newValue)) {
                changeDetails.push(`⊘ ${fieldHandle} (no change needed)`);
                skippedCount++;
                return;
            }

            // Store the processed change for double-apply
            processedChanges.push({
                fieldHandle,
                newValue,
                isBard: isBardField(currentValue)
            });

            appliedCount++;
            changeDetails.push(`✓ ${fieldHandle}`);

        } catch (error) {
            console.error(`Failed to process change for field "${change.field}":`, error);
            changeDetails.push(`✗ ${change.field} (${error.message})`);
        }
    });

    // Helper function to apply a single round of updates
    const applyUpdatesRound = (roundNumber) => {
        console.log(`Applying field updates - Round ${roundNumber}`);
        processedChanges.forEach(({ fieldHandle, newValue }) => {
            try {
                // Use Vuex dispatch action to update the field
                Statamic.$store.dispatch(`publish/${publishModuleName}/setFieldValue`, {
                    handle: fieldHandle,
                    value: newValue
                });
            } catch (error) {
                console.error(`Round ${roundNumber} - Failed to apply field "${fieldHandle}":`, error);
            }
        });
    };

    // WORKAROUND: Apply updates twice
    // Some Bard/TipTap fields in Statamic don't respond to the first Vuex update
    // Applying the same update twice ensures the fields are properly updated

    // First application
    applyUpdatesRound(1);

    // Second application after Vue has processed the first round
    const applySecondRound = () => {
        // Wait for Vue to fully process the first round
        const vueNextTick = (typeof Vue !== 'undefined' && Vue.nextTick) ? Vue.nextTick : (Statamic.$nextTick || null);

        if (vueNextTick) {
            vueNextTick(() => {
                setTimeout(() => {
                    // Apply the second round of updates
                    applyUpdatesRound(2);

                    // Final completion after second round
                    finishApplying();
                }, 200);
            });
        } else {
            // Fallback: use setTimeout if Vue.nextTick is not available
            setTimeout(() => {
                applyUpdatesRound(2);
                finishApplying();
            }, 300);
        }
    };

    // Completion callback
    const finishApplying = () => {
        // Wait one more tick after the second application to ensure everything is settled
        const vueNextTick = (typeof Vue !== 'undefined' && Vue.nextTick) ? Vue.nextTick : (Statamic.$nextTick || null);

        if (vueNextTick) {
            vueNextTick(() => {
                setTimeout(() => {
                    if (onComplete) {
                        onComplete({
                            appliedCount,
                            skippedCount,
                            changeDetails
                        });
                    }
                }, 100);
            });
        } else {
            setTimeout(() => {
                if (onComplete) {
                    onComplete({
                        appliedCount,
                        skippedCount,
                        changeDetails
                    });
                }
            }, 150);
        }
    };

    // Start the second round application
    applySecondRound();

    return { appliedCount, skippedCount, changeDetails };
}
