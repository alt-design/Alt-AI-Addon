<?php

return [

    /*
    |--------------------------------------------------------------------------
    | OpenAI API Key - https://platform.openai.com/api-keys
    |--------------------------------------------------------------------------
    */
    'api_key' => env('OPENAI_API_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | AI Agent Capabilities - Bard bits and bobs
    |--------------------------------------------------------------------------
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
    | OpenAI Available Models - gpt-4, gpt-4-turbo-preview, gpt-3.5-turbo
    |--------------------------------------------------------------------------
    */
    'model' => [
        'name' => env('OPENAI_MODEL', 'gpt-4'),
        'temperature' => 0.7,
        'max_tokens' => 2000,
    ],

    /*
    |--------------------------------------------------------------------------
    | UI
    |--------------------------------------------------------------------------
    */
    'ui' => [
        'floating_menu' => true,
        'keyboard_shortcuts' => true,
        'show_suggestions' => true,
    ],

];
