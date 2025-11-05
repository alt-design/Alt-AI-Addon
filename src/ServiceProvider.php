<?php

namespace AltDesign\TiptapAiAgent;

use Statamic\Providers\AddonServiceProvider;
use Statamic\Statamic;

class ServiceProvider extends AddonServiceProvider
{
    protected $scripts = [
        __DIR__.'/../dist/js/tiptap-ai-agent.js',
    ];

    protected $routes = [
        'cp' => __DIR__.'/../routes/cp.php',
    ];

    public function boot()
    {
        parent::boot();

        \Log::info('TipTap AI Agent: boot() called - providing config to script EARLY');

        // Make configuration available to JavaScript
        // Call in boot() method (before bootAddon) to ensure it's available before views are rendered
        $this->bootScript();

        \Log::info('TipTap AI Agent: boot() completed');
    }

    public function bootAddon()
    {
        \Log::info('TipTap AI Agent: bootAddon() called');

        $this->publishes([
            __DIR__.'/../config/tiptap-ai-agent.php' => config_path('tiptap-ai-agent.php'),
        ], 'tiptap-ai-agent-config');

        // Inject configuration into the control panel
        Statamic::afterInstalled(function ($command) {
            $command->call('vendor:publish', [
                '--tag' => 'tiptap-ai-agent-config',
            ]);
        });
    }

    protected function bootScript()
    {
        \Log::info('TipTap AI Agent: bootScript() started');

        $config = config('tiptap-ai-agent', [
            'api_key' => config('tiptap-ai-agent.api_key'),
            'capabilities' => [],
            'model' => [],
            'ui' => [],
            'website_context' => '',
            'system_prompt_override' => '',
            'saved_prompts' => [],
        ]);

        \Log::info('TipTap AI Agent: Config loaded', [
            'api_key_set' => !empty($config['api_key']),
            'api_key_length' => strlen($config['api_key'] ?? ''),
            'capabilities' => $config['capabilities'],
            'model' => $config['model'],
            'has_website_context' => !empty($config['website_context']),
            'has_system_prompt_override' => !empty($config['system_prompt_override']),
            'saved_prompts_count' => count($config['saved_prompts']),
        ]);

        // Build endpoint URLs manually to avoid route dependency issues during boot
        $cpRoute = config('statamic.cp.route', 'cp');

        $dataToProvide = [
            'tiptapAiConfig' => [
                'apiKey' => $config['api_key'],
                'capabilities' => $config['capabilities'],
                'model' => $config['model'],
                'ui' => $config['ui'],
                'websiteContext' => $config['website_context'] ?? '',
                'systemPromptOverride' => $config['system_prompt_override'] ?? '',
                'savedPrompts' => $config['saved_prompts'] ?? [],
                'endpoints' => [
                    'chat' => '/' . trim($cpRoute, '/') . '/tiptap-ai-agent/chat',
                    'agent' => '/' . trim($cpRoute, '/') . '/tiptap-ai-agent/agent',
                ],
            ],
        ];

        \Log::info('TipTap AI Agent: About to call provideToScript with data', [
            'data_structure' => array_keys($dataToProvide),
            'has_tiptapAiConfig' => isset($dataToProvide['tiptapAiConfig']),
            'has_apiKey' => isset($dataToProvide['tiptapAiConfig']['apiKey']),
            'apiKey_length' => strlen($dataToProvide['tiptapAiConfig']['apiKey'] ?? ''),
        ]);

        Statamic::provideToScript($dataToProvide);

        \Log::info('TipTap AI Agent: provideToScript() called successfully');
    }
}
