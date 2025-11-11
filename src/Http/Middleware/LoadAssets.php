<?php

namespace AltDesign\AltAi\Http\Middleware;

use Closure;
use Statamic\Statamic;

class LoadAssets
{
    public function handle($request, Closure $next)
    {
        // Register Vite assets and script configuration for authenticated CP requests
        $this->registerViteAssets();
        $this->registerScriptConfig();

        return $next($request);
    }

    protected function registerViteAssets()
    {
        Statamic::vite('alt-design/alt-ai', [
            'hotFile' => __DIR__ . '/../../../resources/dist/hot',
            'buildDirectory' => 'vendor/alt-ai/build',
            'input' => [
                'resources/js/alt-ai-addon.js',
                'resources/css/alt-ai-addon.css',
            ],
        ]);
    }

    protected function registerScriptConfig()
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
