# Siri Setup Guide

Complete step-by-step guide to configure Siri on your iPhone to use the voice dispatcher.

## Part 1: Make Dispatcher Accessible

Your iPhone needs to reach the dispatcher server. Choose one option:

### Option A: ngrok (Easiest for Testing)

1. **Install ngrok**:
   ```bash
   # macOS
   brew install ngrok

   # Or download from https://ngrok.com/download
   ```

2. **Start ngrok** (in a new terminal, after starting the dispatcher):
   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS URL** shown (e.g., `https://abc123.ngrok-free.app`)
   - **Important**: Use the HTTPS URL, not HTTP
   - This URL changes each time you restart ngrok (free tier)

### Option B: Local Network (Same WiFi)

1. **Find your computer's IP address**:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows
   ipconfig
   ```

2. **Use `http://YOUR-IP:3000`** (e.g., `http://192.168.1.100:3000`)

3. **Note**: Phone must be on same WiFi network

### Option C: Production Server (Recommended for Permanent Use)

Deploy the dispatcher to your own server with a domain:

**Example**: `https://dispatch.michoest.com`

Deployment options:
- **Raspberry Pi** with PM2 (see [DEPLOYMENT.md](DEPLOYMENT.md) for complete guide)
- Railway.app (free tier)
- Heroku
- AWS/GCP/Azure
- Any VPS (DigitalOcean, Linode, etc.)

**Benefits**:
- Permanent URL (no need to update Shortcut)
- HTTPS with valid SSL certificate
- Always available
- Better performance than ngrok

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step deployment instructions.

## Part 2: Create Siri Shortcut

### Step-by-Step Instructions

1. **Open Shortcuts App** on iPhone

2. **Tap `+` (Create new shortcut)**

3. **Add Action: Dictate Text**
   - Tap search bar
   - Type "Dictate Text"
   - Tap "Dictate Text" to add it
   - This captures your voice input

4. **Add Action: Get Contents of URL**
   - Tap search bar below
   - Type "Get Contents of URL"
   - Tap to add it
   - Configure as follows:

   **Click "URL" field** and enter ONE of these:
   - **Production**: `https://dispatch.michoest.com/api/dispatch` (if deployed)
   - **ngrok**: `https://your-ngrok-url.ngrok-free.app/api/dispatch` (for testing)
   - **Local network**: `http://YOUR-IP:3000/api/dispatch` (same WiFi only)

   Replace with your actual URL

   **Tap "Show More" to expand options**:

   **Method**: Change to `POST`

   **Headers**: Tap "Add new header"
   - Header 1:
     - Name: `x-api-key`
     - Value: `your-secure-dispatcher-api-key` (from your .env file)
   - Header 2:
     - Name: `Content-Type`
     - Value: `application/json`

   **Request Body**: Select `JSON`

   **In the JSON field**, construct:
   ```json
   {
     "transcript":
   }
   ```
   - After typing the `{` and `"transcript": `, tap the field
   - Tap the "Dictated Text" variable bubble that appears
   - Complete with the closing `}`

   The final JSON should show:
   ```json
   {
     "transcript": [Dictated Text]
   }
   ```

5. **Add Action: Get Dictionary from Input**
   - Search "Get Dictionary"
   - Add "Get Dictionary from Input"
   - Leave input as "Contents of URL"

6. **Add Action: Get Dictionary Value**
   - Search "Get Dictionary Value"
   - Add it
   - Tap "key" and type: `url`
   - Input should be "Dictionary"

7. **Add Action: If**
   - Search "If"
   - Add it
   - Configure:
     - If: `URL` (from previous step)
     - Condition: `is not`
     - Value: (leave empty to check if exists)

8. **Inside the If block, Add Action: Open URLs**
   - Search "Open URLs"
   - Add inside the "If" section
   - Tap "URLs" and select the `URL` variable

9. **In Otherwise block, Add Action: Show Result**
   - Search "Show Result"
   - Add it to the "Otherwise" section
   - Tap input and select `Dictionary`
   - This shows the full response if there's no URL

10. **Name your shortcut**
    - Tap "Shortcut Name" at the top
    - Name it something like "Voice Dispatch" or "Smart Command"

11. **Add to Siri**
    - Tap the (i) info button or settings icon
    - Find "Add to Siri" option
    - Tap it
    - Record your activation phrase: "Hey Siri, dispatch command"
    - Or: "Hey Siri, voice dispatch"
    - Or any phrase you prefer

