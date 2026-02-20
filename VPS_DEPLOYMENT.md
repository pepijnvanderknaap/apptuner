# AppTuner VPS Deployment Guide

Complete guide to deploy AppTuner relay server and dashboard on your VPS.

## Prerequisites

- VPS with Ubuntu/Debian (or similar)
- Node.js 18+ installed
- Domain pointed to your VPS IP
- Root or sudo access

## Overview

You'll deploy:
- **Relay Server**: WebSocket server at `relay.apptuner.io` (or `ws.apptuner.io`)
- **Dashboard**: Static files at `apptuner.io`

## Step 1: Prepare Your VPS

SSH into your VPS:
```bash
ssh user@your-vps-ip
```

Install required packages:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Caddy (web server with automatic HTTPS)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

## Step 2: Deploy Relay Server

Create deployment directory:
```bash
mkdir -p ~/apptuner/relay
cd ~/apptuner/relay
```

Upload `relay-server.js` to your VPS:
```bash
# On your local machine:
scp relay-server.js user@your-vps-ip:~/apptuner/relay/

# Also upload package.json (just the dependencies needed)
```

Or clone from git:
```bash
# If you've pushed to GitHub:
cd ~/apptuner
git clone https://github.com/pepijnvanderknaap/apptuner.git
cd apptuner
npm install --production
```

Start relay server with PM2:
```bash
cd ~/apptuner
pm2 start relay-server.js --name apptuner-relay
pm2 save
pm2 startup  # Follow the instructions to enable startup on boot
```

Test it's running:
```bash
pm2 logs apptuner-relay
curl http://localhost:8787/health
```

## Step 3: Deploy Dashboard

Upload built dashboard files:
```bash
# Create directory for dashboard
mkdir -p ~/apptuner/dashboard

# On your local machine, upload the dist folder:
cd /path/to/apptuner
scp -r dist/* user@your-vps-ip:~/apptuner/dashboard/
```

## Step 4: Configure Caddy (Reverse Proxy + SSL)

Create Caddyfile:
```bash
sudo nano /etc/caddy/Caddyfile
```

Add this configuration:
```caddy
# Dashboard - serves static files
apptuner.io {
    root * /home/YOUR_USERNAME/apptuner/dashboard
    file_server
    encode gzip

    # SPA routing - redirect all routes to index.html
    try_files {path} /index.html
}

# Relay Server - WebSocket proxy
relay.apptuner.io {
    reverse_proxy localhost:8787 {
        # WebSocket support
        header_up Upgrade {http.request.header.Upgrade}
        header_up Connection {http.request.header.Connection}
    }
}
```

**Important**: Replace `YOUR_USERNAME` with your actual username!

Reload Caddy:
```bash
sudo systemctl reload caddy
```

Caddy will automatically:
- Obtain SSL certificates from Let's Encrypt
- Handle HTTPS redirects
- Serve your dashboard
- Proxy WebSocket connections to relay

## Step 5: Configure DNS

Add these DNS records to your domain:

| Type | Name   | Value           | TTL  |
|------|--------|-----------------|------|
| A    | @      | YOUR_VPS_IP     | 3600 |
| A    | relay  | YOUR_VPS_IP     | 3600 |

Wait for DNS propagation (usually 5-15 minutes).

## Step 6: Test Deployment

Test dashboard:
```bash
curl https://apptuner.io
```

Test relay health check:
```bash
curl https://relay.apptuner.io/health
```

Test WebSocket connection:
```bash
# Install wscat if needed
npm install -g wscat

# Test WebSocket
wscat -c wss://relay.apptuner.io/desktop/TEST123
```

## Step 7: Monitor & Maintain

View relay logs:
```bash
pm2 logs apptuner-relay
```

Restart relay:
```bash
pm2 restart apptuner-relay
```

Check Caddy status:
```bash
sudo systemctl status caddy
```

View Caddy logs:
```bash
sudo journalctl -u caddy -f
```

## Firewall Configuration

Ensure these ports are open:
```bash
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

## Alternative: Using Nginx Instead of Caddy

If you prefer Nginx:

```nginx
# /etc/nginx/sites-available/apptuner

# Dashboard
server {
    listen 80;
    listen [::]:80;
    server_name apptuner.io www.apptuner.io;

    root /home/YOUR_USERNAME/apptuner/dashboard;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}

# Relay Server
server {
    listen 80;
    listen [::]:80;
    server_name relay.apptuner.io;

    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and add SSL with Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/apptuner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d apptuner.io -d www.apptuner.io -d relay.apptuner.io
```

## Update Deployment

When you make changes:

1. Build locally:
   ```bash
   npm run build
   ```

2. Upload new dashboard:
   ```bash
   scp -r dist/* user@your-vps-ip:~/apptuner/dashboard/
   ```

3. Upload new relay-server.js:
   ```bash
   scp relay-server.js user@your-vps-ip:~/apptuner/relay-server.js
   pm2 restart apptuner-relay
   ```

## Troubleshooting

**Relay won't start:**
```bash
pm2 delete apptuner-relay
cd ~/apptuner
pm2 start relay-server.js --name apptuner-relay
pm2 logs apptuner-relay
```

**Dashboard not loading:**
```bash
# Check file permissions
ls -la ~/apptuner/dashboard

# Fix if needed
chmod -R 755 ~/apptuner/dashboard
```

**WebSocket connection fails:**
```bash
# Check if relay is running
pm2 status

# Check Caddy logs
sudo journalctl -u caddy -f

# Test direct connection
wscat -c ws://localhost:8787/desktop/TEST
```

**SSL issues:**
```bash
# Check Caddy logs
sudo journalctl -u caddy -f

# Restart Caddy
sudo systemctl restart caddy
```

## Production Checklist

- [ ] Relay server running with PM2
- [ ] PM2 configured for auto-start on boot
- [ ] Dashboard files deployed
- [ ] Caddy configured and running
- [ ] DNS records propagated
- [ ] SSL certificates obtained (automatic with Caddy)
- [ ] Firewall configured
- [ ] Health checks passing
- [ ] WebSocket connections working
- [ ] Dashboard loading correctly

## Next Steps

After deployment:
1. Update CLI to point to `wss://relay.apptuner.io`
2. Update dashboard relay URL to `wss://relay.apptuner.io`
3. Test full workflow: CLI → Relay → Dashboard
4. Publish new CLI version to npm

## Resources

- PM2 Documentation: https://pm2.keymetrics.io/docs
- Caddy Documentation: https://caddyserver.com/docs
- WebSocket Testing: https://www.piesocket.com/websocket-tester
