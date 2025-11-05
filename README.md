# TipTap AI Agent for Statamic Bard (with OpenAI)

A Statamic addon that integrates OpenAI's powerful language models into the Bard editor, enabling AI-assisted content creation and editing using OpenAI's API.

## Features

### 🤖 AI Agent (Conversational AI in Bard)
- **Conversational Interface**: Open a modal to have multi-turn conversations with AI about your content
- **Full Document Context**: AI has access to your entire document and selected text
- **Custom Instructions**: Give the AI specific instructions like "Make this more formal" or "Add more detail about X"
- **Apply Suggestions**: Click to apply AI-generated content directly to your editor
- **Conversation History**: Maintains context across multiple messages

### 💬 Global AI Chat Widget
- **Bottom-Right Chat**: Persistent AI assistant available throughout the Statamic CP
- **Context-Aware**: Knows what page you're on, which collection you're editing, and entry titles
- **General Assistance**: Help with content creation, editing, and Statamic-related questions
- **Conversation Persistence**: Chat history saved in browser session
- **Minimize/Maximize**: Stays out of the way until you need it

### ⚡ Quick AI Commands
- **AI Completion**: Auto-complete text based on context using keyboard shortcuts or commands
- **Content Enhancement**: Improve and refine selected text with AI assistance
- **Text Summarization**: Generate concise summaries of selected content
- **Translation**: Translate content into different languages
- **Tone Adjustment**: Adjust the tone of your writing (formal, casual, professional, etc.)

### 🛠️ Configuration & Integration
- **Keyboard Shortcuts**: Quick access to AI features while editing
- **Configurable Capabilities**: Enable/disable specific AI features as needed
- **OpenAI Integration**: Uses OpenAI's Chat Completions API for reliable, high-quality results

## Installation

1. **Install the addon**

   This addon is located in your `addons` directory at:
   ```
   addons/alt-design/tiptap-ai-agent/
   ```

2. **Install dependencies** (if you plan to modify the JavaScript)

   ```bash
   cd addons/alt-design/tiptap-ai-agent
   npm install
   ```

3. **Publish the configuration file**

   ```bash
   php artisan vendor:publish --tag=tiptap-ai-agent-config
   ```

   This will create a configuration file at `config/tiptap-ai-agent.php`

## Configuration

### API Key Setup

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)

2. Add the API key to your `.env` file:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4
   ```

### Configuration Options

Edit `config/tiptap-ai-agent.php` to customize the addon:

```php
return [
    'api_key' => env('OPENAI_API_KEY', ''),
    
    'capabilities' => [
        'completion' => true,        // Enable AI text completion
        'enhancement' => true,       // Enable text enhancement
        'summarization' => true,     // Enable text summarization
        'translation' => true,       // Enable translation
        'tone_adjustment' => true,   // Enable tone adjustment
    ],
    
    'model' => [
        'name' => env('OPENAI_MODEL', 'gpt-4'),  // OpenAI model: gpt-4, gpt-4-turbo-preview, gpt-3.5-turbo
        'temperature' => 0.7,        // Creativity level (0.0 - 1.0)
        'max_tokens' => 2000,        // Maximum response length
    ],
    
    'ui' => [
        'floating_menu' => true,      // Show floating AI menu
        'keyboard_shortcuts' => true, // Enable keyboard shortcuts
        'show_suggestions' => true,   // Show AI suggestions
    ],
];
```

### Available OpenAI Models

- **gpt-4**: Most capable model, best for complex tasks
- **gpt-4-turbo-preview**: Faster and more cost-effective than gpt-4
- **gpt-3.5-turbo**: Fast and efficient for simpler tasks

## Usage

The TipTap AI Agent adds powerful AI features to all Bard editors in your Statamic control panel. The features are available through **toolbar buttons**, **keyboard shortcuts**, and **programmatic commands**.

### ⚠️ Important: Enabling AI Buttons

The addon registers four AI toolbar buttons, but **you must manually enable them** in your Bard field configurations:

- **AI Agent** (💬 chat icon): Open conversational AI modal for multi-turn interactions
- **AI Complete** (⚡ wand icon): Auto-complete text based on context
- **AI Enhance** (+ icon): Improve and refine selected text
- **AI Summarize** (≡ icon): Generate a concise summary of selected text

**➡️ See [USAGE.md](USAGE.md) for step-by-step instructions on how to add these buttons to your Bard fields.**

### Quick Enable Instructions

1. Open your blueprint in the Statamic Control Panel
2. Edit your Bard field settings
3. In the **Buttons** section, add: `aiAgent`, `aiComplete`, `aiEnhance`, `aiSummarize`
4. Save and refresh

For detailed instructions with examples, see [USAGE.md](USAGE.md).

## Using the AI Features

### 🤖 AI Agent (Conversational Modal)

The AI Agent provides a conversational interface for more complex AI interactions:

1. **Enable the button**: Add `aiAgent` to your Bard field's button configuration
2. **Click the AI Agent button** in the toolbar (chat bubble icon)
3. **Have a conversation**: Ask the AI to help with your content
   - "Make this section more formal"
   - "Add more detail about the benefits"
   - "Suggest improvements to this paragraph"
   - "Rewrite this in a more engaging tone"
4. **Apply suggestions**: Click "Apply to Editor" to insert AI-generated content
5. **Context-aware**: The AI has access to your full document and any selected text

**Example conversations:**
- "Review the introduction and suggest improvements"
- "This sounds too technical, can you simplify it?"
- "Add a conclusion paragraph summarizing the key points"
- "Check for grammar and clarity issues"

### 💬 Global AI Chat Widget

The chat widget appears in the bottom-right corner of the Statamic CP:

1. **Click the chat button** to open (appears automatically)
2. **Ask anything**: Get help with content, Statamic questions, or general assistance
3. **Context-aware**: The widget knows:
   - What page you're viewing
   - Which collection/blueprint you're editing
   - The current entry title
4. **Conversation history**: Your chat persists throughout your session
5. **Minimize**: Click the minimize button to get it out of the way

**Example questions:**
- "How should I structure this blog post?"
- "Can you help me write a meta description for this page?"
- "What's a good way to phrase this call-to-action?"
- "Help me come up with tags for this entry"

### Keyboard Shortcuts

When editing in the Bard editor, use these keyboard shortcuts:

- **Cmd/Ctrl + Space**: Trigger AI completion
- **Cmd/Ctrl + Shift + E**: Enhance selected text

### Programmatic Usage

You can also trigger AI features programmatically using editor commands:

```javascript
// AI Completion
editor.commands.aiComplete()

