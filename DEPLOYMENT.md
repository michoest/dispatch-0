# Deployment Guide - Raspberry Pi with PM2

Guide for deploying the voice dispatcher to a Raspberry Pi (or any server) using PM2 process manager.

## Prerequisites

- Raspberry Pi (or any Linux server) with Node.js installed
- Domain pointing to your Pi (e.g., `dispatch.michoest.com`)
- Reverse proxy (nginx/Caddy) configured for HTTPS
- PM2 installed globally: `npm install -g pm2`

## Deployment Steps

### 1. Prepare the Server

```bash
# On your Raspberry Pi, create deployment directory
mkdir -p ~/apps/dispatch
cd ~/apps/dispatch

# Clone or copy your code to the server
# (Use git, scp, rsync, etc.)
```

### 2. Configure Environment

Create `.env` file on the server:

```bash
cat > .env << 'EOF'
PORT=3100
OPENAI_API_KEY=sk-your-actual-openai-key
DISPATCHER_API_KEY=your-secure-dispatcher-api-key
LLM_MODEL=gpt-4-turbo-preview
CONFIDENCE_THRESHOLD=0.7
HEALTH_CHECK_INTERVAL=60000
DB_PATH=./db.json
LOG_LEVEL=info
NODE_ENV=production
EOF
```

**Important**: The ecosystem.config.js uses these ports:
- Dispatcher: `3100`
- Calendar service: `3101`
- Reminder service: `3102`
- Weather service: `3103`

### 3. Install Dependencies

```bash
# Install main dispatcher dependencies
npm install --production

# Install dummy service dependencies
cd dummy-services/calendar-service && npm install --production
cd ../reminder-service && npm install --production
cd ../weather-service && npm install --production
cd ../..
```

### 4. Create Logs Directory

```bash
mkdir -p logs
```

### 5. Start with PM2

The `ecosystem.config.js` file defines all 4 services (dispatcher + 3 dummy services).

```bash
# Start all services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# View specific service logs
pm2 logs dispatcher
pm2 logs calendar-service
```

### 6. Configure PM2 Startup

Make PM2 restart services on system reboot:

```bash
# Generate startup script
pm2 startup

# This will output a command to run - execute it
# Example: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi

# Save current process list
pm2 save
```

### 7. Register Services

Wait a few seconds for services to start, then register them:

```bash
# Update the script with your actual API key and new ports
cat > register-services-pi.sh << 'EOF'
#!/bin/bash

API_KEY="${DISPATCHER_API_KEY:-your-secure-dispatcher-api-key}"

echo "Registering services on local ports..."

curl -X POST http://localhost:3100/api/services/register \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3101", "apiKey": "calendar-secret-key"}'

echo ""

curl -X POST http://localhost:3100/api/services/register \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3102", "apiKey": "reminder-secret-key"}'

echo ""

curl -X POST http://localhost:3100/api/services/register \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3103", "apiKey": "weather-secret-key"}'

echo ""
echo "Services registered!"
EOF

chmod +x register-services-pi.sh
./register-services-pi.sh
```

## Reverse Proxy Configuration

### Option A: Nginx

```nginx
# /etc/nginx/sites-available/dispatch

server {
    listen 80;
    server_name dispatch.michoest.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dispatch.michoest.com;

    # SSL configuration (adjust paths for your setup)
    ssl_certificate /etc/letsencrypt/live/dispatch.michoest.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dispatch.michoest.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/dispatch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option B: Caddy (Easier, auto-HTTPS)

```caddy
# /etc/caddy/Caddyfile

