<?php

use Illuminate\Support\Facades\Route;

use AltDesign\AltAi\Http\Controllers\AiChatController;

Route::group(['prefix' => 'alt-ai', 'name' => 'alt-ai.'], function () {

    // Widget Route
    Route::post('/chat', [AiChatController::class, 'chat'])->name('chat');

    // Bard Agentic Route
    Route::post('/agent', [AiChatController::class, 'agent'])->name('agent');

});