// Enhance selected text
editor.commands.aiEnhance()

// Summarize selected text
editor.commands.aiSummarize()

// Translate to Spanish
editor.commands.aiTranslate('es')

// Adjust tone to formal
editor.commands.aiAdjustTone('formal')
```

## AI Capabilities

### 1. Text Completion

Automatically complete your text based on context. Start typing and press `Cmd/Ctrl + Space` to get AI-powered suggestions.

### 2. Content Enhancement

Select any text and press `Cmd/Ctrl + Shift + E` to enhance it. The AI will:
- Improve grammar and spelling
- Enhance clarity and readability
- Optimize sentence structure

### 3. Summarization

Select a block of text and use the summarize command to get a concise summary. Perfect for creating excerpts or TL;DR sections.

### 4. Translation

Translate content into multiple languages while maintaining context and tone.

### 5. Tone Adjustment

Adjust the tone of your writing to match your audience:
- `formal`: Professional, business-appropriate language
- `casual`: Relaxed, conversational tone
- `professional`: Expert, authoritative voice
- `friendly`: Warm, approachable style

## Technical Details

### Architecture

The addon consists of:

1. **ServiceProvider** (`src/ServiceProvider.php`): Registers the addon with Statamic and injects configuration
2. **JavaScript Extension** (`resources/js/tiptap-ai-agent.js`): TipTap extension that adds AI capabilities to Bard
3. **Configuration** (`config/tiptap-ai-agent.php`): Settings for API keys and features

### OpenAI Integration

This addon extends the Bard editor by registering a custom TipTap extension using Statamic's `$bard.addExtension()` API. It uses OpenAI's Chat Completions API for all AI operations.

References: 
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference/chat/create)
- [TipTap Custom LLMs with OpenAI](https://tiptap.dev/docs/content-ai/capabilities/agent/custom-llms/get-started/openai-responses)

## Development

### Building the JavaScript

If you modify the JavaScript source:

```bash
cd addons/alt-design/tiptap-ai-agent
npm run build
```

For development with auto-rebuild:

```bash
npm run dev
```

### Testing

Test the addon by:

1. Opening any entry with a Bard field in the Statamic control panel
2. Trying the keyboard shortcuts
3. Checking the browser console for any errors

## Troubleshooting

### API Key Not Working

- Ensure your API key is set correctly in `.env` as `OPENAI_API_KEY`
- Check the browser console for authentication errors
- Verify your OpenAI account has sufficient credits
- Confirm your API key has the necessary permissions

### Extension Not Loading

- Clear your browser cache
- Run `php please cache:clear`
- Check that the addon is properly installed in `addons/alt-design/tiptap-ai-agent/`

### No AI Suggestions

- Check your internet connection
- Verify the OpenAI API is accessible
- Check the browser console for API errors
- Ensure you're using a valid OpenAI model (gpt-4, gpt-3.5-turbo, etc.)

### Rate Limiting

- OpenAI has rate limits based on your account tier
- If you encounter rate limit errors, consider upgrading your OpenAI plan or implementing delays between requests

## Support

For issues specific to:
- **OpenAI API**: Check [OpenAI's documentation](https://platform.openai.com/docs) or contact OpenAI support
- **This addon**: Check the code in `addons/alt-design/tiptap-ai-agent/`

## License

Copyright (C) Alt Design Limited - All Rights Reserved

## Credits

Built by [Alt Design](https://alt-design.net) for Statamic

Powered by [OpenAI](https://openai.com) | Integration reference: [TipTap Custom LLMs](https://tiptap.dev/docs/content-ai/capabilities/agent/custom-llms/get-started/openai-responses)
