/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Loader2, Link as LinkIcon, AlertCircle, CheckCircle2, Terminal, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { downloadReel } from './services/api';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [configFormat, setConfigFormat] = useState<'json' | 'yaml' | 'openapi' | 'curl'>('json');

  const copyConfig = () => {
    const origin = window.location.origin;
    let config = '';

    if (configFormat === 'json') {
      config = `{
  "mcpServers": {
    "instagram-downloader": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sse",
        "--url",
        "${origin}/sse"
      ],
      "description": "Download Instagram Reels",
      "timeout": 300,
      "alwaysAllow": []
    }
  }
}`;
    } else if (configFormat === 'yaml') {
      config = `name: Instagram Downloader
version: 0.0.1
mcpServers:
  - name: instagram-downloader
    command: npx
    args:
      - -y
      - @modelcontextprotocol/server-sse
      - --url
      - ${origin}/sse
    description: Download Instagram Reels
    timeout: 300
    alwaysAllow: []`;
    } else if (configFormat === 'openapi') {
      config = `${origin}/openapi.json`;
    } else {
      config = `curl -X POST ${origin}/api/download \\
  -H "Content-Type: application/json" \\
  -d '{"url": "${url || 'https://www.instagram.com/reel/...'}"}'`;
    }

    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const result = await downloadReel(url);
      setVideoUrl(result.videoUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to download reel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/10 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 mb-4 shadow-lg shadow-purple-900/50">
            <Download className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
            InstaReel Saver
          </h1>
          <p className="text-slate-300 mt-2 text-sm">
            Paste an Instagram Reel link to download
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-5 w-5 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl leading-5 bg-slate-800/50 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-pink-900/30 text-sm font-medium text-white bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Processing...
              </>
            ) : (
              'Download Reel'
            )}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex flex-col items-start space-y-2"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
              <div className="pl-8 text-xs text-red-300/70 list-disc">
                <p>Troubleshooting tips:</p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li>Ensure the account is <strong>public</strong>. Private reels cannot be downloaded.</li>
                  <li>Check if the link is valid and opens in a browser.</li>
                  <li>Instagram might be temporarily blocking requests. Try again in a few minutes.</li>
                </ul>
              </div>
            </motion.div>
          )}

          {videoUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-6 space-y-4"
            >
              <div className="aspect-[9/16] w-full bg-black rounded-xl overflow-hidden shadow-lg border border-white/10 relative group">
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full h-full object-contain"
                  poster="https://picsum.photos/seed/reel/400/600" // Fallback poster
                />
              </div>
              
              <a
                href={videoUrl}
                download="reel.mp4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-900/20"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Save Video
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <button 
            onClick={() => setShowMcpModal(true)}
            className="inline-flex items-center text-xs text-slate-400 hover:text-pink-400 transition-colors"
          >
            <Terminal className="w-3 h-3 mr-1.5" />
            Connect to AI Agent (MCP)
          </button>
        </div>
      </motion.div>

      {/* MCP Modal */}
      <AnimatePresence>
        {showMcpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMcpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Terminal className="w-5 h-5 mr-2 text-pink-500" />
                  Add to AI Agent
                </h3>
                <button 
                  onClick={() => setShowMcpModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex space-x-4 mb-4 border-b border-white/10 overflow-x-auto">
                <button
                  onClick={() => setConfigFormat('json')}
                  className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${configFormat === 'json' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Claude (JSON)
                </button>
                <button
                  onClick={() => setConfigFormat('yaml')}
                  className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${configFormat === 'yaml' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  YAML
                </button>
                <button
                  onClick={() => setConfigFormat('openapi')}
                  className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${configFormat === 'openapi' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  OpenAI Action
                </button>
                <button
                  onClick={() => setConfigFormat('curl')}
                  className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${configFormat === 'curl' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  cURL
                </button>
              </div>
              
              <p className="text-slate-300 text-sm mb-4">
                {configFormat === 'json' 
                  ? 'Add this to your claude_desktop_config.json:' 
                  : configFormat === 'yaml' 
                    ? 'Use this configuration for YAML-based MCP clients:'
                    : configFormat === 'openapi'
                      ? 'Import this URL into your Custom GPT Action:'
                      : 'Run this command in your terminal:'}
              </p>

              <div className="relative bg-slate-950 rounded-lg p-4 border border-slate-800 mb-4 font-mono text-xs text-slate-300 overflow-x-auto">
                <button 
                  onClick={copyConfig}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
                <pre>{configFormat === 'json' ? `{
  "mcpServers": {
    "instagram-downloader": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sse",
        "--url",
        "${typeof window !== 'undefined' ? window.location.origin : 'YOUR_APP_URL'}/sse"
      ],
      "description": "Download Instagram Reels",
      "timeout": 300,
      "alwaysAllow": []
    }
  }
}` : configFormat === 'yaml' ? `name: Instagram Downloader
version: 0.0.1
mcpServers:
  - name: instagram-downloader
    command: npx
    args:
      - -y
      - @modelcontextprotocol/server-sse
      - --url
      - ${typeof window !== 'undefined' ? window.location.origin : 'YOUR_APP_URL'}/sse
    description: Download Instagram Reels
    timeout: 300
    alwaysAllow: []` : configFormat === 'openapi' ? `${typeof window !== 'undefined' ? window.location.origin : 'YOUR_APP_URL'}/openapi.json` : `curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'YOUR_APP_URL'}/api/download \\
  -H "Content-Type: application/json" \\
  -d '{"url": "${url || 'https://www.instagram.com/reel/...'}"}'`}</pre>
              </div>

              <div className="text-xs text-slate-500 space-y-2">
                {configFormat === 'json' || configFormat === 'yaml' ? (
                  <p>
                    <strong>Note:</strong> This configuration uses the <code className="text-slate-400">@modelcontextprotocol/server-sse</code> adapter 
                    to connect to this server's SSE endpoint.
                  </p>
                ) : configFormat === 'openapi' ? (
                  <p>
                    <strong>Note:</strong> Use this URL to import the API definition when creating a Custom GPT in OpenAI.
                  </p>
                ) : (
                  <p>
                    <strong>Note:</strong> Replace the URL in the JSON body with the actual Instagram Reel URL you want to download.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

