#!/usr/bin/env bash
# One-time server install. Run as root once on a fresh server. Idempotent;
# you can re-run it safely.
#
# After running:
#   1. Edit /etc/reduxstation/webhook.conf and replace REPLACE_WITH_LONG_RANDOM_SECRET.
#   2. Add the matching secret to the GitHub webhook (Settings -> Webhooks).
#   3. Confirm GitHub is hitting https://reduxstation.com/hooks/redeploy-website.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ResurgenceStation/website.git}"
INSTALL_DIR="${INSTALL_DIR:-/srv/reduxstation/website}"
WEB_USER="${WEB_USER:-reduxweb}"
CONF_DIR="${CONF_DIR:-/etc/reduxstation}"

echo "==> apt installing dependencies"
apt-get update -y
apt-get install -y --no-install-recommends \
  git curl ca-certificates rsync webhook

echo "==> installing Node 20 (NodeSource)"
if ! command -v node >/dev/null || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> creating service user $WEB_USER"
id -u "$WEB_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$WEB_USER"

echo "==> cloning / updating $REPO_URL -> $INSTALL_DIR"
mkdir -p "$(dirname "$INSTALL_DIR")"
if [ ! -d "$INSTALL_DIR/.git" ]; then
  git clone --branch master "$REPO_URL" "$INSTALL_DIR"
else
  git -C "$INSTALL_DIR" fetch origin
  git -C "$INSTALL_DIR" reset --hard origin/master
fi
chown -R "$WEB_USER:$WEB_USER" "$INSTALL_DIR"
chmod +x "$INSTALL_DIR/scripts/redeploy.sh"

echo "==> installing webhook config -> $CONF_DIR/webhook.conf"
mkdir -p "$CONF_DIR"
if [ ! -f "$CONF_DIR/webhook.conf" ]; then
  install -m 600 -o "$WEB_USER" -g "$WEB_USER" \
    "$INSTALL_DIR/scripts/webhook.conf.example" "$CONF_DIR/webhook.conf"
  echo "    NEW: edit $CONF_DIR/webhook.conf and set the shared secret."
else
  echo "    kept existing $CONF_DIR/webhook.conf (won't overwrite a real secret)"
fi

echo "==> installing systemd unit -> /etc/systemd/system/reduxstation-webhook.service"
install -m 644 "$INSTALL_DIR/scripts/webhook.service.example" \
  /etc/systemd/system/reduxstation-webhook.service
systemctl daemon-reload
systemctl enable --now reduxstation-webhook.service

echo "==> first build (so _site/ exists before Caddy serves it)"
sudo -u "$WEB_USER" bash -lc "cd $INSTALL_DIR && (npm ci || npm install --no-audit --no-fund) && npm run build"

echo "==> log file ready"
touch /var/log/reduxstation-redeploy.log
chown "$WEB_USER:$WEB_USER" /var/log/reduxstation-redeploy.log

cat <<EOF

============================================================
Server-side install complete.

Next steps:
  1. nano $CONF_DIR/webhook.conf  -> replace REPLACE_WITH_LONG_RANDOM_SECRET
     (use:  openssl rand -hex 32  to generate one)
  2. systemctl restart reduxstation-webhook
  3. Add the same secret to a GitHub webhook on the repo:
     - URL:          https://reduxstation.com/hooks/redeploy-website
     - Content type: application/json
     - Secret:       (the value you put in webhook.conf)
     - Events:       Just the push event
  4. Append the Caddy block from $INSTALL_DIR/Caddyfile.example to your Caddyfile
     and: systemctl reload caddy
  5. Done. Every push to master triggers redeploy automatically.

Tail the log to watch deploys:
  tail -F /var/log/reduxstation-redeploy.log
============================================================
EOF
