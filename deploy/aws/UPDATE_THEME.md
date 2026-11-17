# AWS Sandbox: theme update (17 Nov 2026)

| Step | What | Status |
|------|------|--------|
| 1 | Light / dark theme added to the frontend | Done, pushed to GitHub |
| 2 | New warm colour palette (no blue/purple) | Done |
| 3 | Redeploy on AWS Sandbox | Run `update.sh`, then fill in the date here |

## If the lab is still running
```
ssh into the server, then:
bash ~/leettrack/deploy/aws/update.sh
```
Open `http://<server IP>` and press the round button at the bottom-right.

## If the lab was restarted (server gone)
Build a new server and run `deploy/aws/setup.sh` exactly as before.
It already builds the frontend, so the theme comes with it.
