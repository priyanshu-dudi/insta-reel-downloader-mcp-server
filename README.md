# InstaReel Downloader & MCP Server

A full-stack application that serves as both a user-friendly web interface and an MCP (Model Context Protocol) server for downloading Instagram Reels.

## Features

- **Web Interface**: Paste an Instagram Reel URL to download the video.
- **MCP Server**: Exposes a `download_reel` tool via SSE and JSON-RPC.
- **Robust Scraping**: Uses multiple fallback methods (API, Cheerio, Regex) to ensure high success rates.

## Deployment on Vercel

This project is configured for easy deployment on Vercel.

### Prerequisites

- A GitHub account
- A Vercel account

### Steps

1.  **Push to GitHub**:
    - Create a new repository on GitHub.
    - Push this code to the repository.

2.  **Deploy to Vercel**:
    - Go to [Vercel Dashboard](https://vercel.com/dashboard).
    - Click **"Add New..."** -> **"Project"**.
    - Import your GitHub repository.
    - **Framework Preset**: Vercel should automatically detect "Vite". If not, select "Vite".
    - **Root Directory**: `./` (default).
    - **Build Command**: `npm run build` (default).
    - **Output Directory**: `dist` (default).
    - Click **"Deploy"**.

### Vercel Configuration Details

- The `api/index.ts` file serves as the entry point for Vercel Serverless Functions.
- The `vercel.json` file routes API requests (`/api/*`, `/sse`, `/mcp/*`) to this function.
- The frontend is built as a static site and served by Vercel's CDN.

## Updating Your Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for instructions on how to push updates to Vercel.

## API Usage

See [API_USAGE.md](./API_USAGE.md) for documentation on how to use the REST API to download reels programmatically.

### Quick cURL Example

```bash
curl -X POST https://your-app-name.vercel.app/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/..."}'
```

## MCP Server Usage

Once deployed, you can use the MCP server with any MCP client (like Claude Desktop or other AI agents).

- **SSE Endpoint**: `https://your-app-name.vercel.app/sse`
- **Messages Endpoint**: `https://your-app-name.vercel.app/mcp/messages`

### Tool Definition

```json
{
  "name": "download_reel",
  "description": "Download an Instagram Reel from a URL",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "The URL of the Instagram Reel"
      }
    },
    "required": ["url"]
  }
}
```
