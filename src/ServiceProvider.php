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

    protected $middlewareGroups = [
        'statamic.cp.authenticated' => [
            \AltDesign\AltAi\Http\Middleware\LoadAssets::class,
        ],
    ];

    protected function bootVite()
    {
        if (!$this->vite) {
            return $this;
        }

        // Always set up publishing (needed for php artisan vendor:publish)
        $name = $this->getAddon()->packageName();
        $directory = $this->getAddon()->directory();
        $config = $this->vite;

        $publicDirectory = $config['publicDirectory'] ?? 'public';
        $buildDirectory = $config['buildDirectory'] ?? 'build';

        $publishSource = "{$directory}{$publicDirectory}/{$buildDirectory}/";
        $publishTarget = public_path("vendor/{$name}/{$buildDirectory}/");

        $this->publishes([
            $publishSource => $publishTarget,
        ], $this->getAddon()->slug());

        // Only register Vite assets for inclusion if we're in an authenticated CP context
        // The LoadAssets middleware will handle actual registration for authenticated users
        return $this;
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
}
