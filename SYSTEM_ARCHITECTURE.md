# System Architecture & Deployment Context
*This document is intended for AI Agents and Developers to understand the current production setup.*

## 🏗️ Project Overview
- **Type**: Node.js Web Application (Express.js) serving a static frontend.
- **Frontend**: Single `index.html` file using TailwindCSS (CDN) and Vanilla JS.
- **Backend**: `server.js` (Express) handling API requests, file uploads, and SQLite database (`news.db`).
- **Database**: SQLite (`news.db`).

## 🚀 Deployment Infrastructure (Proxmox/Docker)

### 1. Docker Configuration (`docker-compose.prod.yml`)
The system runs on **Docker Compose** with **Volume Mounting** enabled for live updates.
- **Images**: Built locally (`ai-news-generator:latest`).
- **Volumes (CRITICAL)**:
  - `./index.html:/app/index.html` -> Maps host file to container. Allows HTML updates without rebuild.
  - `./server.js:/app/server.js` -> Maps host file to container. Allows Backend updates with just a restart.
  - `./news.db:/app/news.db` -> Persists database data.

### 2. File Structure & Uploads
**⚠️ IMPORTANT:** The `dist/` folder is **OBSOLETE**. Do not use it.
- **Source of Truth**: The files in the **Root Directory** (`/opt/ai-news-generator/`).
- **Upload Location**: Upload `index.html`, `server.js`, `docker-compose.prod.yml` directly to the root folder.

### 3. Docker Command Quirk (Server-Specific)
This server runs a specific setup where `docker-compose` (Python version) was broken and replaced by a **standalone binary**.
- **❌ DO NOT USE**: `docker compose` (with space) -> Will fail or not exist.
- **✅ MUST USE**: `docker-compose` (with hyphen) -> This points to the manually installed v2 binary at `/usr/bin/docker-compose`.

## 🔄 Update Procedures

### To Update Frontend (`index.html`):
1.  Upload `index.html` to server root.
2.  Refresh Browser. (Instant update due to volume mount).

### To Update Backend (`server.js`):
1.  Upload `server.js` to server root.
2.  Restart Container:
    ```bash
    docker-compose -f docker-compose.prod.yml restart
    ```

### To Update Infrastructure (`docker-compose.prod.yml`):
1.  Upload file to server root.
2.  Recreate Containers:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d
    ```

## 🐛 Troubleshooting History
- **Issue**: "ModuleNotFoundError: No module named 'distutils'"
  - **Fix**: Replaced broken Python `docker-compose` with official standalone binary.
- **Issue**: Files not updating after upload.
  - **Fix 1**: Implemented Volume Mounting in `docker-compose.prod.yml`.
  - **Fix 2**: User was uploading from `dist/` (stale) instead of root. Corrected upload path.
