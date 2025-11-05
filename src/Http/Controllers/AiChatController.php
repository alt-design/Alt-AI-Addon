<?php

namespace AltDesign\AltAi\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

use AltDesign\AltAi\Services\FieldUpdateParser;
use AltDesign\AltAi\Services\MessageBuilder;
use AltDesign\AltAi\Services\OpenAiApiClient;

class AiChatController
{
    protected OpenAiApiClient $apiClient;
    protected MessageBuilder $messageBuilder;
    protected FieldUpdateParser $fieldUpdateParser;

    public function __construct(
        OpenAiApiClient $apiClient,
        MessageBuilder $messageBuilder,
        FieldUpdateParser $fieldUpdateParser
    ) {
        $this->apiClient = $apiClient;
        $this->messageBuilder = $messageBuilder;
        $this->fieldUpdateParser = $fieldUpdateParser;
    }

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

            $messages = $this->messageBuilder->buildChatMessages(
                $validated['message'],
                $validated['conversation_history'] ?? [],
                $validated['context'] ?? [],
                $mode
            );

            $data = $this->apiClient->chat($messages, $apiKey);
            $aiMessage = $data['choices'][0]['message']['content'] ?? '';

            $fieldUpdates = $this->fieldUpdateParser->parse($aiMessage, $mode);

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
            $messages = $this->messageBuilder->buildAgentMessages(
                $validated['message'],
                $validated['document_content'] ?? '',
                $validated['selected_text'] ?? '',
                $validated['conversation_history'] ?? []
            );

            $data = $this->apiClient->chat($messages, $apiKey);

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
}
