# Production Deployment Quick Start

Ultra-quick guide to deploy to your Raspberry Pi at https://dispatch.michoest.com

## On Your Development Machine

```bash
# 1. Copy files to Pi
rsync -avz --exclude 'node_modules' --exclude 'logs' --exclude 'db.json' \
  ./ pi@your-pi-ip:~/apps/dispatch/

# Or use git
ssh pi@your-pi-ip
cd ~/apps/dispatch
git pull
```

## On Your Raspberry Pi

```bash
# Navigate to project
cd ~/apps/dispatch

# Create .env file
cat > .env << 'EOF'
PORT=3100
OPENAI_API_KEY=sk-your-actual-openai-key-here
DISPATCHER_API_KEY=your-secure-dispatcher-api-key
LLM_MODEL=gpt-4-turbo-preview
CONFIDENCE_THRESHOLD=0.7
HEALTH_CHECK_INTERVAL=60000
DB_PATH=./db.json
LOG_LEVEL=info
NODE_ENV=production
EOF

# Install dependencies (if first time)
npm install --production
cd dummy-services/calendar-service && npm install --production
cd ../reminder-service && npm install --production
cd ../weather-service && npm install --production
cd ../..

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Enable startup on boot
pm2 startup
# Run the command it outputs
pm2 save

# Wait a few seconds, then register services
./register-services-production.sh

# Check status
pm2 list
pm2 logs
```

## Configure Reverse Proxy

### If using Caddy (easiest):

```bash
# Edit Caddyfile
sudo nano /etc/caddy/Caddyfile

# Add this:
dispatch.michoest.com {
    reverse_proxy localhost:3100
}

# Save and reload
sudo systemctl reload caddy
```

### If using nginx:

```bash
# Create site config
sudo nano /etc/nginx/sites-available/dispatch

# Paste the nginx config from DEPLOYMENT.md

# Enable site
sudo ln -s /etc/nginx/sites-available/dispatch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with certbot
sudo certbot --nginx -d dispatch.michoest.com
```

## Test It

```bash
# Test locally on Pi
curl http://localhost:3100/health

# Test via domain
curl https://dispatch.michoest.com/health

# Test dispatch
curl -X POST https://dispatch.michoest.com/api/dispatch \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "What is the weather in San Francisco"}'
```

## Update Siri Shortcut

In your iPhone Shortcuts app, change the URL to:
```
https://dispatch.michoest.com/api/dispatch
```

Done! Your dispatcher is now running 24/7 on your Raspberry Pi.

## Common PM2 Commands

```bash
pm2 list          # Show all services
pm2 logs          # View logs
pm2 restart all   # Restart all services
pm2 stop all      # Stop all services
pm2 monit         # Real-time monitoring
```

## Troubleshooting

**Services not starting?**
```bash
pm2 logs --err
```

**Can't access via domain?**
```bash
# Check reverse proxy
sudo systemctl status caddy  # or nginx
sudo nginx -t  # if using nginx
```

**OpenAI errors?**
```bash
# Check environment variables
pm2 env 0
```

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
