# Alt AI Addon - BETA

> AI-powered content assistance for Statamic Bard using OpenAI

## Features

- AI Agent with conversational modal for multi-turn interactions with full document context
- Global AI chat widget available throughout the Statamic control panel
- AI completion for auto-completing text based on context
- Content enhancement to improve grammar, clarity, and readability
- Text summarization for creating concise summaries
- Translation capabilities for multiple languages
- Tone adjustment (formal, casual, professional, friendly)
- Context-aware assistance that understands your page, collection, and entry
- Keyboard shortcuts for quick access to AI features
- Conversation history maintained across sessions

## How to Install

```bash
composer require alt-design/alt-ai
```

Publish the configuration file:

```bash
php artisan vendor:publish --tag=alt-ai-config
```

This will create a configuration file at `config/alt-ai.php`

## Configuration

### API Key Setup

Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys) and add it to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
```

### Configuration Options

Edit `config/alt-ai.php` to customize the addon:

```php
return [
    'api_key' => env('OPENAI_API_KEY', ''),
    
    'capabilities' => [
        'completion' => true,
        'enhancement' => true,
        'summarization' => true,
        'translation' => true,
        'tone_adjustment' => true,
    ],
    
    'model' => [
        'name' => env('OPENAI_MODEL', 'gpt-4'),
        'temperature' => 0.7,
        'max_tokens' => 2000,
    ],
];
```

Available OpenAI models: `gpt-4` (most capable), `gpt-4-turbo-preview` (faster), or `gpt-3.5-turbo` (efficient for simpler tasks).

## Usage

## What the frig can it do?
Good question. AI's somewhat unpredictable - so sometimes it'll work better than others. Prompt it specifically and it should be able to do "stuff".
**What we know it does do**
- It knows the context of the page
- It can edit simple fields

**What we're unsure of**
- Complex page builders
- Every field type

We've tested it on Bard fields, simple fields, radio buttons and checkboxes - I'll add to the list as I come across them.

### Enabling AI Buttons in Bard Fields

The addon registers AI toolbar buttons, but you must manually enable them in your Bard field configurations:

1. Open your blueprint in the Statamic Control Panel
2. Edit your Bard field settings
3. In the Buttons section, add: `aiAgent`, `aiComplete`, `aiEnhance`, `aiSummarize`
4. Save and refresh

Example Bard field configuration in YAML:

```yaml
-
  handle: content
  field:
    type: bard
    display: Content
    buttons:
      - h2
      - h3
      - bold
      - italic
      - link
      - aiAgent      # AI conversational modal
      - aiComplete   # AI auto-complete
      - aiEnhance    # AI text enhancement
      - aiSummarize  # AI summarization
```

### Using the AI Agent

The AI Agent button (chat bubble icon) opens a conversational modal:

1. Click the AI Agent button in the Bard toolbar
2. Ask the AI to help with your content - it has access to your full document and selected text
3. Example requests:
   - "Make this section more formal"
   - "Add more detail about the benefits"
   - "Rewrite this in a more engaging tone"
   - "Check for grammar and clarity issues"
4. Click "Apply to Editor" to insert AI-generated content

### Using the Global Chat Widget

A chat widget appears in the bottom-right corner of the Statamic CP:

- Context-aware: knows what page you're viewing, which collection you're editing, and entry titles
- Ask for help with content creation, editing, or general Statamic questions
- Conversation history saved in browser session
- Click minimize to get it out of the way

Example questions:
- "How should I structure this blog post?"
- "Help me write a meta description for this page"
- "What's a good way to phrase this call-to-action?"

### Keyboard Shortcuts

- **Cmd/Ctrl + Space**: Trigger AI completion
- **Cmd/Ctrl + Shift + E**: Enhance selected text

### Button Functions

- **AI Agent**: Opens conversational modal for complex interactions
- **AI Complete**: Auto-complete text from cursor position
- **AI Enhance**: Improve grammar, clarity, and readability of selected text
- **AI Summarize**: Generate concise summary of selected text

### Programmatic Usage

Trigger AI features programmatically using editor commands:

```javascript
editor.commands.aiComplete()
editor.commands.aiEnhance()
editor.commands.aiSummarize()
editor.commands.aiTranslate('es')
editor.commands.aiAdjustTone('formal')
```


## Troubleshooting

### Buttons not showing

- Clear your browser cache
- Run `php artisan cache:clear` and `php please stache:clear`
- Refresh the control panel

### API Key Issues

- Ensure `OPENAI_API_KEY` is set correctly in `.env`
- Check the browser console for authentication errors
- Verify your OpenAI account has sufficient credits
- Confirm your API key has necessary permissions

### No AI Suggestions

- Check your internet connection
- Verify the OpenAI API is accessible
- Check the browser console for API errors
- Ensure you're using a valid OpenAI model

### Rate Limiting

OpenAI has rate limits based on your account tier. Consider upgrading your OpenAI plan if you encounter rate limit errors.

## Questions etc

Drop us a big shout-out if you have any questions, comments, or concerns. We're always looking to improve our addons, so if you have any feature requests, we'd love to hear them.

### Starter Kits
- [Alt Starter Kit](https://statamic.com/starter-kits/alt-design/alt-starter-kit)

### Addons
- [Alt Admin Bar Addon](https://github.com/alt-design/Alt-Admin-Bar-Addon)
- [Alt Redirect Addon](https://github.com/alt-design/Alt-Redirect-Addon)
- [Alt Sitemap Addon](https://github.com/alt-design/Alt-Sitemap-Addon)
- [Alt Akismet Addon](https://github.com/alt-design/Alt-Akismet-Addon)
- [Alt Password Protect Addon](https://github.com/alt-design/Alt-Password-Protect-Addon)
- [Alt Cookies Addon](https://github.com/alt-design/Alt-Cookies-Addon)
- [Alt Inbound Addon](https://github.com/alt-design/Alt-Inbound-Addon)
- [Alt Google 2FA Addon](https://github.com/alt-design/Alt-Google-2fa-Addon)
- [Alt SEO Addon](https://github.com/alt-design/Alt-SEO-Addon)
- [Alt RiffRaff Addon](https://github.com/alt-design/Alt-RiffRaff-Addon)

## Postcardware

Send us a postcard from your hometown if you like this addon. We love getting mail from other cool peeps!

Alt Design  
St Helens House  
Derby  
DE1 3EE  
UK
