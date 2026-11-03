import { createApp } from "../app.js";

// Vercel serverless entry point. vercel.json rewrites every request here, and
// includes static/ in the bundle so express.static can serve the assets.
//
// Limitation: a serverless function cannot hold WebSocket upgrades, so proxied
// sites that need WebSockets (games, video streaming) will not work on Vercel.
// For those, run index.js on Render/Docker instead.
const { app, bare } = createApp();

// Depending on how the platform dispatches the rewrite, the function sees either
// the original path ("/assets/js/main.js") or the rewrite destination
// ("/api/index"). Normalize so Express always routes on the real path.
const REWRITE_PREFIX = "/api/index";

function normalizeUrl(url) {
    if (typeof url !== "string") return "/";
    if (url === REWRITE_PREFIX) return "/";
    if (url.startsWith(REWRITE_PREFIX + "?")) return "/" + url.slice(REWRITE_PREFIX.length);
    return url;
}

export default function handler(req, res) {
    req.url = normalizeUrl(req.url);

    try {
        if (bare.shouldRoute(req)) return bare.routeRequest(req, res);
    } catch (error) {
        console.error("bare routing failed:", error);
    }

    app(req, res);
}
