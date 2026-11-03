import { createApp } from "../app.js";

// Vercel serverless entry point. vercel.json rewrites every request here, and
// includes static/ in the bundle so express.static can serve the assets.
//
// Limitation: a serverless function cannot hold WebSocket upgrades, so proxied
// sites that need WebSockets (games, video streaming) will not work on Vercel.
// For those, run index.js on Render/Docker instead.
const { app, bare } = createApp();

export default function handler(req, res) {
    try {
        if (bare.shouldRoute(req)) return bare.routeRequest(req, res);
    } catch (error) {
        console.error("bare routing failed:", error);
    }

    app(req, res);
}
