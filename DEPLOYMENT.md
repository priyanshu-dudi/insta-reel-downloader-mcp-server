# Updating Your Deployment on Vercel

Since your project is already configured for Vercel, updating it is straightforward. You have two main options:

## Option 1: Automatic Updates (Recommended)

If you have connected your Vercel project to a GitHub repository:

1.  **Commit your changes**:
    ```bash
    git add .
    git commit -m "Update MCP server to v1.0.1"
    ```

2.  **Push to GitHub**:
    ```bash
    git push origin main
    ```

3.  **Wait for Deployment**:
    - Vercel will automatically detect the new commit.
    - It will run your build command (`npm run build`).
    - It will deploy the new version.
    - You can monitor the progress in your Vercel Dashboard.

## Option 2: Manual Updates (Vercel CLI)

If you haven't connected to GitHub or want to deploy manually from your local machine:

1.  **Install Vercel CLI** (if you haven't already):
    ```bash
    npm install -g vercel
    ```

2.  **Deploy to Production**:
    Run the following command in your project root:
    ```bash
    vercel --prod
    ```

    - Vercel will build your project locally or in the cloud (depending on settings) and deploy it.
    - The URL will remain the same.

## Verifying the Update

1.  Visit your app URL (e.g., `https://your-app.vercel.app`).
2.  Check the `/sse` endpoint to ensure it's active.
3.  If you updated the MCP configuration (e.g., changed the tool description), you may need to **restart your MCP client** (Claude Desktop, Cursor, etc.) to pick up the changes.
