import express from "express";
import cors from "cors";
// @ts-ignore
import instagramGetUrl from "instagram-url-direct";
import { z } from "zod";
import * as cheerio from "cheerio";
import axios from "axios";

const app = express();

app.use(cors());
app.use(express.json());

// --- Helper Functions ---

async function scrapeInstagramFallback(url: string): Promise<string | null> {
  try {
    // Use a common user agent to avoid immediate blocking
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };

    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    // Try to find og:video
    const ogVideo = $('meta[property="og:video"]').attr('content');
    if (ogVideo) return ogVideo;

    // Try to find twitter:player:stream
    const twitterStream = $('meta[name="twitter:player:stream"]').attr('content');
    if (twitterStream) return twitterStream;
    
    // Try to find video tag src directly (unlikely in SSR but possible)
    const videoSrc = $('video').attr('src');
    if (videoSrc) return videoSrc;

    return null;
  } catch (error) {
    console.error("Fallback scrape failed:", error);
    return null;
  }
}

// --- API Routes ---

// Schema for validation
const DownloadSchema = z.object({
  url: z.string().url().refine((val) => val.includes("instagram.com"), {
    message: "Must be a valid Instagram URL",
  }),
});

app.post("/api/download", async (req, res) => {
  try {
    const parseResult = DownloadSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid URL", 
        // @ts-ignore
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { url } = parseResult.data;
    console.log(`Fetching reel for URL: ${url}`);

    let videoUrl: string | null = null;

    // Method 1: Try instagram-url-direct
    try {
      console.log("Attempting Method 1: instagram-url-direct");
      // @ts-ignore
      const result = await instagramGetUrl(url);
      if (result && result.url_list && result.url_list.length > 0) {
        videoUrl = result.url_list[0];
        console.log("Method 1 success");
      }
    } catch (e) {
      console.warn("Method 1 failed:", e);
    }

    // Method 2: Fallback to direct scraping if Method 1 failed
    if (!videoUrl) {
      console.log("Attempting Method 2: Direct scraping fallback");
      videoUrl = await scrapeInstagramFallback(url);
      if (videoUrl) console.log("Method 2 success");
    }

    // Method 3: Regex scraping for JSON data
    if (!videoUrl) {
      console.log("Attempting Method 3: Regex scraping with Crawler UA");
      try {
        // Use Facebook External Hit UA which is often whitelisted for OG tags
        const headers = {
          "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        };
        const response = await axios.get(url, { headers });
        const html = response.data;
        
        // Check if we got a login page
        if (html.includes("accounts/login") && !html.includes("og:video")) {
            console.warn("Method 3: Redirected to login page");
        }

        // Pattern 1: "video_url":"..."
        const match1 = html.match(/"video_url":"([^"]+)"/);
        if (match1 && match1[1]) {
           videoUrl = JSON.parse(`"${match1[1]}"`);
        }
        
        // Pattern 2: meta property="og:video" (handled by cheerio but good to double check raw)
        if (!videoUrl) {
           const match2 = html.match(/<meta property="og:video" content="([^"]+)"/);
           if (match2 && match2[1]) {
             videoUrl = match2[1].replace(/&amp;/g, "&");
           }
        }
        
        // Pattern 3: Look for video_versions in shared data
        if (!videoUrl) {
            const match3 = html.match(/"video_versions":\s*\[(.*?)\]/);
            if (match3 && match3[1]) {
                try {
                    // This is a bit risky as it might not be valid JSON without the brackets, 
                    // but usually the first item is enough.
                    const versions = JSON.parse(`[${match3[1]}]`);
                    // Sort by width/height to get best quality
                    const best = versions.sort((a: any, b: any) => (b.width * b.height) - (a.width * a.height))[0];
                    if (best && best.url) {
                        videoUrl = best.url;
                    }
                } catch (e) {
                    console.warn("Failed to parse video_versions", e);
                }
            }
        }

        if (videoUrl) console.log("Method 3 success");
      } catch (e) {
        console.warn("Method 3 failed", e);
      }
    }

    if (!videoUrl) {
      return res.status(404).json({ 
        error: "Could not find video URL", 
        details: "The post might be private, deleted, or Instagram is blocking the request. Please try again later or check the URL." 
      });
    }

    // Return the URL
    res.json({ 
      videoUrl: videoUrl,
      originalUrl: url
    });

  } catch (error: any) {
    console.error("Error downloading reel:", error);
    res.status(500).json({ error: "Failed to process request", details: error.message });
  }
});

// --- MCP Server Implementation (SSE) ---

app.get("/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    res.end();
  });
});

app.post("/mcp/messages", async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== "2.0") {
    return res.status(400).json({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id });
  }

  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      result: {
        tools: [
          {
            name: "download_reel",
            description: "Download an Instagram Reel from a URL",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "The URL of the Instagram Reel"
                }
              },
              required: ["url"]
            }
          }
        ]
      },
      id
    });
  }

  if (method === "tools/call") {
    if (params.name === "download_reel") {
      try {
        const { url } = params.arguments;
        
        // Reuse logic (simplified for MCP)
        let videoUrl: string | null = null;
        
        try {
          // @ts-ignore
          const result = await instagramGetUrl(url);
          if (result && result.url_list && result.url_list.length > 0) {
            videoUrl = result.url_list[0];
          }
        } catch (e) {
          console.warn("MCP Method 1 failed", e);
        }

        if (!videoUrl) {
          videoUrl = await scrapeInstagramFallback(url);
        }

        // Method 3: Regex scraping for MCP
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
            console.warn("MCP Method 3 failed", e);
          }
        }
        
        if (!videoUrl) {
           return res.json({
            jsonrpc: "2.0",
            result: {
              content: [{ type: "text", text: "Error: Could not find video URL. Post might be private." }],
              isError: true
            },
            id
          });
        }

        return res.json({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: `Video URL: ${videoUrl}` }]
          },
          id
        });

      } catch (error: any) {
        return res.json({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          },
          id
        });
      }
    }
  }

  res.json({ jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id });
});

export default app;
