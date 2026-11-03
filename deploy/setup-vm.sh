#!/usr/bin/env bash
# Install Equinox on a bare Ubuntu/Debian VM, behind Caddy for HTTPS.
#
#   sudo DOMAIN=proxy.example.com bash deploy/setup-vm.sh
#
# HTTPS is not optional here: browsers only expose service workers on secure
# origins, and the proxy cannot work without one.
set -euo pipefail

DOMAIN="${DOMAIN:-}"
REPO="${REPO:-https://github.com/cyed4123/Equinoxe.git}"
APP_DIR="${APP_DIR:-/opt/equinox}"
SERVICE_USER="${SERVICE_USER:-equinox}"
NODE_MAJOR=24

if [ "$(id -u)" -ne 0 ]; then
    echo "Run as root: sudo DOMAIN=proxy.example.com bash deploy/setup-vm.sh" >&2
    exit 1
fi

if [ -z "$DOMAIN" ]; then
    echo "Set DOMAIN to a hostname whose DNS already points at this VM." >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl gnupg git

if ! command -v node >/dev/null 2>&1 || [ "$(node -p "process.versions.node.split('.')[0]")" -lt "$NODE_MAJOR" ]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y --no-install-recommends nodejs
fi
echo "node: $(node --version)"

if ! command -v caddy >/dev/null 2>&1; then
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
        | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
        > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y --no-install-recommends caddy
fi

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
    useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch --depth=1 origin main
    git -C "$APP_DIR" reset --hard origin/main
else
    git clone --depth=1 "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
npm ci --omit=dev
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"

NODE_BIN="$(command -v node)"
sed "s#^ExecStart=.*#ExecStart=$NODE_BIN $APP_DIR/server.js#" deploy/equinox.service \
    > /tmp/equinox.service
install -m 644 /tmp/equinox.service /etc/systemd/system/equinox.service
systemctl daemon-reload
systemctl enable --now equinox

cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:3000
}
CADDY
systemctl reload caddy 2>/dev/null || systemctl restart caddy

sleep 2
curl -fsS "http://127.0.0.1:3000/healthz" >/dev/null && echo "app healthy on 127.0.0.1:3000"
echo "Equinox is up at https://$DOMAIN (certificate issued on first request)"
