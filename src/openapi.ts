export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "InstaReel Downloader API",
    description: "API for downloading Instagram Reels",
    version: "1.0.0"
  },
  servers: [
    {
      url: "https://your-app-url.vercel.app"
    }
  ],
  paths: {
    "/api/download": {
      post: {
        operationId: "downloadReel",
        summary: "Download an Instagram Reel",
        description: "Extracts the video URL from an Instagram Reel link",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  url: {
                    type: "string",
                    description: "The URL of the Instagram Reel (e.g. https://www.instagram.com/reel/...)"
                  }
                },
                required: ["url"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Successful download",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    videoUrl: {
                      type: "string",
                      description: "The direct URL to the video file"
                    },
                    originalUrl: {
                      type: "string",
                      description: "The original Instagram URL"
                    }
                  }
                }
              }
            }
          },
          "400": {
            description: "Invalid URL"
          },
          "404": {
            description: "Video not found"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    }
  }
};
