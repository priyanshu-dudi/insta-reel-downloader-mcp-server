# API Usage Guide

The InstaReel Downloader provides a simple REST API to extract video URLs from Instagram Reels.

## Endpoint

`POST /api/download`

## Request Format

**Content-Type:** `application/json`

```json
{
  "url": "https://www.instagram.com/reel/C-..."
}
```

## Response Format

**Success (200 OK):**

```json
{
  "videoUrl": "https://instagram.fsin...",
  "originalUrl": "https://www.instagram.com/reel/C-..."
}
```

**Error (400/404/500):**

```json
{
  "error": "Error message",
  "details": "Detailed explanation"
}
```

## Examples

### cURL

```bash
curl -X POST https://your-app.vercel.app/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/C-example"}'
```

### JavaScript (Fetch)

```javascript
const response = await fetch('https://your-app.vercel.app/api/download', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://www.instagram.com/reel/C-example'
  }),
});

const data = await response.json();
if (data.videoUrl) {
  console.log('Video URL:', data.videoUrl);
} else {
  console.error('Error:', data.error);
}
```

### Python (Requests)

```python
import requests

url = "https://your-app.vercel.app/api/download"
payload = {"url": "https://www.instagram.com/reel/C-example"}

response = requests.post(url, json=payload)
data = response.json()

if response.status_code == 200:
    print(f"Video URL: {data['videoUrl']}")
else:
    print(f"Error: {data.get('error')}")
```

## OpenAPI Specification

You can access the full OpenAPI specification at:
`https://your-app.vercel.app/openapi.json`

This URL can be imported directly into tools like Postman or used to create Custom GPT Actions in OpenAI.
