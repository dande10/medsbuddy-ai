#!/usr/bin/env bash
set -euo pipefail

APP_NAME="medsbuddy-backend"
APP_USER="medsbuddy"
APP_DIR="/opt/${APP_NAME}"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
NGINX_LINK="/etc/nginx/sites-enabled/${APP_NAME}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
SERVER_NAME="${SERVER_NAME:-_}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run with sudo: sudo bash deploy.sh"
  exit 1
fi

apt-get update
apt-get install -y python3 python3-venv python3-pip nginx curl

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
fi

mkdir -p "${APP_DIR}"
cp -a "$(dirname "$0")/." "${APP_DIR}/"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

python3 -m venv "${APP_DIR}/.venv"
"${APP_DIR}/.venv/bin/pip" install --upgrade pip
"${APP_DIR}/.venv/bin/pip" install -r "${APP_DIR}/requirements.txt"

if [[ ! -f "${APP_DIR}/.env" ]]; then
  cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
  echo "Created ${APP_DIR}/.env. Edit it with your real API keys before production use."
fi

cat > "${SERVICE_FILE}" <<SERVICE
[Unit]
Description=MedsBuddy FastAPI Backend
After=network.target

[Service]
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/.venv/bin/uvicorn main:app --host 0.0.0.0 --port ${BACKEND_PORT}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat > "${NGINX_SITE}" <<NGINX
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf "${NGINX_SITE}" "${NGINX_LINK}"
rm -f /etc/nginx/sites-enabled/default
nginx -t

systemctl daemon-reload
systemctl enable "${APP_NAME}"
systemctl restart "${APP_NAME}"
systemctl enable nginx
systemctl restart nginx

echo "MedsBuddy backend deployed."
echo "Direct health: http://YOUR_ECS_PUBLIC_IP:${BACKEND_PORT}/health"
echo "Direct Swagger: http://YOUR_ECS_PUBLIC_IP:${BACKEND_PORT}/docs"
echo "Nginx health: http://YOUR_ECS_PUBLIC_IP/health"
echo "Qwen proof: http://YOUR_ECS_PUBLIC_IP:${BACKEND_PORT}/api/qwen-proof"
