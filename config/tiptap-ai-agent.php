<?php

return [

    /*
    |--------------------------------------------------------------------------
    | OpenAI API Key
    |--------------------------------------------------------------------------
    |
    | Your OpenAI API key from https://platform.openai.com/api-keys
    | Reference: https://tiptap.dev/docs/content-ai/capabilities/agent/custom-llms/get-started/openai-responses
    |
    */
    'api_key' => env('OPENAI_API_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | AI Agent Capabilities
    |--------------------------------------------------------------------------
    |
    | Enable/disable specific AI capabilities in the Bard editor.
    | Available capabilities: completion, enhancement, summarization, etc.
    |
    */
    'capabilities' => [
        'completion' => true,
        'enhancement' => true,
        'summarization' => true,
        'translation' => true,
        'tone_adjustment' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | OpenAI Model Settings
    |--------------------------------------------------------------------------
    |
    | Configure the OpenAI model settings.
    | Available models: gpt-4, gpt-4-turbo-preview, gpt-3.5-turbo, etc.
    |
    */
    'model' => [
        'name' => env('OPENAI_MODEL', 'gpt-4'),
        'temperature' => 0.7,
        'max_tokens' => 2000,
    ],

    /*
    |--------------------------------------------------------------------------
    | UI Settings
    |--------------------------------------------------------------------------
    |
    | Customize the UI appearance and behavior of the AI Agent.
    |
    */
    'ui' => [
        'floating_menu' => true,
        'keyboard_shortcuts' => true,
        'show_suggestions' => true,
    ],

];
