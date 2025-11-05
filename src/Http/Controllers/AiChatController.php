<?php

namespace AltDesign\TiptapAiAgent\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiChatController
{
    /**
     * Handle chat conversation requests
     */
    public function chat(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:10000',
            'conversation_history' => 'array',
            'context' => 'array',
            'mode' => 'string|in:chat,update_fields', // 'chat' = normal chat, 'update_fields' = AI can modify fields
        ]);

        $apiKey = config('tiptap-ai-agent.api_key');

        if (empty($apiKey)) {
            return response()->json([
                'error' => 'OpenAI API key not configured'
            ], 500);
        }

        try {
            $mode = $validated['mode'] ?? 'chat';

            // Build conversation messages
            $messages = $this->buildMessages(
                $validated['message'],
                $validated['conversation_history'] ?? [],
                $validated['context'] ?? [],
                $mode
            );

            // Call OpenAI API
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
                'model' => config('tiptap-ai-agent.model.name', 'gpt-4'),
                'messages' => $messages,
                'temperature' => config('tiptap-ai-agent.model.temperature', 0.7),
                'max_tokens' => config('tiptap-ai-agent.model.max_tokens', 2000),
            ]);

            if (!$response->successful()) {
                Log::error('OpenAI API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return response()->json([
                    'error' => 'AI service error: ' . $response->status()
                ], 500);
            }

            $data = $response->json();
            $aiMessage = $data['choices'][0]['message']['content'] ?? '';

            // Parse JSON response if in update_fields mode
            $fieldUpdates = null;
            if ($mode === 'update_fields') {
                try {
                    // Try to extract JSON from the response (AI might wrap it in markdown code blocks)
                    $jsonStr = $aiMessage;

                    // Remove markdown code blocks if present
                    if (preg_match('/```json\s*(\{.*?\})\s*```/s', $jsonStr, $matches)) {
                        $jsonStr = $matches[1];
                    } elseif (preg_match('/```\s*(\{.*?\})\s*```/s', $jsonStr, $matches)) {
                        $jsonStr = $matches[1];
                    }

                    // Parse JSON
                    $parsedData = json_decode($jsonStr, true);

                    if ($parsedData && isset($parsedData['action']) && $parsedData['action'] === 'update_fields') {
                        // No auto-correction - AI must use exact field names from the system prompt
                        // The frontend will handle validation and skip fields that don't exist
                        $fieldUpdates = $parsedData;
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to parse field updates JSON', [
                        'error' => $e->getMessage(),
                        'response' => $aiMessage
                    ]);
                }
            }

            return response()->json([
                'message' => $aiMessage,
                'usage' => $data['usage'] ?? null,
                'field_updates' => $fieldUpdates,
                'mode' => $mode,
            ]);

        } catch (\Exception $e) {
            Log::error('AI Chat error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to process chat request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle Bard agent conversation requests
     */
    public function agent(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:10000',
            'document_content' => 'string|nullable',
            'selected_text' => 'string|nullable',
            'conversation_history' => 'array',
        ]);

        $apiKey = config('tiptap-ai-agent.api_key');

        if (empty($apiKey)) {
            return response()->json([
                'error' => 'OpenAI API key not configured'
            ], 500);
        }

        try {
            // Build agent messages with document context
            $messages = $this->buildAgentMessages(
                $validated['message'],
                $validated['document_content'] ?? '',
                $validated['selected_text'] ?? '',
                $validated['conversation_history'] ?? []
            );

            // Call OpenAI API
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
                'model' => config('tiptap-ai-agent.model.name', 'gpt-4'),
                'messages' => $messages,
                'temperature' => config('tiptap-ai-agent.model.temperature', 0.7),
                'max_tokens' => config('tiptap-ai-agent.model.max_tokens', 2000),
            ]);

            if (!$response->successful()) {
                Log::error('OpenAI API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return response()->json([
                    'error' => 'AI service error: ' . $response->status()
                ], 500);
            }

            $data = $response->json();

            return response()->json([
                'message' => $data['choices'][0]['message']['content'] ?? '',
                'usage' => $data['usage'] ?? null,
            ]);

        } catch (\Exception $e) {
            Log::error('AI Agent error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to process agent request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Build messages array for chat conversations
     */
    protected function buildMessages($userMessage, $conversationHistory, $context, $mode = 'chat')
    {
        $messages = [];

        // Helper function to safely convert any value to string for concatenation
        $safeString = function($value) {
            if (is_string($value)) {
                return $value;
            } elseif (is_numeric($value)) {
                return (string)$value;
            } elseif (is_bool($value)) {
                return $value ? 'Yes' : 'No';
            } elseif (is_array($value)) {
                // If it's an array, try to extract a meaningful string
                if (isset($value['name'])) {
                    return $value['name'];
                } elseif (isset($value['handle'])) {
                    return $value['handle'];
                } elseif (isset($value['title'])) {
                    return $value['title'];
                } else {
                    // Extract only scalar values from array
                    $scalarValues = array_filter($value, function($item) {
                        return is_scalar($item);
                    });

                    // If we have scalar values, join them
                    if (!empty($scalarValues)) {
                        return implode(', ', $scalarValues);
                    }

                    // If array is empty or contains only non-scalar values
                    return '[Array]';
                }
            } elseif (is_object($value)) {
                // Try to extract a string representation from object
                if (method_exists($value, '__toString')) {
                    return (string)$value;
                } elseif (isset($value->name)) {
                    return $value->name;
                } elseif (isset($value->handle)) {
                    return $value->handle;
                } elseif (isset($value->title)) {
                    return $value->title;
                } else {
                    return '[Object]';
                }
            } elseif (is_null($value)) {
                return '';
            }
            return (string)$value;
        };

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
            $systemPrompt .= "IMPORTANT: You have direct access to comprehensive information about what the user is currently viewing/editing:\n\n";

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
                $systemPrompt .= "Title: " . $safeString($context['title']) . "\n";
            }

            if (isset($context['slug'])) {
                $systemPrompt .= "Slug: " . $safeString($context['slug']) . "\n";
            }

            if (isset($context['entry_id'])) {
                $systemPrompt .= "Entry ID: " . $safeString($context['entry_id']) . "\n";
            }

            if (isset($context['permalink'])) {
                $systemPrompt .= "Permalink: " . $safeString($context['permalink']) . "\n";
            }

            if (isset($context['status'])) {
                $systemPrompt .= "Publication Status: " . ucfirst($safeString($context['status'])) . "\n";
            }

            $systemPrompt .= "\n";

            // Collection/Structure Information
            if (isset($context['collection']) || isset($context['blueprint'])) {
                $systemPrompt .= "=== STRUCTURE ===\n";

                if (isset($context['collection'])) {
                    $systemPrompt .= "Collection: " . $safeString($context['collection']) . "\n";
                }

                if (isset($context['blueprint'])) {
                    $systemPrompt .= "Blueprint: " . $safeString($context['blueprint']) . "\n";
                }

                if (isset($context['taxonomy'])) {
                    $systemPrompt .= "Taxonomy: " . $safeString($context['taxonomy']) . "\n";
                }

                if (isset($context['global'])) {
                    $systemPrompt .= "Global Set: " . $safeString($context['global']) . "\n";
                }

                if (isset($context['parent'])) {
                    $systemPrompt .= "Parent Entry: " . $safeString($context['parent']) . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Date Information
            if (isset($context['date']) || isset($context['created_at']) || isset($context['updated_at']) || isset($context['auction_date'])) {
                $systemPrompt .= "=== DATES & TIMELINE ===\n";

                if (isset($context['date'])) {
                    $systemPrompt .= "Date: " . $safeString($context['date']) . "\n";
                }

                if (isset($context['auction_date'])) {
                    $systemPrompt .= "Auction Date: " . $safeString($context['auction_date']) . "\n";
                }

                if (isset($context['created_at'])) {
                    $systemPrompt .= "Created: " . $safeString($context['created_at']) . "\n";
                }

                if (isset($context['updated_at'])) {
                    $systemPrompt .= "Last Updated: " . $safeString($context['updated_at']) . "\n";
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

            // Auction-Specific Information (if applicable)
            if (isset($context['auctioneer']) || isset($context['location'])) {
                $systemPrompt .= "=== AUCTION DETAILS ===\n";

                if (isset($context['auctioneer'])) {
                    $systemPrompt .= "Auctioneer: " . $safeString($context['auctioneer']) . "\n";
                }

                if (isset($context['location'])) {
                    $systemPrompt .= "Location: " . $safeString($context['location']) . "\n";
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
                    $systemPrompt .= "Entry Author: " . $safeString($context['author']) . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Site & Localization
            if (isset($context['site']) || isset($context['locale']) || isset($context['multisite'])) {
                $systemPrompt .= "=== SITE & LOCALIZATION ===\n";

                if (isset($context['site'])) {
                    $systemPrompt .= "Site: " . $safeString($context['site']) . "\n";
                }

                if (isset($context['locale'])) {
                    $systemPrompt .= "Locale: " . $safeString($context['locale']) . "\n";
                }

                if (isset($context['multisite'])) {
                    $systemPrompt .= "Multisite Enabled: " . ($context['multisite'] ? 'Yes' : 'No') . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Navigation context
            if (isset($context['route'])) {
                $systemPrompt .= "=== CURRENT LOCATION ===\n";
                $systemPrompt .= "Control Panel Route: " . $safeString($context['route']) . "\n\n";
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
                $systemPrompt .= "Example: User asks about 'Auction Contact' → you know they mean the 'contact_information' field.\n\n";
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
            $systemPrompt .= "When the user asks questions about 'this entry', 'this auction', 'what I'm working on', etc., ";
            $systemPrompt .= "you should reference the specific information provided above. You HAVE all this detailed context and can answer questions about it directly. ";
            $systemPrompt .= "Do NOT say you don't have access to this information - it has been provided to you in the structured format above.\n\n";
            $systemPrompt .= "Use this context to provide relevant, specific assistance. For example:\n";
            $systemPrompt .= "- If helping with content, consider the collection type and blueprint structure\n";
            $systemPrompt .= "- If suggesting dates, be aware of existing dates and timelines\n";
            $systemPrompt .= "- If discussing organization, consider the categories and tags already applied\n";
            $systemPrompt .= "- If providing auction-specific advice, use the auctioneer and location context\n";
            $systemPrompt .= "- When asked about specific fields, reference the exact field values from the FIELD VALUES section above\n";
        }

        $systemPrompt .= "\nYou can provide suggestions and guidance. When suggesting actions that could modify content, ";
        $systemPrompt .= "explain clearly what changes you recommend and why.";

        // Add special instructions for field update mode
        if ($mode === 'update_fields') {
            $systemPrompt .= "\n\n=== FIELD UPDATE MODE ===\n";
            $systemPrompt .= "IMPORTANT: You are now in FIELD UPDATE MODE. The user is asking you to suggest changes to the form fields.\n\n";
            $systemPrompt .= "Based on the field values provided above, analyze the content and suggest improvements.\n";
            $systemPrompt .= "You MUST respond with a JSON object in the following format:\n\n";
            $systemPrompt .= "{\n";
            $systemPrompt .= '  "action": "update_fields",' . "\n";
            $systemPrompt .= '  "message": "Brief explanation of suggested changes",' . "\n";
            $systemPrompt .= '  "changes": [' . "\n";
            $systemPrompt .= "    {\n";
            $systemPrompt .= '      "field": "field_name",' . "\n";
            $systemPrompt .= '      "current_value": "current field value (first 50 chars for long text)",' . "\n";
            $systemPrompt .= '      "proposed_value": "your suggested new value",' . "\n";
            $systemPrompt .= '      "reason": "brief explanation why this change improves the content"' . "\n";
            $systemPrompt .= "    }\n";
            $systemPrompt .= "  ]\n";
            $systemPrompt .= "}\n\n";
            $systemPrompt .= "Guidelines:\n";
            $systemPrompt .= "- Only suggest changes to fields that would genuinely improve the content\n";
            $systemPrompt .= "- Focus on fields from the FIELD VALUES section above\n";
            $systemPrompt .= "- ⚠️ CRITICAL: Copy the EXACT text shown in [BRACKETS] from the FIELD VALUES section\n";
            $systemPrompt .= "  The format in FIELD VALUES is: [field_handle] value\n";
            $systemPrompt .= "  Examples from the FIELD VALUES section:\n";
            $systemPrompt .= "    - If you see '[contact_information] ...' use 'contact_information'\n";
            $systemPrompt .= "    - If you see '[reason_for_sale] ...' use 'reason_for_sale'\n";
            $systemPrompt .= "    - If you see '[auction_date] ...' use 'auction_date'\n";
            $systemPrompt .= "    - If you see '[description] ...' use 'description'\n";
            $systemPrompt .= "\n";
            $systemPrompt .= "  🚫 COMMON MISTAKE TO AVOID:\n";
            $systemPrompt .= "    WRONG: If the field displays as 'Auction Contact' in the UI, DO NOT use 'auction_contact'\n";
            $systemPrompt .= "    RIGHT: Look for the [brackets] in FIELD VALUES section. If it says '[contact_information]', use exactly 'contact_information'\n";
            $systemPrompt .= "    The display name (what users see) is DIFFERENT from the field handle (what you must use).\n";
            $systemPrompt .= "    ALWAYS copy from [brackets], NEVER convert display names to snake_case.\n";
            $systemPrompt .= "\n";
            $systemPrompt .= "  DO NOT create your own field names. DO NOT convert anything to snake_case.\n";
            $systemPrompt .= "  ONLY copy the exact characters from inside the [brackets] in the FIELD VALUES section.\n";
            $systemPrompt .= "- For text fields, provide complete replacement text\n";
            $systemPrompt .= "- For Bard/rich text fields, you can only suggest plain text (HTML will be handled by the editor)\n";
            $systemPrompt .= "- Keep proposed values concise and appropriate for the field type\n";
            $systemPrompt .= "- Only suggest changes where the proposed value is DIFFERENT from the current value\n";
            $systemPrompt .= "- Provide clear reasons for each change\n";
            $systemPrompt .= "- Return ONLY the JSON object, no additional text before or after\n";
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
     */
    protected function buildAgentMessages($userMessage, $documentContent, $selectedText, $conversationHistory)
    {
        $messages = [];

        // System message for Bard agent - be explicit about document context
        $systemPrompt = "You are an AI writing assistant integrated into a rich text editor. ";
        $systemPrompt .= "You help users write, edit, and improve their content.\n\n";

        // Tell AI exactly where to find the document content
        if (!empty($documentContent)) {
            $systemPrompt .= "IMPORTANT: The user's message will include the full document content below their question/request, ";
            $systemPrompt .= "marked with '--- Full Document Content ---'. You have complete access to this document. ";
            $systemPrompt .= "When the user asks questions about 'this document' or 'the content', they are referring to the document content provided. ";
            $systemPrompt .= "You can analyze, review, summarize, or answer questions about the document directly - you do NOT need to ask the user to provide context or select text.\n\n";
        } else {
            $systemPrompt .= "Note: No document content is currently available. You can still provide general writing assistance.\n\n";
        }

        if (!empty($selectedText) && $selectedText !== $documentContent) {
            $systemPrompt .= "Additionally, the user has selected specific text in the document, marked with '--- Currently Selected Text ---'. ";
            $systemPrompt .= "If their question is about 'this text' or 'the selection', they are referring to the selected text.\n\n";
        }

        $systemPrompt .= "When suggesting edits, provide clear, actionable text that can be directly inserted into the document.";

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

    /**
     * Find the best matching field handle from available fields
     * Uses fuzzy matching to correct AI's field name mistakes
     *
     * @param string $suggestedField The field name suggested by AI
     * @param array $availableFields Array of actual field handles
     * @return string|null The best matching field handle, or null if no good match found
     */
    protected function findBestFieldMatch($suggestedField, $availableFields)
    {
        // Normalize the suggested field (lowercase, remove spaces/special chars)
        $normalizedSuggested = strtolower(trim($suggestedField));
        $normalizedSuggested = preg_replace('/[^a-z0-9_]/', '_', $normalizedSuggested);

        // FIRST: Check for exact match - if the suggested field exists, return it immediately
        // This prevents false matches like "additional_information" being corrected to "contact_information"
        foreach ($availableFields as $availableField) {
            if (strtolower($availableField) === $normalizedSuggested) {
                Log::info('TipTap AI Agent: Exact field match found', [
                    'suggested' => $suggestedField,
                    'matched' => $availableField
                ]);
                return $availableField;
            }
        }

        // SECOND: If no exact match, try fuzzy matching to correct typos/mistakes
        Log::info('TipTap AI Agent: No exact match, attempting fuzzy matching', [
            'suggested' => $suggestedField,
            'normalized' => $normalizedSuggested
        ]);

        $bestMatch = null;
        $highestSimilarity = 0;

        foreach ($availableFields as $availableField) {
            // Calculate similarity using similar_text (percentage)
            $similarity = 0;
            similar_text($normalizedSuggested, strtolower($availableField), $similarity);

            // Also check if one contains the other (partial match)
            $containsBonus = 0;
            if (strpos(strtolower($availableField), $normalizedSuggested) !== false ||
                strpos($normalizedSuggested, strtolower($availableField)) !== false) {
                $containsBonus = 20; // Add bonus for partial match
            }

            // Check for common word overlap (e.g., "auction" and "contact" in both)
            $suggestedWords = explode('_', $normalizedSuggested);
            $availableWords = explode('_', strtolower($availableField));
            $commonWords = array_intersect($suggestedWords, $availableWords);
            $wordMatchBonus = count($commonWords) * 15; // Bonus per matching word

            $totalSimilarity = $similarity + $containsBonus + $wordMatchBonus;

            if ($totalSimilarity > $highestSimilarity) {
                $highestSimilarity = $totalSimilarity;
                $bestMatch = $availableField;
            }
        }

        // Only return a match if similarity is reasonably high (60% threshold)
        if ($highestSimilarity >= 60) {
            return $bestMatch;
        }

        return null;
    }
}
