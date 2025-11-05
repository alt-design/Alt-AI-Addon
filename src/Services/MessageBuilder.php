<?php

namespace AltDesign\AltAi\Services;

class MessageBuilder
{
    protected DataConverter $dataConverter;

    public function __construct(DataConverter $dataConverter)
    {
        $this->dataConverter = $dataConverter;
    }

    /**
     * Build messages array for chat conversations
     *
     * @param string $userMessage
     * @param array $conversationHistory
     * @param array $context
     * @param string $mode
     * @return array
     */
    public function buildChatMessages(string $userMessage, array $conversationHistory, array $context, string $mode = 'chat'): array
    {
        $messages = [];

        // System message with comprehensive context awareness
        // Check for custom system prompt override
        $systemPromptOverride = config('tiptap-ai-agent.system_prompt_override', '');

        if (!empty($systemPromptOverride)) {
            $systemPrompt = $systemPromptOverride . "\n\n";
        } else {
            $systemPrompt = "You are a helpful AI assistant integrated into the Statamic CMS control panel. ";
            $systemPrompt .= "You help users with content creation, editing, and general assistance.\n\n";
        }

        // Add website context if provided
        $websiteContext = config('tiptap-ai-agent.website_context', '');
        if (!empty($websiteContext)) {
            $systemPrompt .= "=== WEBSITE CONTEXT ===\n";
            $systemPrompt .= $websiteContext . "\n\n";
        }

        if (!empty($context)) {
            $systemPrompt .= "Current entry context:\n\n";

            // Page/Content Type
            if (isset($context['page_type'])) {
                $systemPrompt .= "=== PAGE TYPE ===\n";
                $systemPrompt .= "Type: " . ucfirst(str_replace('_', ' ', $context['page_type'])) . "\n";
                if (isset($context['is_new']) && $context['is_new']) {
                    $systemPrompt .= "Status: Creating new entry\n";
                } elseif (isset($context['has_changes']) && $context['has_changes']) {
                    $systemPrompt .= "Status: Has unsaved changes\n";
                }
                $systemPrompt .= "\n";
            }

            // Basic Entry Information
            $systemPrompt .= "=== ENTRY INFORMATION ===\n";

            if (isset($context['title'])) {
                $systemPrompt .= "Title: " . $this->dataConverter->toString($context['title']) . "\n";
            }

            if (isset($context['slug'])) {
                $systemPrompt .= "Slug: " . $this->dataConverter->toString($context['slug']) . "\n";
            }

            if (isset($context['entry_id'])) {
                $systemPrompt .= "Entry ID: " . $this->dataConverter->toString($context['entry_id']) . "\n";
            }

            if (isset($context['permalink'])) {
                $systemPrompt .= "Permalink: " . $this->dataConverter->toString($context['permalink']) . "\n";
            }

            if (isset($context['status'])) {
                $systemPrompt .= "Publication Status: " . ucfirst($this->dataConverter->toString($context['status'])) . "\n";
            }

            $systemPrompt .= "\n";

            // Collection/Structure Information
            if (isset($context['collection']) || isset($context['blueprint'])) {
                $systemPrompt .= "=== STRUCTURE ===\n";

                if (isset($context['collection'])) {
                    $systemPrompt .= "Collection: " . $this->dataConverter->toString($context['collection']) . "\n";
                }

                if (isset($context['blueprint'])) {
                    $systemPrompt .= "Blueprint: " . $this->dataConverter->toString($context['blueprint']) . "\n";
                }

                if (isset($context['taxonomy'])) {
                    $systemPrompt .= "Taxonomy: " . $this->dataConverter->toString($context['taxonomy']) . "\n";
                }

                if (isset($context['global'])) {
                    $systemPrompt .= "Global Set: " . $this->dataConverter->toString($context['global']) . "\n";
                }

                if (isset($context['parent'])) {
                    $systemPrompt .= "Parent Entry: " . $this->dataConverter->toString($context['parent']) . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Date Information
            if (isset($context['date']) || isset($context['created_at']) || isset($context['updated_at'])) {
                $systemPrompt .= "=== DATES & TIMELINE ===\n";

                if (isset($context['date'])) {
                    $systemPrompt .= "Date: " . $this->dataConverter->toString($context['date']) . "\n";
                }

                if (isset($context['created_at'])) {
                    $systemPrompt .= "Created: " . $this->dataConverter->toString($context['created_at']) . "\n";
                }

                if (isset($context['updated_at'])) {
                    $systemPrompt .= "Last Updated: " . $this->dataConverter->toString($context['updated_at']) . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Taxonomy & Classification
            if (isset($context['categories']) || isset($context['tags'])) {
                $systemPrompt .= "=== CLASSIFICATION ===\n";

                if (isset($context['categories']) && is_array($context['categories']) && count($context['categories']) > 0) {
                    $systemPrompt .= "Categories: " . implode(', ', $context['categories']) . "\n";
                }

                if (isset($context['tags']) && is_array($context['tags']) && count($context['tags']) > 0) {
                    $systemPrompt .= "Tags: " . implode(', ', $context['tags']) . "\n";
                }

                if (isset($context['featured'])) {
                    $systemPrompt .= "Featured: " . ($context['featured'] ? 'Yes' : 'No') . "\n";
                }

                $systemPrompt .= "\n";
            }


            // User & Authorship
            if (isset($context['current_user']) || isset($context['author'])) {
                $systemPrompt .= "=== USER INFORMATION ===\n";

                if (isset($context['current_user']) && is_array($context['current_user'])) {
                    $systemPrompt .= "Current User: " . ($context['current_user']['name'] ?? $context['current_user']['email'] ?? 'Unknown') . "\n";
                }

                if (isset($context['author'])) {
                    $systemPrompt .= "Entry Author: " . $this->dataConverter->toString($context['author']) . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Site & Localization
            if (isset($context['site']) || isset($context['locale']) || isset($context['multisite'])) {
                $systemPrompt .= "=== SITE & LOCALIZATION ===\n";

                if (isset($context['site'])) {
                    $systemPrompt .= "Site: " . $this->dataConverter->toString($context['site']) . "\n";
                }

                if (isset($context['locale'])) {
                    $systemPrompt .= "Locale: " . $this->dataConverter->toString($context['locale']) . "\n";
                }

                if (isset($context['multisite'])) {
                    $systemPrompt .= "Multisite Enabled: " . ($context['multisite'] ? 'Yes' : 'No') . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Navigation context
            if (isset($context['route'])) {
                $systemPrompt .= "=== CURRENT LOCATION ===\n";
                $systemPrompt .= "Control Panel Route: " . $this->dataConverter->toString($context['route']) . "\n\n";
            }

            // Field Label Mapping - Show relationship between handles and display labels
            if (isset($context['field_labels']) && is_array($context['field_labels']) && count($context['field_labels']) > 0) {
                $systemPrompt .= "=== FIELD LABEL MAPPING ===\n";
                $systemPrompt .= "This shows the relationship between field handles (technical names) and their display labels (what users see).\n";
                $systemPrompt .= "Format: field_handle → \"Display Label\"\n\n";

                foreach ($context['field_labels'] as $handle => $label) {
                    $systemPrompt .= $handle . " → \"" . $label . "\"\n";
                }

                $systemPrompt .= "\nIMPORTANT: When updating fields, you MUST use the field_handle (left side), NOT the display label (right side).\n";
                $systemPrompt .= "However, when answering questions, you can recognize fields by either their handle or label.\n";
                $systemPrompt .= "Example: User asks about 'Contact Info' → you know they mean the 'contact_information' field.\n\n";
            }

            // Field Values - ALL visible fields on the page
            if (isset($context['fields']) && is_array($context['fields']) && count($context['fields']) > 0) {
                $systemPrompt .= "=== FIELD VALUES (All Visible Content) ===\n";
                $systemPrompt .= "The following are ALL the field values currently visible on the page.\n";

                // Show format with label if we have labels, otherwise just handle
                if (isset($context['field_labels']) && count($context['field_labels']) > 0) {
                    $systemPrompt .= "Format: [field_handle] \"Display Label\": value\n";
                } else {
                    $systemPrompt .= "Format: [field_handle]: value\n";
                }

                $systemPrompt .= "⚠️ CRITICAL: The field handle is shown in [BRACKETS]. This is what you MUST use when updating fields.\n";
                $systemPrompt .= "DO NOT create your own field names. DO NOT convert display labels to snake_case. USE THE EXACT TEXT IN [BRACKETS].\n\n";

                foreach ($context['fields'] as $fieldName => $fieldValue) {
                    // Create the field identifier with handle in brackets and label if available
                    if (isset($context['field_labels'][$fieldName])) {
                        $fieldIdentifier = "[" . $fieldName . "] \"" . $context['field_labels'][$fieldName] . "\"";
                    } else {
                        $fieldIdentifier = "[" . $fieldName . "]";
                    }

                    // Format field value based on type
                    if (is_array($fieldValue)) {
                        // Handle arrays (tags, categories, selections)
                        if (empty($fieldValue)) continue;

                        // Filter to only scalar values to avoid "Array to string conversion" error
                        $scalarValues = array_filter($fieldValue, function($item) {
                            return is_scalar($item);
                        });

                        if (!empty($scalarValues)) {
                            $systemPrompt .= $fieldIdentifier . ": " . implode(', ', $scalarValues) . "\n";
                        } else {
                            // If no scalar values, skip or show as complex structure
                            $systemPrompt .= $fieldIdentifier . ": [Complex array structure]\n";
                        }
                    } elseif (is_bool($fieldValue)) {
                        // Handle booleans
                        $systemPrompt .= $fieldIdentifier . ": " . ($fieldValue ? 'Yes' : 'No') . "\n";
                    } elseif (is_string($fieldValue)) {
                        // Handle strings (text fields, Bard content, etc.)
                        // Truncate very long text but keep enough for context
                        if (strlen($fieldValue) > 500) {
                            $truncated = substr($fieldValue, 0, 500) . '... [truncated, ' . strlen($fieldValue) . ' total chars]';
                            $systemPrompt .= $fieldIdentifier . ": " . $truncated . "\n";
                        } else {
                            $systemPrompt .= $fieldIdentifier . ": " . $fieldValue . "\n";
                        }
                    } elseif (is_numeric($fieldValue)) {
                        // Handle numbers
                        $systemPrompt .= $fieldIdentifier . ": " . $fieldValue . "\n";
                    } elseif (is_object($fieldValue) || (is_array($fieldValue) && !empty($fieldValue))) {
                        // Handle complex objects/arrays - try to extract meaningful info
                        $jsonValue = json_encode($fieldValue);
                        if (strlen($jsonValue) > 200) {
                            $systemPrompt .= $fieldIdentifier . ": [Complex data structure]\n";
                        } else {
                            $systemPrompt .= $fieldIdentifier . ": " . $jsonValue . "\n";
                        }
                    }
                }

                $systemPrompt .= "\n";
            }

            $systemPrompt .= "---\n\n";
            $systemPrompt .= "When the user asks about 'this entry' or 'what I'm working on', reference the information above. ";
            $systemPrompt .= "Use this context to provide specific, relevant assistance based on the current entry's collection, dates, fields, and other metadata.\n";
        }

        $systemPrompt .= "\nYou can provide suggestions and guidance. When suggesting actions that could modify content, ";
        $systemPrompt .= "explain clearly what changes you recommend and why.";

        // Add special instructions for field update mode
        if ($mode === 'update_fields') {
            $systemPrompt .= "\n\n=== FIELD UPDATE MODE ===\n";
            $systemPrompt .= "Analyze the field values above and suggest improvements. Respond with JSON:\n\n";
            $systemPrompt .= '{"action":"update_fields","message":"Brief explanation","changes":[{"field":"field_handle","current_value":"current","proposed_value":"new","reason":"why"}]}' . "\n\n";
            $systemPrompt .= "Rules:\n";
            $systemPrompt .= "- CRITICAL: Use EXACT field handles from [BRACKETS] in FIELD VALUES section above\n";
            $systemPrompt .= "  Example: If you see '[contact_information] ...', use 'contact_information'\n";
            $systemPrompt .= "  WRONG: Converting display label 'Contact Info' to 'contact_info'\n";
            $systemPrompt .= "  RIGHT: Copying exact text from [brackets]: 'contact_information'\n";
            $systemPrompt .= "- Never create field names or convert labels to snake_case\n";
            $systemPrompt .= "- Only suggest genuine improvements where proposed differs from current\n";
            $systemPrompt .= "- For rich text fields, suggest plain text only\n";
            $systemPrompt .= "- Return only JSON, no additional text\n";
        }

        $messages[] = [
            'role' => 'system',
            'content' => $systemPrompt
        ];

        // Add conversation history
        foreach ($conversationHistory as $msg) {
            if (isset($msg['role']) && isset($msg['content'])) {
                $messages[] = [
                    'role' => $msg['role'],
                    'content' => $msg['content']
                ];
            }
        }

        // Add current user message
        $messages[] = [
            'role' => 'user',
            'content' => $userMessage
        ];

        return $messages;
    }

    /**
     * Build messages array for Bard agent conversations
     *
     * @param string $userMessage
     * @param string $documentContent
     * @param string $selectedText
     * @param array $conversationHistory
     * @return array
     */
    public function buildAgentMessages(string $userMessage, string $documentContent, string $selectedText, array $conversationHistory): array
    {
        $messages = [];

        // System message for Bard agent
        $systemPrompt = "You are an AI writing assistant integrated into a rich text editor. ";
        $systemPrompt .= "You help users write, edit, and improve their content.\n\n";

        if (!empty($documentContent)) {
            $systemPrompt .= "The full document content is included below the user's message (marked '--- Full Document Content ---'). ";
            $systemPrompt .= "Answer questions about 'this document' or 'the content' by referencing this provided text.\n\n";
        }

        if (!empty($selectedText) && $selectedText !== $documentContent) {
            $systemPrompt .= "Selected text is marked '--- Currently Selected Text ---'. Questions about 'this text' or 'the selection' refer to this.\n\n";
        }

        $systemPrompt .= "Provide clear, actionable text that can be directly inserted into the document.";

        $messages[] = [
            'role' => 'system',
            'content' => $systemPrompt
        ];

        // Add conversation history
        foreach ($conversationHistory as $msg) {
            if (isset($msg['role']) && isset($msg['content'])) {
                $messages[] = [
                    'role' => $msg['role'],
                    'content' => $msg['content']
                ];
            }
        }

        // Build context-aware user message
        $contextMessage = $userMessage;

        if (!empty($documentContent)) {
            $contextMessage .= "\n\n--- Full Document Content ---\n" . $documentContent;
        }

        if (!empty($selectedText) && $selectedText !== $documentContent) {
            $contextMessage .= "\n\n--- Currently Selected Text ---\n" . $selectedText;
        }

        $messages[] = [
            'role' => 'user',
            'content' => $contextMessage
        ];

        return $messages;
    }
}
