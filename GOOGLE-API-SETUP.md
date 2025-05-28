# Google Fact Check Tools API Setup Guide

## 🌐 Setting up Google Fact Check Tools API for KagamiMe

### Step 1: Google Cloud Console Setup

1. **Visit Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Create or Select Project**
   - Create a new project or select an existing one
   - Note: You can use the free tier for testing

3. **Enable Fact Check Tools API**
   - Go to **APIs & Services** → **Library**
   - Search for: `Fact Check Tools API`
   - Click **Enable**

### Step 2: Create API Key

1. **Navigate to Credentials**
   - Go to **APIs & Services** → **Credentials**

2. **Create API Key**
   - Click **Create Credentials** → **API Key**
   - Copy the generated API key (looks like: `AIzaSyD...`)

3. **Secure Your API Key (Recommended)**
   - Click on your new API key to edit it
   - Under **API restrictions**:
     - Select **Restrict key**
     - Choose **Fact Check Tools API**
   - Under **Application restrictions** (optional):
     - Set IP restrictions if needed
   - Click **Save**

### Step 3: Configure KagamiMe

Add your API key to your environment file:

```bash
# In your .env file
GOOGLE_FACTCHECK_API_KEY=AIzaSyD_your_actual_api_key_here
```

### Step 4: Test Your Setup

Run the KagamiMe test script:

```bash
node test-multi-api-fact-checker.js
```

Look for:
```
🌐 Google Fact Check: ✅ Configured
```

### API Usage & Limits

- **Free Tier**: 1,000 requests per day
- **Rate Limit**: 100 requests per 100 seconds per user
- **Quota**: Can be increased in Cloud Console

### Troubleshooting

#### Common Issues:

1. **403 Forbidden Error**
   - API not enabled → Enable Fact Check Tools API
   - Key restrictions too strict → Check API restrictions

2. **400 Bad Request**
   - Invalid API key format
   - Missing required parameters

3. **429 Rate Limited**
   - Too many requests → Implement delays between calls
   - KagamiMe already includes 2-second delays

#### Test Your API Key Manually:

```bash
curl "https://factchecktools.googleapis.com/v1alpha1/claims:search?query=climate%20change&key=YOUR_API_KEY"
```

### API Response Example

Successful response:
```json
{
  "claims": [
    {
      "text": "Climate change is real",
      "claimant": "Scientific consensus",
      "claimReview": [
        {
          "publisher": {
            "name": "FactCheck.org",
            "site": "factcheck.org"
          },
          "url": "https://www.factcheck.org/...",
          "title": "Climate Change Facts",
          "reviewDate": "2024-01-15T00:00:00Z",
          "textualRating": "True",
          "languageCode": "en"
        }
      ]
    }
  ]
}
```

---

**Made with 💜 by NullMeDev**  
*The best fake-news fighter (鏡眼)*
