# Debugging Soniox Integration

## How to Verify What's Happening

### 1. Check Terminal Logs

When you start a transcription, look for these log messages in your terminal (where `npm run dev` is running):

#### Expected Successful Flow:

```
✅ API Key found: 6560830e...df1e
📤 Uploading audio file to Soniox first...
✅ Audio file fetched, size: [size] type: [type]
📤 Uploading to Soniox: https://api.soniox.com/v1/files File: audio.webm Size: [size]
✅ File uploaded to Soniox successfully, file_id: [file_id]
📤 Calling Soniox API: https://api.soniox.com/v1/transcriptions
✅ Using file_id for transcription: [file_id]
📋 Transcription config being sent to Soniox: {...}
📥 Soniox Response Status: 200 OK
✅ Soniox API Response: {...}
✅ Soniox transcription started successfully!
   Transcription ID: [id]
   Used method: file_id (uploaded)
```

#### If File Upload Fails:

```
⚠️ File upload failed (status: [status]), falling back to audio_url
Upload error details: [error]
⚠️ WARNING: Falling back to audio_url (file upload may have failed): [url]
```

#### If Transcription Fails:

```
❌ Soniox API Error: {
  status: [status],
  statusText: [text],
  error: [error message],
  url: [url]
}
```

### 2. Check What's Being Sent to Soniox

Look for the log line:
```
📋 Transcription config being sent to Soniox: {...}
```

This will show you exactly what configuration is being sent. Check:
- Is `file_id` present? (Good - means file upload worked)
- Is `audio_url` present instead? (Bad - means file upload failed)
- Are all the config options correct? (model, language_hints, etc.)

### 3. Common Issues and Solutions

#### Issue: "invalid_audio_file" Error

**Possible Causes:**
1. File upload failed → falling back to audio_url → Soniox can't process webm via URL
2. The audio file format is actually unsupported
3. The signed URL has expired or is not accessible

**Check:**
- Look for "⚠️ WARNING: Falling back to audio_url" in logs
- Check if file upload step succeeded
- Verify the audio file size is reasonable (> 0 bytes)

#### Issue: File Upload Fails

**Check logs for:**
- "⚠️ File upload failed"
- The status code and error message
- Whether it's a network issue or Soniox rejecting the file

**Solutions:**
- Check if the audio file is accessible from your server
- Verify the file size (Soniox might have limits)
- Check Soniox API documentation for file size limits

### 4. Testing a New Recording

**IMPORTANT:** The error you're seeing might be from an OLD recording. To test the fix:

1. **Create a completely new recording** (don't use the old one)
2. **Watch the terminal logs** as it processes
3. **Look for the log messages** listed above

### 5. Manual Verification Steps

If logs show file upload is failing, you can manually test:

```bash
# Test if you can fetch the audio file
curl -I "YOUR_AUDIO_URL_HERE"

# Should return 200 OK if accessible
```

### 6. What to Share When Asking for Help

When reporting issues, share:
1. The terminal logs from when you create a NEW recording
2. Look for these specific log messages:
   - "📤 Uploading audio file to Soniox first..."
   - "✅ File uploaded to Soniox successfully" OR "⚠️ File upload failed"
   - "✅ Using file_id" OR "⚠️ WARNING: Falling back to audio_url"
   - "📋 Transcription config being sent to Soniox"
   - Any error messages with ❌

