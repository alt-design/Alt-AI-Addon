<?php

namespace AltDesign\AltAi\Http\Controllers;

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
            'conversation_history' => 'nullable|array',
            'context' => 'nullable|array',
            'mode' => 'nullable|string|in:chat,update_fields',
        ]);

        $apiKey = config('alt-ai.api_key');

        if (empty($apiKey)) {
            return response()->json([
                'error' => 'OpenAI API key not configured'
            ], 500);
        }

        try {
            $mode = $validated['mode'] ?? 'chat';

            $messages = $this->buildMessages(
                $validated['message'],
                $validated['conversation_history'] ?? [],
                $validated['context'] ?? [],
                $mode
            );

            $data = $this->callOpenAI($messages, $apiKey);
            $aiMessage = $data['choices'][0]['message']['content'] ?? '';

            $fieldUpdates = $this->parseFieldUpdates($aiMessage, $mode);

            return response()->json([
                'message' => $aiMessage,
                'usage' => $data['usage'] ?? null,
                'field_updates' => $fieldUpdates,
                'mode' => $mode,
            ]);

        } catch (\Exception $e) {
            Log::error('AI Chat error: ' . $e->getMessage());

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
            'document_content' => 'nullable|string',
            'selected_text' => 'nullable|string',
            'conversation_history' => 'nullable|array',
        ]);

        $apiKey = config('alt-ai.api_key');

        if (empty($apiKey)) {
            return response()->json([
                'error' => 'OpenAI API key not configured'
            ], 500);
        }

        try {
            $messages = $this->buildAgentMessages(
                $validated['message'],
                $validated['document_content'] ?? '',
                $validated['selected_text'] ?? '',
                $validated['conversation_history'] ?? []
            );

            $data = $this->callOpenAI($messages, $apiKey);

            return response()->json([
                'message' => $data['choices'][0]['message']['content'] ?? '',
                'usage' => $data['usage'] ?? null,
            ]);

        } catch (\Exception $e) {
            Log::error('AI Agent error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Failed to process agent request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Call OpenAI API with messages
     */
    protected function callOpenAI($messages, $apiKey)
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
            'model' => config('alt-ai.model.name', 'gpt-4'),
            'messages' => $messages,
            'temperature' => config('alt-ai.model.temperature', 0.7),
            'max_tokens' => config('alt-ai.model.max_tokens', 2000),
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

        return $response->json();
    }

    /**
     * Parse field updates from AI response
     */
    protected function parseFieldUpdates($aiMessage, $mode)
    {
        if ($mode !== 'update_fields') {
            return null;
        }

        try {
            $jsonStr = $aiMessage;

            // Remove markdown code blocks if present
            if (preg_match('/```json\s*(\{.*?\})\s*```/s', $jsonStr, $matches)) {
                $jsonStr = $matches[1];
            } elseif (preg_match('/```\s*(\{.*?\})\s*```/s', $jsonStr, $matches)) {
                $jsonStr = $matches[1];
            }

            $parsedData = json_decode($jsonStr, true);

            if ($parsedData && isset($parsedData['action']) && $parsedData['action'] === 'update_fields') {
                return $parsedData;
            }
        } catch (\Exception $e) {
            // Silent failure - field updates are optional
        }

        return null;
    }

    /**
     * Convert any value to a safe string representation
     */
    protected function convertToString($value)
    {
        return match (true) {
            is_null($value) => '',
            is_bool($value) => $value ? 'Yes' : 'No',
            is_string($value) || is_numeric($value) => (string)$value,
            is_array($value) => data_get($value, 'name')
                ?? data_get($value, 'handle')
                ?? data_get($value, 'title')
                ?? collect($value)->filter(fn($item) => is_scalar($item))->implode(', ')
                ?: '[Array]',
            is_object($value) => rescue(fn() => (string)$value,
                fn() => data_get($value, 'name')
                    ?? data_get($value, 'handle')
                    ?? data_get($value, 'title')
                    ?? '[Object]',
                false),
            default => (string)$value,
        };
    }

    /**
     * Build messages array for chat conversations
     */
    protected function buildMessages($userMessage, $conversationHistory, $context, $mode = 'chat')
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
                $systemPrompt .= "Title: " . $this->convertToString($context['title']) . "\n";
            }

            if (isset($context['slug'])) {
                $systemPrompt .= "Slug: " . $this->convertToString($context['slug']) . "\n";
            }

            if (isset($context['entry_id'])) {
                $systemPrompt .= "Entry ID: " . $this->convertToString($context['entry_id']) . "\n";
            }

            if (isset($context['permalink'])) {
                $systemPrompt .= "Permalink: " . $this->convertToString($context['permalink']) . "\n";
            }

            if (isset($context['status'])) {
                $systemPrompt .= "Publication Status: " . ucfirst($this->convertToString($context['status'])) . "\n";
            }

            $systemPrompt .= "\n";

            // Collection/Structure Information
            if (isset($context['collection']) || isset($context['blueprint'])) {
                $systemPrompt .= "=== STRUCTURE ===\n";

                if (isset($context['collection'])) {
                    $systemPrompt .= "Collection: " . $this->convertToString($context['collection']) . "\n";
                }

                if (isset($context['blueprint'])) {
                    $systemPrompt .= "Blueprint: " . $this->convertToString($context['blueprint']) . "\n";
                }

                if (isset($context['taxonomy'])) {
                    $systemPrompt .= "Taxonomy: " . $this->convertToString($context['taxonomy']) . "\n";
                }

                if (isset($context['global'])) {
                    $systemPrompt .= "Global Set: " . $this->convertToString($context['global']) . "\n";
                }

                if (isset($context['parent'])) {
                    $systemPrompt .= "Parent Entry: " . $this->convertToString($context['parent']) . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Date Information
            if (isset($context['date']) || isset($context['created_at']) || isset($context['updated_at']) || isset($context['auction_date'])) {
                $systemPrompt .= "=== DATES & TIMELINE ===\n";

                if (isset($context['date'])) {
                    $systemPrompt .= "Date: " . $this->convertToString($context['date']) . "\n";
                }

                if (isset($context['auction_date'])) {
                    $systemPrompt .= "Auction Date: " . $this->convertToString($context['auction_date']) . "\n";
                }

                if (isset($context['created_at'])) {
                    $systemPrompt .= "Created: " . $this->convertToString($context['created_at']) . "\n";
                }

                if (isset($context['updated_at'])) {
                    $systemPrompt .= "Last Updated: " . $this->convertToString($context['updated_at']) . "\n";
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
                    $systemPrompt .= "Auctioneer: " . $this->convertToString($context['auctioneer']) . "\n";
                }

                if (isset($context['location'])) {
                    $systemPrompt .= "Location: " . $this->convertToString($context['location']) . "\n";
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
                    $systemPrompt .= "Entry Author: " . $this->convertToString($context['author']) . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Site & Localization
            if (isset($context['site']) || isset($context['locale']) || isset($context['multisite'])) {
                $systemPrompt .= "=== SITE & LOCALIZATION ===\n";

                if (isset($context['site'])) {
                    $systemPrompt .= "Site: " . $this->convertToString($context['site']) . "\n";
                }

                if (isset($context['locale'])) {
                    $systemPrompt .= "Locale: " . $this->convertToString($context['locale']) . "\n";
                }

                if (isset($context['multisite'])) {
                    $systemPrompt .= "Multisite Enabled: " . ($context['multisite'] ? 'Yes' : 'No') . "\n";
                }

                $systemPrompt .= "\n";
            }

            // Navigation context
            if (isset($context['route'])) {
                $systemPrompt .= "=== CURRENT LOCATION ===\n";
                $systemPrompt .= "Control Panel Route: " . $this->convertToString($context['route']) . "\n\n";
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
            $systemPrompt .= "  WRONG: Converting display label 'Auction Contact' to 'auction_contact'\n";
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
     */
    protected function buildAgentMessages($userMessage, $documentContent, $selectedText, $conversationHistory)
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

        // FIRST: Check for exact match
        foreach ($availableFields as $availableField) {
            if (strtolower($availableField) === $normalizedSuggested) {
                return $availableField;
            }
        }

        // SECOND: If no exact match, try fuzzy matching

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
