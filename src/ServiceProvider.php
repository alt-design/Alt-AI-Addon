<?php

namespace AltDesign\AltAi;

use Statamic\Providers\AddonServiceProvider;
use Statamic\Statamic;

class ServiceProvider extends AddonServiceProvider
{
    protected $scripts = [
        __DIR__.'/../dist/js/alt-ai.js',
    ];

    protected $routes = [
        'cp' => __DIR__.'/../routes/cp.php',
    ];

    public function boot()
    {
        parent::boot();

        \Log::info('Alt AI: boot() called - providing config to script EARLY');

        // Make configuration available to JavaScript
        // Call in boot() method (before bootAddon) to ensure it's available before views are rendered
        $this->bootScript();

        \Log::info('Alt AI: boot() completed');
    }

    public function bootAddon()
    {
        \Log::info('Alt AI: bootAddon() called');

        $this->publishes([
            __DIR__.'/../config/alt-ai.php' => config_path('alt-ai.php'),
        ], 'alt-ai-config');

        // Inject configuration into the control panel
        Statamic::afterInstalled(function ($command) {
            $command->call('vendor:publish', [
                '--tag' => 'alt-ai-config',
            ]);
        });
    }

    protected function bootScript()
    {
        \Log::info('Alt AI: bootScript() started');

        $config = config('alt-ai', [
            'api_key' => config('alt-ai.api_key'),
            'capabilities' => [],
            'model' => [],
            'ui' => [],
            'website_context' => '',
            'system_prompt_override' => '',
            'saved_prompts' => [],
        ]);

        \Log::info('Alt AI: Config loaded', [
            'api_key_set' => !empty($config['api_key']),
            'api_key_length' => strlen($config['api_key'] ?? ''),
            'capabilities' => $config['capabilities'],
            'model' => $config['model'],
            'has_website_context' => !empty($config['website_context'] ?? ''),
            'has_system_prompt_override' => !empty($config['system_prompt_override'] ?? ''),
            'saved_prompts_count' => count($config['saved_prompts'] ?? []),
        ]);

        // Build endpoint URLs manually to avoid route dependency issues during boot
        $cpRoute = config('statamic.cp.route', 'cp');

        $dataToProvide = [
            'altAiConfig' => [
                'apiKey' => $config['api_key'],
                'capabilities' => $config['capabilities'],
                'model' => $config['model'],
                'ui' => $config['ui'],
                'websiteContext' => $config['website_context'] ?? '',
                'systemPromptOverride' => $config['system_prompt_override'] ?? '',
                'savedPrompts' => $config['saved_prompts'] ?? [],
                'endpoints' => [
                    'chat' => '/' . trim($cpRoute, '/') . '/alt-ai/chat',
                    'agent' => '/' . trim($cpRoute, '/') . '/alt-ai/agent',
                ],
            ],
        ];

        \Log::info('Alt AI: About to call provideToScript with data', [
            'data_structure' => array_keys($dataToProvide),
            'has_altAiConfig' => isset($dataToProvide['altAiConfig']),
            'has_apiKey' => isset($dataToProvide['altAiConfig']['apiKey']),
            'apiKey_length' => strlen($dataToProvide['altAiConfig']['apiKey'] ?? ''),
        ]);

        Statamic::provideToScript($dataToProvide);

        \Log::info('Alt AI: provideToScript() called successfully');
    }
}
