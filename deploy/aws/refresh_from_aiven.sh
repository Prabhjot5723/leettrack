#!/bin/bash
# Reset the demo data: reload the local MySQL from a fresh read-only copy of Aiven.
set -e
read -s -p "Aiven password (hidden): " DBPW; echo
MYSQL_PWD="$DBPW" mysqldump -h mysql-2846b4c0-prabhjotsinghkajjal-8560.g.aivencloud.com -P 26675 -u avnadmin --ssl-mode=REQUIRED --single-transaction --no-tablespaces --set-gtid-purged=OFF defaultdb > /tmp/aiven_dump.sql
grep -q "CREATE TABLE" /tmp/aiven_dump.sql || { echo "ERROR: copy from Aiven failed (wrong password?)"; exit 1; }
sudo mysql -e "DROP DATABASE IF EXISTS leetcode_tracker; CREATE DATABASE leetcode_tracker CHARACTER SET utf8mb4;"
sudo mysql leetcode_tracker < /tmp/aiven_dump.sql
rm -f /tmp/aiven_dump.sql
sudo systemctl restart leettrack
echo "Fresh copy of the data loaded."
