import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/js/alt-ai-addon.js',
                'resources/css/alt-ai-addon.css',
            ],
            publicDirectory: 'resources/dist',
        }),
    ],
    server: {
        cors: true,
        strictPort: false,
    },
});
