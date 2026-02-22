import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import instagramGetUrl from "instagram-url-direct";
import * as cheerio from "cheerio";
import axios from "axios";

// --- Helper Functions (Reused) ---

async function scrapeInstagramFallback(url: string): Promise<string | null> {
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };

    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    const ogVideo = $('meta[property="og:video"]').attr('content');
    if (ogVideo) return ogVideo;

    const twitterStream = $('meta[name="twitter:player:stream"]').attr('content');
    if (twitterStream) return twitterStream;
    
    const videoSrc = $('video').attr('src');
    if (videoSrc) return videoSrc;

    return null;
  } catch (error) {
    console.error("Fallback scrape failed:", error);
    return null;
  }
}

async function getReelUrl(url: string): Promise<string | null> {
    let videoUrl: string | null = null;

    // Method 1: Try instagram-url-direct
    try {
      // @ts-ignore
      const result = await instagramGetUrl(url);
      if (result && result.url_list && result.url_list.length > 0) {
        videoUrl = result.url_list[0];
      }
    } catch (e) {
      console.warn("Method 1 failed:", e);
    }

    // Method 2: Fallback to direct scraping
    if (!videoUrl) {
      videoUrl = await scrapeInstagramFallback(url);
    }

    // Method 3: Regex scraping
    if (!videoUrl) {
      try {
        const headers = {
          "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        };
        const response = await axios.get(url, { headers });
        const html = response.data;
        
        const match1 = html.match(/"video_url":"([^"]+)"/);
        if (match1 && match1[1]) {
           videoUrl = JSON.parse(`"${match1[1]}"`);
        }
        
        if (!videoUrl) {
           const match2 = html.match(/<meta property="og:video" content="([^"]+)"/);
           if (match2 && match2[1]) {
             videoUrl = match2[1].replace(/&amp;/g, "&");
           }
        }
      } catch (e) {
        console.warn("Method 3 failed", e);
      }
    }
    
    return videoUrl;
}

// --- MCP Server Setup ---

export const createMcpServer = (appUrl: string) => {
  const server = new McpServer({ 
    name: "instagram-downloader", 
    version: "1.0.0" 
  });

  // Register UI Resource
  // We'll serve the built React app as the widget
  // Note: In production, we assume 'dist/index.html' exists.
  // In dev, we might need to point to the Vite dev server or handle differently.
  // For simplicity, we'll assume the build artifacts are available or we serve a simple wrapper.
  
  const widgetHtmlPath = path.join(process.cwd(), 'dist', 'index.html');
  let widgetHtml = "";
  
  try {
    if (fs.existsSync(widgetHtmlPath)) {
      widgetHtml = fs.readFileSync(widgetHtmlPath, 'utf-8');
      // Replace relative paths with absolute URLs to the Vercel deployment
      // This is crucial for the widget to load assets in the ChatGPT sandbox
      widgetHtml = widgetHtml.replace(/(src|href)="\//g, `$1="${appUrl}/`);
    } else {
      // Fallback for dev/unbuilt state
      widgetHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>InstaReel Widget</title>
            <style>body { font-family: sans-serif; padding: 20px; text-align: center; color: #333; }</style>
          </head>
          <body>
            <h2>Widget Not Available</h2>
            <p>Please build the frontend application to see the widget.</p>
          </body>
        </html>
      `;
    }
  } catch (e) {
    console.error("Failed to read widget HTML:", e);
  }

  registerAppResource(
    server,
    "instareel-widget",
    "ui://widget/reel.html",
    {},
    async () => ({
      contents: [
        {
          uri: "ui://widget/reel.html",
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: {
              prefersBorder: true,
              domain: appUrl, // Use the app URL as the domain
              csp: {
                connectDomains: [appUrl],
                resourceDomains: [appUrl, "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
              },
            },
          },
        },
      ],
    })
  );

  // Register Tool
  registerAppTool(
    server,
    "download_reel",
    {
      title: "Download Instagram Reel",
      description: "Download an Instagram Reel from a URL",
      inputSchema: { 
        url: z.string().describe("The URL of the Instagram Reel") 
      },
      _meta: {
        ui: { resourceUri: "ui://widget/reel.html" },
      },
    },
    async ({ url }) => {
      const videoUrl = await getReelUrl(url);

      if (!videoUrl) {
        return {
          content: [{ type: "text", text: "Could not find video URL. The post might be private or deleted." }],
          isError: true,
        };
      }

      return {
        structuredContent: { 
          videoUrl,
          originalUrl: url
        },
        content: [{ type: "text", text: `Found video URL for ${url}` }],
        _meta: {
          videoUrl,
        },
      };
    }
  );

  return server;
};

// --- Express Adapter ---

// Map to store active transports
const transports = new Map<string, SSEServerTransport>();

export const handleSse = async (req: Request, res: Response) => {
  const appUrl = `${req.protocol}://${req.get('host')}`;
  const server = createMcpServer(appUrl);
  
  const transport = new SSEServerTransport("/mcp/messages", res);
  const sessionId = transport.sessionId;
  
  transports.set(sessionId, transport);
  
  // Clean up on close
  req.on("close", () => {
    transports.delete(sessionId);
  });

  await server.connect(transport);
};

export const handleMessages = async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).send("Session not found");
    return;
  }

  await transport.handlePostMessage(req, res);
};
