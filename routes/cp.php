<?php

use AltDesign\TiptapAiAgent\Http\Controllers\AiChatController;
use Illuminate\Support\Facades\Route;

Route::prefix('tiptap-ai-agent')->name('tiptap-ai-agent.')->group(function () {

    // Chat widget endpoint
    Route::post('/chat', [AiChatController::class, 'chat'])->name('chat');

    // Bard agent endpoint
    Route::post('/agent', [AiChatController::class, 'agent'])->name('agent');

});
