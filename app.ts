import express from "express";
import cors from "cors";
import { z } from "zod";
// @ts-ignore
import instagramGetUrl from "instagram-url-direct";
import * as cheerio from "cheerio";
import axios from "axios";
import { handleSse, handleMessages } from "./src/mcp";
import { openApiSpec } from "./src/openapi";

const app = express();

app.use(cors());
app.use(express.json());

// --- OpenAPI Route ---
app.get("/openapi.json", (req, res) => {
  const host = req.get("host");
  // Default to https on Vercel/Production
  const protocol = host?.includes("localhost") ? "http" : "https";
  const url = `${protocol}://${host}`;
  
  const spec = { 
    ...openApiSpec, 
    servers: [{ url }] 
  };
  res.json(spec);
});

// --- Helper Functions (Keep for API endpoint) ---
// ... (Keep existing helpers if needed for the REST API, or import from mcp.ts if refactored)
// For simplicity, I'll keep the REST API logic here as it was, but the MCP logic is now in src/mcp.ts

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

// --- API Routes ---

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

    try {
      // @ts-ignore
      const result = await instagramGetUrl(url);
      if (result && result.url_list && result.url_list.length > 0) {
        videoUrl = result.url_list[0];
      }
    } catch (e) {
      console.warn("Method 1 failed:", e);
    }

    if (!videoUrl) {
      videoUrl = await scrapeInstagramFallback(url);
    }

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

    if (!videoUrl) {
      return res.status(404).json({ 
        error: "Could not find video URL", 
        details: "The post might be private, deleted, or Instagram is blocking the request." 
      });
    }

    res.json({ 
      videoUrl: videoUrl,
      originalUrl: url
    });

  } catch (error: any) {
    console.error("Error downloading reel:", error);
    res.status(500).json({ error: "Failed to process request", details: error.message });
  }
});

// --- MCP Server Routes (Using SDK) ---

app.get("/sse", handleSse);
app.post("/mcp/messages", handleMessages);

export default app;
