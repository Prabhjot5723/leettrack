# Deploying LeetTrack (free)

Accounts needed (all free, no credit card): **GitHub**, **Aiven** (MySQL database), **Render** (backend + website).

Flow:  Browser -> Render static site (React) -> Render web service (FastAPI) -> Aiven MySQL

## 1. Put the project on GitHub
```
git init
git add .
git status            # make sure .env, node_modules and .venv are NOT listed
git commit -m "LeetTrack"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/leettrack.git
git push -u origin main
```

## 2. Create the cloud database (Aiven)
1. Sign up at aiven.io, create a service: MySQL, Free plan, a region near India/Render.
2. When it is "Running", copy Host, Port, User, Password and Database name from the service page.
3. Create `backend/.env.cloud` (this file is gitignored):
```
DB_HOST=...host from Aiven...
DB_PORT=...port from Aiven...
DB_USER=...user from Aiven...
DB_PASSWORD=...password from Aiven...
DB_NAME=...database name from Aiven (usually defaultdb)...
DB_SSL=true
```
4. From the `backend` folder (venv on): `python setup_cloud_db.py`

## 3. Deploy on Render
1. render.com -> sign up with GitHub -> New -> Blueprint -> pick your repo.
2. Fill the prompts: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (same as above),
   CORS_ORIGINS and VITE_API_URL (guess now, fix in step 4).
3. Click Apply and wait for both services to finish building.

## 4. Connect the two services
1. Copy the API URL (leettrack-api) and the website URL (leettrack-web) from Render.
2. leettrack-api -> Environment -> CORS_ORIGINS = website URL (no trailing slash).
3. leettrack-web -> Environment -> VITE_API_URL = API URL (no trailing slash). Redeploy it
   (Manual Deploy -> Deploy latest commit) if it does not rebuild by itself.

## 5. Test
- `API_URL/api/health` shows `"database":"connected"`.
- Open the website, sign up, log in, solve a question, refresh a page like /progress.
- Free services sleep after 15 minutes idle; the first request afterwards takes ~1 minute.
