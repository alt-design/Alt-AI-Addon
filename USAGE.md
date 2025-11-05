# How to Enable AI Buttons in Bard Fields

The TipTap AI Agent addon provides three AI-powered buttons for your Bard editors:

- **AI Complete** - Auto-complete text based on context
- **AI Enhance** - Improve and refine selected text
- **AI Summarize** - Generate concise summaries

## Quick Setup

The buttons are automatically registered and available, but you need to enable them in your Bard field configurations.

### Step 1: Open Your Blueprint

1. Go to the Statamic Control Panel
2. Navigate to **Blueprints** (under Collections, Taxonomies, or Globals)
3. Select the blueprint containing your Bard field
4. Click **Edit**

### Step 2: Configure Your Bard Field

1. Find your Bard field in the blueprint
2. Click the field settings (gear icon)
3. Scroll to the **Buttons** section
4. Add the following button names to enable AI features:
   - `aiComplete`
   - `aiEnhance`
   - `aiSummarize`

### Step 3: Save and Test

1. Click **Save** on the blueprint
2. Open or create an entry with the Bard field
3. You should now see the AI buttons in the toolbar!

## Example Blueprint Configuration

Here's what your Bard field configuration should look like in YAML:

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
      - unorderedlist
      - orderedlist
      - quote
      - link
      - aiComplete      # AI Complete button
      - aiEnhance       # AI Enhance button
      - aiSummarize     # AI Summarize button
```

## Alternative: Enable in All Bard Fields

If you want to add these buttons to ALL your Bard fields at once:

1. **Option A**: Edit each blueprint manually (recommended for selective use)
2. **Option B**: Use the blueprint YAML import/export feature to batch update

## Button Functionality

- **AI Complete**: Place cursor where you want text completed, click the button (or use `Cmd/Ctrl + Space`)
- **AI Enhance**: Select text you want to improve, click the button (or use `Cmd/Ctrl + Shift + E`)
- **AI Summarize**: Select text you want summarized, click the button

## Troubleshooting

**Buttons not showing after adding them to the blueprint?**
- Clear your browser cache
- Run `php artisan cache:clear`
- Run `php please stache:clear`
- Refresh the control panel

**API errors?**
- Verify your `OPENAI_API_KEY` is set in `.env`
- Check the browser console for error messages
- Ensure your OpenAI account has sufficient credits

## Need Help?

Refer to the main [README.md](README.md) for full documentation and configuration options.
