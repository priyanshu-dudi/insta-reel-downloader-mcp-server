# Setting up InstaReel Downloader as an MCP Server

This application exposes a Model Context Protocol (MCP) server that allows AI agents (like Claude Desktop) to download Instagram Reels.

## Prerequisites

- **Node.js** installed on your machine.
- **Claude Desktop** app installed.
- The URL of your deployed application (e.g., `https://your-app.vercel.app`).

## Configuration for Claude Desktop

1.  Open your Claude Desktop configuration file:
    -   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
    -   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2.  Add the following configuration to the `mcpServers` object:

    ```json
    {
      "mcpServers": {
        "instagram-downloader": {
          "command": "npx",
          "args": [
            "-y",
            "@modelcontextprotocol/server-sse",
            "--url",
            "https://your-app.vercel.app/sse"
          ]
        }
      }
    }
    ```

    > **Note**: Replace `https://your-app.vercel.app` with your actual deployed URL.

3.  Restart Claude Desktop.

## Using with Cursor (Advanced)

As of early 2024, Cursor's MCP support is evolving. You typically need to run a local proxy that connects to the remote SSE endpoint if Cursor only supports local stdio servers.

However, the configuration above uses `npx @modelcontextprotocol/server-sse` which acts as a local bridge (stdio) that connects to the remote SSE endpoint. This means **it should work in any MCP client that supports stdio servers**, including Cursor.

To add to Cursor:
1.  Go to **Cursor Settings** -> **Features** -> **MCP**.
2.  Add a new "Stdio" server.
3.  **Command**: `npx`
4.  **Args**: `-y @modelcontextprotocol/server-sse --url https://your-app.vercel.app/sse`

## Troubleshooting

-   **"Connection failed"**: Ensure your Vercel deployment is active and the `/sse` endpoint is accessible.
-   **"Tool not found"**: Check the logs in your MCP client.
