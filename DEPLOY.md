# AI News Generator - Docker Deployment Guide

## 📦 สำหรับ Proxmox Container

### ขั้นตอนการติดตั้ง

#### 1. เตรียม Proxmox Container
```bash
# สร้าง Ubuntu/Debian LXC Container ใน Proxmox
# แนะนำ: Ubuntu 22.04 LTS
# RAM: 2GB ขึ้นไป
# Storage: 10GB ขึ้นไป
```

#### 2. ติดตั้ง Docker & Docker Compose
```bash
# SSH เข้า container
ssh root@<container-ip>

# Update system
apt update && apt upgrade -y

# ติดตั้ง Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# ติดตั้ง Docker Compose
apt install docker-compose -y

# ตรวจสอบ
docker --version
docker-compose --version
```

#### 3. อัปโหลดโค้ด
```bash
# Option A: ใช้ Git (ถ้ามี repository)
git clone <your-repo-url> /opt/ai-news-generator
cd /opt/ai-news-generator

# Option B: อัปโหลดด้วย SCP จาก Windows
# เปิด PowerShell บน Windows:
scp -r "c:\Users\User\OneDrive - Nakhon Phanom University\app\n8n Ai\*" root@<container-ip>:/opt/ai-news-generator/
```

#### 4. ตั้งค่า Environment
```bash
cd /opt/ai-news-generator

# คัดลอกและแก้ไข .env
cp .env.example .env
nano .env

# แก้ไข:
# GEMINI_API_KEY=<your-actual-key>
# PORT=3000
# NODE_ENV=production
```

#### 5. Build และรัน Container
```bash
# Build image
docker-compose -f docker-compose.prod.yml build

# รัน container
docker-compose -f docker-compose.prod.yml up -d

# ตรวจสอบ logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### 6. ตรวจสอบการทำงาน
```bash
# ตรวจสอบ container
docker ps

# ทดสอบเข้าถึง
curl http://localhost:3000

# เปิด Browser:
http://<container-ip>:3000
```

---

## 🔄 คำสั่งที่ใช้บ่อย

### ดู Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f ai-news-generator
```

### Restart Container
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop Container
```bash
docker-compose -f docker-compose.prod.yml down
```

### Update Code
```bash
# Pull code ใหม่
git pull  # หรืออัปโหลดด้วย SCP

# Rebuild และ restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Backup Database
```bash
# SQLite database อยู่ที่ news.db
cp news.db news.db.backup-$(date +%Y%m%d)
```

---

## 🌐 ใช้กับ Nginx Reverse Proxy (Optional)

ถ้าต้องการใช้ domain name หรือ HTTPS:

### ติดตั้ง Nginx
```bash
apt install nginx -y
```

### สร้าง Config
```bash
nano /etc/nginx/sites-available/ai-news
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # เปลี่ยนเป็น domain ของคุณ

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable Site
```bash
ln -s /etc/nginx/sites-available/ai-news /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 🔒 Auto-Start on Boot

Docker Compose มี `restart: unless-stopped` อยู่แล้ว จะ auto-start เมื่อ reboot container

### ตรวจสอบ
```bash
# Reboot container
reboot

# หลัง boot เสร็จ ตรวจสอบ
docker ps
```

---

## 📊 Monitoring

### ดู Resource Usage
```bash
docker stats ai-news-generator
```

### ดู Database Size
```bash
ls -lh news.db
```

---

## ❓ Troubleshooting

### Container ไม่ทำงาน
```bash
# ดู logs
docker-compose -f docker-compose.prod.yml logs ai-news-generator

# เช็ค port conflict
netstat -tulpn | grep 3000
```

### Database ปัญหา
```bash
# เข้า container
docker exec -it ai-news-generator sh

# ตรวจสอบ database
ls -la news.db
```

### Update Gemini API Key
```bash
# แก้ไข .env
nano .env

# Restart container
docker-compose -f docker-compose.prod.yml restart
```

---

## 📝 Notes

- **Database**: SQLite `news.db` จะถูกสร้างอัตโนมัติ
- **Port**: Default 3000 (แก้ได้ใน .env และ docker-compose.prod.yml)
- **Logs**: ดูได้ด้วย `docker-compose logs`
- **Updates**: Pull code ใหม่และ rebuild image
