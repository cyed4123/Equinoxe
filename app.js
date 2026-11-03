import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import useragent from "express-useragent";
import cookieParser from "cookie-parser";

// Resolve paths from this file rather than the shell's cwd, so the app behaves
// the same under `npm start`, Docker and a serverless function.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, "static");

const routes = [
    { path: "/", file: "/static/home.html" },
    { path: "/v", file: "/static/home.html" },
    { path: "/s", file: "/static/search.html" },
    { path: "/ut", file: "/static/utils.html" },
    { path: "/op", file: "/static/settings.html" },
    { path: "/tos", file: "/static/tos.html" },
    { path: "/creds", file: "/static/credits.html" }
];

// Builds the Express app and the bare server. Shared by index.js (long-running
// server) and api/index.js (Vercel function) so both serve identical routes.
export function createApp() {
    const bare = createBareServer("/bare/");
    const app = express();

    app.disable("x-powered-by");
    app.use(useragent.express());
    app.use(cookieParser());
    app.use(express.urlencoded({ extended: true }));

    app.use((req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "same-origin");
        next();
    });

    app.get("/healthz", (_req, res) => res.type("text/plain").send("ok"));

    app.use(
        express.static(staticDir, {
            setHeaders(res, filePath) {
                // Fingerprint-free assets get a short cache; HTML must stay fresh.
                const cacheable = /\.(css|js|png|jpe?g|webp|gif|ico|svg|woff2?|ttf)$/i.test(filePath);
                res.setHeader("Cache-Control", cacheable ? "public, max-age=3600" : "no-cache");
            },
        })
    );

    routes.forEach(route => {
        app.get(route.path, (req, res) => {
            if (req.useragent?.isMobile && !req.useragent.isTablet) {
                return res.sendFile(path.join(staticDir, "mobile/not-supported.html"));
            }

            res.sendFile(path.join(__dirname, route.file));
        });
    });

    // Proxied URLs are normally answered by the service worker. On a hard refresh
    // or in a private window the worker is not active yet, so the request reaches
    // the server: bootstrap the worker from here instead of returning a 404.
    app.get(["/edu", "/edu/*"], (_req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.sendFile(path.join(staticDir, "edu-boot.html"));
    });

    app.use((_req, res) => res.status(404).sendFile(path.join(staticDir, "404.html")));

    return { app, bare };
}
