# Free LLM Setup Guide

This app supports multiple LLM providers for generating notes. You can use a **free** option instead of OpenAI!

## Option 1: Google Gemini (FREE - Recommended)

Google Gemini offers a generous free tier that's perfect for this use case.

### Setup Steps:

1. **Get your API key:**
   - Go to https://aistudio.google.com/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the API key

2. **Add to `.env.local`:**
   ```env
   GOOGLE_GEMINI_API_KEY=your-gemini-api-key-here
   # Optional: Specify model (default is gemini-pro)
   # GEMINI_MODEL=gemini-pro
   # GEMINI_MODEL=gemini-1.5-pro (for better quality, may have usage limits)
   ```

3. **Remove or comment out OpenAI key** (optional, Gemini will be used if available):
   ```env
   # OPENAI_API_KEY=sk-... (not needed if using Gemini)
   ```

### Free Tier Limits:
- **60 requests per minute**
- **1,500 requests per day**
- **1 million tokens per day**

This is more than enough for personal use!

---

## Option 2: OpenAI (Paid)

If you prefer OpenAI or have credits:

1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-...
   ```

---

## How It Works:

The app automatically chooses which LLM to use:
1. **If `GOOGLE_GEMINI_API_KEY` is set** → Uses Gemini (free)
2. **If only `OPENAI_API_KEY` is set** → Uses OpenAI
3. **If both are set** → Prefers Gemini (free option)
4. **If neither is set** → Shows error

---

## Switching Between Providers:

Just update your `.env.local` file and restart the dev server:

```bash
# Use Gemini (free)
GOOGLE_GEMINI_API_KEY=your-key
# OPENAI_API_KEY=sk-... (commented out)

# Or use OpenAI
# GOOGLE_GEMINI_API_KEY=... (commented out)
OPENAI_API_KEY=sk-...
```

---

## Testing:

After setting up, try recording a new lecture or click "Retry AI Notes" on an existing one. The notes should be generated using your chosen provider!