dispatch.michoest.com {
    reverse_proxy localhost:3100
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

## PM2 Management Commands

### Viewing Status and Logs

```bash
# List all processes
pm2 list

# Detailed info
pm2 show dispatcher

# View logs (all services)
pm2 logs

# View specific service logs
pm2 logs dispatcher
pm2 logs calendar-service

# Real-time monitoring
pm2 monit
```

### Managing Services

```bash
# Restart all services
pm2 restart all

# Restart specific service
pm2 restart dispatcher

# Stop all services
pm2 stop all

# Delete all services from PM2
pm2 delete all

# Reload with new config
pm2 reload ecosystem.config.js
```

### Updating the Application

```bash
# Pull latest code
git pull  # or copy new files

# Install dependencies if changed
npm install --production

# Restart services
pm2 restart all

# Check logs for errors
pm2 logs --lines 50
```

## Testing the Deployment

### 1. Test Locally on Pi

```bash
# Health check
curl http://localhost:3100/health

# List registered services
curl http://localhost:3100/api/services \
  -H "x-api-key: your-secure-dispatcher-api-key"

# Test dispatch
curl -X POST http://localhost:3100/api/dispatch \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Schedule a meeting tomorrow at 2pm"}'
```

### 2. Test via HTTPS Domain

```bash
# From your local machine or phone
curl https://dispatch.michoest.com/health

# Test dispatch
curl -X POST https://dispatch.michoest.com/api/dispatch \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "What is the weather in San Francisco"}'
```

### 3. Configure Siri Shortcut

Update your Siri Shortcut URL to:
```
https://dispatch.michoest.com/api/dispatch
```

See [SIRI_SETUP.md](SIRI_SETUP.md) for complete Siri configuration instructions.

## Monitoring and Maintenance

### Check System Resources

```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Disk space
df -h

# Check logs size
du -sh logs/
```

### Log Rotation

PM2 logs can grow large. Install pm2-logrotate:

```bash
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Database Backup

The `db.json` file contains your service registry and request logs:

```bash
# Backup database
cp db.json db.json.backup

# Automated daily backup
echo "0 2 * * * cp ~/apps/dispatch/db.json ~/apps/dispatch/db.json.backup-\$(date +\%Y\%m\%d)" | crontab -
```

## Security Considerations

### 1. Firewall Configuration

Only expose HTTPS (443) and optionally SSH (22):

```bash
# If using UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Internal ports (3100-3103) should NOT be exposed
```

### 2. API Key Security

- Use a strong, unique API key
- Store in `.env` file (not committed to git)
- Consider rotating keys periodically
- Use different keys for different clients if needed

### 3. Rate Limiting

Consider adding rate limiting to nginx:

```nginx
# In nginx config
limit_req_zone $binary_remote_addr zone=dispatch:10m rate=10r/m;

location /api/dispatch {
    limit_req zone=dispatch burst=5;
    proxy_pass http://localhost:3100;
}
```

### 4. Keep System Updated

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
npm update

# Update PM2
npm install -g pm2@latest
pm2 update
```

## Troubleshooting

### Services Won't Start

```bash
# Check PM2 logs
pm2 logs --err

# Check individual service
pm2 logs dispatcher --err

# Verify .env file exists and is readable
cat .env

# Check port availability
sudo netstat -tlnp | grep 3100
```

### OpenAI API Errors

```bash
# Verify API key is set
pm2 env 0 | grep OPENAI

# Check logs for specific error
pm2 logs dispatcher | grep -i openai

# Test API key manually
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-key"
```

### Services Not Registering

```bash
# Check if services are running
pm2 list

# Test service endpoints directly
curl http://localhost:3101/health
curl http://localhost:3102/health
curl http://localhost:3103/health

# Re-register services
./register-services-pi.sh
```

### HTTPS/SSL Issues

```bash
# Test SSL certificate
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test nginx config
sudo nginx -t
```

### High Memory Usage

```bash
# Check memory per service
pm2 list

# Restart service with high memory
pm2 restart dispatcher

# The ecosystem.config.js has max_memory_restart set
# Services will auto-restart if they exceed limits
```

## Performance Optimization for Raspberry Pi

### 1. Reduce Health Check Frequency

In `.env`:
```env
HEALTH_CHECK_INTERVAL=300000  # 5 minutes instead of 1
```

### 2. Limit Log Retention

```bash
# Keep only last 100 lines in pm2 logs
pm2 flush  # Clear all logs

# Or set max lines in ecosystem.config.js
```

### 3. Monitor Temperature

Raspberry Pi can throttle when hot:

```bash
# Check temperature
vcgencmd measure_temp

# Install monitoring
sudo apt install lm-sensors
sensors
```

## Quick Reference

### Deployment Checklist

- [ ] Node.js installed
- [ ] PM2 installed globally
- [ ] Code deployed to server
- [ ] `.env` file configured with API keys
- [ ] Dependencies installed (`npm install --production`)
- [ ] Logs directory created
- [ ] Services started (`pm2 start ecosystem.config.js`)
- [ ] PM2 configured for startup (`pm2 startup` + `pm2 save`)
- [ ] Services registered (`./register-services-pi.sh`)
- [ ] Reverse proxy configured (nginx/Caddy)
- [ ] SSL certificate configured
- [ ] Firewall rules set
- [ ] Tested via HTTPS
- [ ] Siri shortcut updated with new URL

### Essential Commands

```bash
# Start
pm2 start ecosystem.config.js

# Status
pm2 list

# Logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all

# Monitor
pm2 monit
```
