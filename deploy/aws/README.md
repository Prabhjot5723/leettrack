# LeetTrack on AWS (AWS Academy Sandbox)

## What runs where

| Part | Where |
|---|---|
| React website | AWS EC2 (Ubuntu 24.04), served by nginx |
| FastAPI backend | AWS EC2, systemd service `leettrack`, behind nginx at `/api` |
| Database | MySQL on the same EC2 server, loaded from a **read-only snapshot** of the Aiven database on every build |
| Aiven MySQL | Source of the snapshot only. Nothing is written back automatically |

```
Browser --http--> nginx (port 80) --/--> React build (/var/www/leettrack)
                                  --/api--> uvicorn 127.0.0.1:8000 --> MySQL 127.0.0.1:3306
```

## Why a local database
The Sandbox can be wiped when the lab ends. Rebuilding the server is scripted
(`setup.sh`), and the data is restored from Aiven each time, so a demo always
starts from clean data. Changes made during a demo stay on the server only.

## Files in this folder
| File | Purpose |
|---|---|
| `setup.sh` | Builds the whole server (~10-15 min). Asks for the server IP and the Aiven password |
| `refresh_from_aiven.sh` | Resets the demo data from Aiven without rebuilding |
| `nginx-leettrack.conf` | Reference copy of the nginx site config |
| `leettrack.service` | Reference copy of the systemd unit |
| `backend.env.example` | Template for `backend/.env` (no secrets) |

## Deploy / re-deploy steps
1. AWS Academy: open the Sandbox, **Start Lab**, wait for the green dot, open **AWS**.
2. EC2 -> **Launch instance**: name `leettrack`, **Ubuntu Server 24.04 LTS**, t3.small (or t3.micro), new key pair, allow SSH + HTTP + HTTPS, 20 GiB.
3. Allocate an **Elastic IP** and associate it with the instance.
4. **Connect** -> EC2 Instance Connect. Check `python3 --version` shows 3.12.x.
5. Paste `setup.sh` into the terminal as `~/setup.sh` and run `bash ~/setup.sh`.
6. Enter the server IP and the Aiven password when asked.
7. Test `http://<server-ip>/api/health` -> `{"status":"ok","database":"connected"}`, then open `http://<server-ip>`.

## Progress log

| Date | Step | Status |
|---|---|---|
| 2026-10-26 | Found the AWS Academy Sandbox in the Cloud Developing course | Done |
| 2026-10-26 | Launched EC2 instance (Ubuntu, t3.micro) and attached an Elastic IP | Done |
| 2026-10-26 | Scripted setup: nginx + Node + Python venv + systemd service | Done |
| 2026-10-26 | First setup run finished (`DONE` printed) | Done |
| 2026-10-26 | Lab ended: instance was wiped, so the setup was made repeatable | Done |
| 2026-10-26 | Moved the database into AWS: local MySQL loaded from an Aiven snapshot | Done |
| 2026-10-26 | Rebuild failed on a newer Ubuntu (Python 3.14: `pydantic-core` has no wheel). Fixed: use Ubuntu 24.04 and added a Python 3.12 check to `setup.sh` | Done |
| 2026-10-27 | Shared the site link with a friend for testing | In progress |
| | Verify `/api/health` shows `connected` on the new server | To do |
| | Optional: HTTPS with a free domain (DuckDNS + Let's Encrypt) | To do |
| | Optional: write demo data back to Aiven at the end of a session | To do |

_Update this table in each commit so the history shows progress._

## Known limits
- Runs only while the lab session is on (about 2 hours per session). The server may be wiped when the lab ends, so rebuild with `setup.sh`.
- HTTP only (no domain name yet). Do not use real passwords on the demo site.
- Sandbox budget is shared; do not create load balancers, NAT gateways or RDS.

## Security
- `backend/.env`, key files (`*.pem`) and passwords are never committed.
- `setup.sh` asks for the Aiven password at run time and does not store it.
