<?php

namespace AltDesign\AltAi\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAiApiClient
{
    /**
     * Call OpenAI API with messages
     *
     * @param array $messages
     * @param string $apiKey
     * @return array
     * @throws \Exception
     */
    public function chat(array $messages, string $apiKey): array
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

            throw new \Exception('AI service error: ' . $response->status());
        }

        return $response->json();
    }
}
