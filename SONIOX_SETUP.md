# Soniox API Setup Guide

## Current Issue: 404 Error

You're getting a 404 error from Soniox API, which means the endpoint URL is incorrect.

## Steps to Fix:

### 1. Check Soniox Documentation

Visit: **https://soniox.com/docs/stt/api-reference**

Look for:
- The exact endpoint URL for starting a transcription
- The request format (POST body structure)
- The response format (how job_id is returned)

### 2. Common Endpoint Variations to Try

Based on common API patterns, try these endpoints (one at a time):

```env
# Option 1: Current (may be wrong)
SONIOX_API_ENDPOINT=https://api.soniox.com/v1/transcribe

# Option 2: Plural form
SONIOX_API_ENDPOINT=https://api.soniox.com/v1/transcriptions

# Option 3: Async specific
SONIOX_API_ENDPOINT=https://api.soniox.com/v1/transcribe_async

# Option 4: Different base URL
SONIOX_API_ENDPOINT=https://api.soniox.com/v1/transcribe/file_url
```

### 3. Set the Correct Endpoint

Once you find the correct endpoint from Soniox docs, add it to your `.env.local`:

```env
SONIOX_API_KEY=6560830e43784e025e9dbb645e4c09fe749fbd260a571199902537bfbb8cdf1e
SONIOX_API_ENDPOINT=https://api.soniox.com/v1/[CORRECT_ENDPOINT_HERE]
```

### 4. Verify Request Format

Check if the request body needs different parameters. Common variations:

```json
// Current format:
{ "audio_url": "..." }

// Might need:
{ 
  "url": "...",
  "audio_url": "...",
  "file_url": "...",
  "source_url": "..."
}
```

### 5. Test the Endpoint Directly

You can test the Soniox API directly using curl:

```bash
curl -X POST https://api.soniox.com/v1/transcribe \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "https://example.com/audio.mp3"}'
```

Replace `YOUR_API_KEY` with your actual key and use a test audio URL.

### 6. Check Your API Key Permissions

Make sure your API key has permissions for:
- Transcription services
- Async transcription (if that's what you're using)
- The specific endpoint you're trying to access

### 7. After Finding the Correct Endpoint

Once you know the correct endpoint:
1. Update `.env.local` with `SONIOX_API_ENDPOINT`
2. Restart your dev server
3. The code will automatically use the correct endpoint

## What to Look For in Soniox Docs

1. **Starting Transcription:**
   - Endpoint URL: `POST /v1/???`
   - Request body format
   - Response format (job_id field name)

2. **Checking Status:**
   - Endpoint URL: `GET /v1/???/{job_id}`
   - Status values (completed, processing, etc.)
   - Response format for transcript

3. **Authentication:**
   - Header format (we're using `Bearer {token}`)
   - API key format

## Need Help?

If you find the correct endpoint format, share it and I'll update the code accordingly.

