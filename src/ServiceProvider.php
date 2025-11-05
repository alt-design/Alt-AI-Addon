<?php

namespace AltDesign\AltAi;

use Statamic\Providers\AddonServiceProvider;
use Statamic\Statamic;

class ServiceProvider extends AddonServiceProvider
{
    protected $vite = [
        'input' => [
            'resources/js/alt-ai-addon.js',
            'resources/css/alt-ai-addon.css',
        ],
        'publicDirectory' => 'resources/dist',
    ];

    protected $routes = [
        'cp' => __DIR__.'/../routes/cp.php',
    ];

    public function boot()
    {
        parent::boot();

        $this->bootScript();
    }

    public function bootAddon()
    {
        $this->publishes([
            __DIR__.'/../config/alt-ai.php' => config_path('alt-ai.php'),
        ], 'alt-ai-config');

        Statamic::afterInstalled(function ($command) {
            $command->call('vendor:publish', [
                '--tag' => 'alt-ai-config',
            ]);
        });
    }

    protected function bootScript()
    {
        $config = config('alt-ai', [
            'api_key' => config('alt-ai.api_key'),
            'capabilities' => [],
            'model' => [],
            'ui' => [],
            'website_context' => '',
            'system_prompt_override' => '',
            'saved_prompts' => [],
        ]);

        $cpRoute = config('statamic.cp.route', 'cp');

        Statamic::provideToScript([
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
        ]);
    }
}