## Part 3: Test It

### Test the Shortcut Manually

1. Open Shortcuts app
2. Tap your new shortcut
3. Speak when prompted: "Schedule a meeting tomorrow at 2pm"
4. Should see: Calendar app opens (or service response)

### Test with Siri

1. Say: "Hey Siri, dispatch command" (or your phrase)
2. Siri asks: "What do you want to say?"
3. Speak: "Remind me to buy milk"
4. Reminders app should open

### Example Commands

Try these to test all services:

**Calendar Service**:
- "Schedule a meeting tomorrow at 2pm"
- "Create an event called lunch on Friday"
- "Add doctor appointment next Monday at 10am"

**Reminder Service**:
- "Remind me to buy milk"
- "Create a reminder to call mom"
- "Add a high priority reminder to finish report"

**Weather Service**:
- "What's the weather in San Francisco"
- "Get the weather forecast for New York"
- "Show me the current weather in London"

## Troubleshooting

### Shortcut Errors

**"Cannot connect to server"**:
- ✅ Verify dispatcher is running: `npm run start:all`
- ✅ Check ngrok is running and URL is correct
- ✅ Test URL in iPhone Safari browser first
- ✅ If using local IP, ensure phone is on same WiFi

**"Invalid API key" or 403 error**:
- ✅ Check `x-api-key` header exactly matches `.env` value
- ✅ No extra spaces in header value

**"No response" or blank result**:
- ✅ Check dispatcher logs for errors
- ✅ Verify OpenAI API key is set in `.env`
- ✅ Ensure services are registered: `curl http://localhost:3000/api/services -H "x-api-key: your-key"`

**Shortcut runs but nothing happens**:
- ✅ Add "Show Result" actions between steps to debug
- ✅ Check if `status` is "uncertain" - command may be ambiguous
- ✅ Verify services are "healthy" in service list

### Siri-Specific Issues

**Siri doesn't recognize activation phrase**:
- Try a different, more unique phrase
- Record it multiple times
- Avoid common words

**Siri activates but doesn't ask for input**:
- Make sure "Dictate Text" is the first action
- Check "Show When Run" is enabled for dictation

**URL opens but wrong app**:
- URLs like `calendar://`, `reminders://` are handled by iOS
- These are mock URLs in dummy services
- Real services should return actual deep links

### Debugging Steps

1. **Test dispatcher locally**:
   ```bash
   curl -X POST http://localhost:3000/api/dispatch \
     -H "x-api-key: your-secure-dispatcher-api-key" \
     -H "Content-Type: application/json" \
     -d '{"transcript": "test"}'
   ```

2. **Test from phone browser**:
   - Open Safari on iPhone
   - Go to your ngrok URL
   - Should see some response (not API key error means it's reachable)

3. **Check dispatcher logs**:
   - Look for incoming requests
   - Check for OpenAI API errors
   - Verify service calls

4. **Simplify shortcut**:
   - Remove If/Otherwise
   - Just add "Show Result" after "Get Contents of URL"
   - See the raw response

## Advanced Configuration

### Handle Uncertain Responses

When LLM is uncertain, it returns options instead of a URL. To handle this:

1. **After "Get Dictionary Value" (for url)**:
   - Add another "Get Dictionary Value" for key: `status`

2. **Modify If condition**:
   - If: `status` equals `success`
   - Then: Open `url`
   - Otherwise: Show `explanation` or `options`

### Add Notification

For feedback without opening URLs:

1. After successful dispatch
2. Add "Show Notification" action
3. Body: `message` (from dictionary)

### Multiple Dispatch Phrases

Create multiple shortcuts with different Siri phrases:
- "Hey Siri, add to calendar" → Could skip dictation, ask for details
- "Hey Siri, check weather" → Pre-fill partial command
- "Hey Siri, create reminder" → Direct to reminder service

## Security Notes

⚠️ **Important**:
- The API key is stored in the Shortcut
- Anyone with access to your phone can view it
- Use a unique API key just for Siri
- Consider IP restrictions if deploying to production
- ngrok URLs are public - use authentication

## ngrok Free Tier Limitations

- URL changes every time you restart ngrok
- You'll need to update the Shortcut URL each time
- For permanent solution, use ngrok paid plan or deploy to cloud

## Next Steps

Once working:
1. Deploy dispatcher to permanent server
2. Update Shortcut with permanent URL
3. Create real services (not dummy ones)
4. Return actual app deep links
5. Add more sophisticated error handling in Shortcut
