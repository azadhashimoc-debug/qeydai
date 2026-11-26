#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-panelim.az}"
EMAIL="${CERTBOT_EMAIL:?Set CERTBOT_EMAIL (e.g. CERTBOT_EMAIL=admin@panelim.az)}"

sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx

sudo cp deploy/nginx/panelim.az.conf /etc/nginx/sites-available/panelim.az.conf
sudo ln -sf /etc/nginx/sites-available/panelim.az.conf /etc/nginx/sites-enabled/panelim.az.conf
sudo rm -f /etc/nginx/sites-enabled/default

sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable certbot.timer

echo "HTTPS active for https://${DOMAIN}"
