<?php

use AltDesign\AltAi\Http\Controllers\AiChatController;
use Illuminate\Support\Facades\Route;

Route::prefix('alt-ai')->name('alt-ai.')->group(function () {

    // Chat widget endpoint
    Route::post('/chat', [AiChatController::class, 'chat'])->name('chat');

    // Bard agent endpoint
    Route::post('/agent', [AiChatController::class, 'agent'])->name('agent');

});
