# Running Equinox on a VM

Equinox needs a long-lived Node process: the bare server handles WebSocket
`upgrade` events (`routeUpgrade`) that a serverless platform cannot hold. A VM
(or any container host) also gives the app a stable HTTPS origin, which browsers
require before they will expose service workers — and the proxy cannot work
without a service worker.

## Docker Compose (recommended)

```bash
echo "DOMAIN=proxy.example.com" > .env     # DNS A record must point at this VM
docker compose up -d --build
```

Caddy obtains a Let's Encrypt certificate for `DOMAIN`, proxies WebSocket
upgrades, and forwards HTTP/HTTPS to the app container on port 3000.
Health checks are wired to `/healthz`.

Update later with `git pull && docker compose up -d --build`.

## Bare VM (systemd + Caddy)

```bash
sudo DOMAIN=proxy.example.com bash deploy/setup-vm.sh
```

That installs Node 24 and Caddy, clones the repo into `/opt/equinox`, runs
`npm ci --omit=dev`, installs `deploy/equinox.service`, and starts it. Re-running
the script pulls `main` and restarts the service.

Useful afterwards:

```bash
systemctl status equinox
journalctl -u equinox -f
curl -s https://$DOMAIN/healthz      # should print: ok
```

## Notes

- The app listens on `PORT` (default 3000) and `HOST` (default 0.0.0.0).
- Proxied sessions are cookie/jar based; no database or persistent storage is
  required, so a fresh VM with 1 GB RAM is enough for personal use.
- Vercel is not a fit for this app: serverless functions cannot hold WebSocket
  upgrades, and Vercel's Acceptable Use Policy prohibits proxying.
