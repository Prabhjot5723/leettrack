#!/bin/bash
# Re-deploy the latest code on an EC2 server that is still running.
# Run on the server:  bash ~/leettrack/deploy/aws/update.sh
set -e
cd ~/leettrack
git pull
IP=$(curl -s http://checkip.amazonaws.com || curl -s ifconfig.me)
cd frontend
npm install
VITE_API_URL="http://$IP" npm run build
sudo cp -r dist/* /var/www/leettrack/
sudo systemctl restart leettrack
echo "UPDATED -> http://$IP"
