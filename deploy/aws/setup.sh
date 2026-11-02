#!/bin/bash
# LeetTrack - one-command setup for an Ubuntu 24.04 EC2 server (AWS Academy Sandbox).
# Installs nginx, Node, Python venv and MySQL; copies a READ-ONLY snapshot of the
# Aiven database into the local MySQL; builds the React site; starts the API as a
# systemd service. Asks for the server IP and the Aiven password (never stored).
set -e
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
python3 --version | grep -q "3\.12" || { echo "ERROR: this server is not Ubuntu 24.04 (needs Python 3.12). Launch it again with Ubuntu Server 24.04 LTS."; exit 1; }
read -p "Server public IP (numbers only): " IP
read -s -p "Aiven password (hidden): " DBPW; echo
AH=mysql-2846b4c0-prabhjotsinghkajjal-8560.g.aivencloud.com
AP=26675
AU=avnadmin
AN=defaultdb
LDB=leetcode_tracker
LUSER=leettrack
LPW=$(openssl rand -hex 16)
sudo -E apt update
sudo -E apt install -y python3-venv python3-pip nginx git mysql-server
if [ ! -f /swapfile ]; then sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile; fi
sudo swapon /swapfile 2>/dev/null || true
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo -E apt install -y nodejs
sudo tee /etc/mysql/mysql.conf.d/zz-lowmem.cnf > /dev/null <<EOC
[mysqld]
performance_schema=OFF
innodb_buffer_pool_size=128M
max_connections=40
EOC
sudo systemctl restart mysql
echo "Copying a snapshot of your data from Aiven (read-only)..."
MYSQL_PWD="$DBPW" mysqldump -h $AH -P $AP -u $AU --ssl-mode=REQUIRED --single-transaction --no-tablespaces --set-gtid-purged=OFF $AN > /tmp/aiven_dump.sql
grep -q "CREATE TABLE" /tmp/aiven_dump.sql || { echo "ERROR: copy from Aiven failed (wrong password?)"; exit 1; }
sudo mysql -e "DROP DATABASE IF EXISTS $LDB; CREATE DATABASE $LDB CHARACTER SET utf8mb4; CREATE USER IF NOT EXISTS '$LUSER'@'localhost' IDENTIFIED BY '$LPW'; ALTER USER '$LUSER'@'localhost' IDENTIFIED BY '$LPW'; GRANT ALL ON $LDB.* TO '$LUSER'@'localhost'; FLUSH PRIVILEGES;"
sudo mysql $LDB < /tmp/aiven_dump.sql
rm -f /tmp/aiven_dump.sql
cd ~
[ -d leettrack ] || git clone https://github.com/Prabhjot5723/leettrack.git
cd ~/leettrack && git pull
cd ~/leettrack/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cat > .env <<EOT
ENVIRONMENT=production
APP_UTC_OFFSET_MINUTES=330
JWT_EXPIRE_HOURS=24
DB_SSL=false
JWT_SECRET=$(openssl rand -hex 32)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=$LUSER
DB_PASSWORD=$LPW
DB_NAME=$LDB
CORS_ORIGINS=http://$IP
FRONTEND_URL=http://$IP
BREVO_API_KEY=
MAIL_FROM=
EOT
chmod 600 .env
sudo tee /etc/systemd/system/leettrack.service > /dev/null <<EOS
[Unit]
Description=LeetTrack API
After=network.target mysql.service
[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/leettrack/backend
ExecStart=/home/ubuntu/leettrack/backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --proxy-headers
Restart=always
[Install]
WantedBy=multi-user.target
EOS
sudo systemctl daemon-reload
sudo systemctl enable leettrack
sudo systemctl restart leettrack
cd ~/leettrack/frontend
npm install
VITE_API_URL=http://$IP npm run build
sudo mkdir -p /var/www/leettrack
sudo cp -r dist/* /var/www/leettrack/
sudo tee /etc/nginx/sites-available/leettrack > /dev/null <<'EON'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/leettrack;
    index index.html;
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        try_files $uri /index.html;
    }
}
EON
sudo ln -sf /etc/nginx/sites-available/leettrack /etc/nginx/sites-enabled/leettrack
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
echo "DONE. Open http://$IP/api/health"
