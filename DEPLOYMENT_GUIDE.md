# Deployment Guide - Health Monitoring System

## Option 1: Deploy to Render (Recommended for Production)

### Prerequisites
- Render account (https://render.com)
- Git repository with your code
- Twilio account with upgraded plan (to send custom SMS)

### Step 1: Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Create Render Services

#### A. Create PostgreSQL Database
1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Name: `health-monitoring-db`
4. Database: `health_monitoring`
5. User: `health_monitoring_user`
6. Click "Create Database"

#### B. Create Backend Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Settings:
   - Name: `health-monitoring-backend`
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   - `DATABASE_URL`: From database (click "Add" → "Select Database")
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
   - `TWILIO_PHONE_NUMBER`: Your Twilio Phone Number
   - `MOCK_MODE`: `false`
   - `FRONTEND_URL`: Your frontend URL (after creating it)
5. Click "Create Web Service"

#### C. Create Frontend Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Settings:
   - Name: `health-monitoring-frontend`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run dev` (or use static site)
4. Environment Variables:
   - `VITE_API_URL`: Your backend URL (e.g., https://health-monitoring-backend.onrender.com)
5. Click "Create Web Service"

### Step 3: Update Frontend API URL
After both services are deployed:
1. Get your backend URL from Render
2. Update the frontend's `VITE_API_URL` environment variable
3. Redeploy the frontend

---

## Option 2: Deploy with CircleCI (CI/CD Pipeline)

### Prerequisites
- CircleCI account (https://circleci.com)
- GitHub repository connected to CircleCI
- Render account with API key

### Step 1: Enable CircleCI on Repository
1. Go to CircleCI Dashboard
2. Click "Add Projects"
3. Select your GitHub repository
4. Click "Set Up Project"

### Step 2: Configure CircleCI
1. Add environment variables in CircleCI project settings:
   - `RENDER_API_KEY`: Your Render API key (get from Render Dashboard → Account Settings → API Keys)
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
   - `TWILIO_PHONE_NUMBER`: Your Twilio Phone Number

### Step 3: Push to Trigger Pipeline
```bash
git add .
git commit -m "Add CircleCI configuration"
git push
```

CircleCI will automatically:
1. Build and test the backend
2. Build the frontend
3. Deploy to Render

---

## Option 3: Deploy with Docker

### Local Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```

Access:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Database: localhost:5432

### Deploy Docker to Render
1. Create a Docker-based web service on Render
2. Use the `docker-compose.yml` configuration
3. Set environment variables in Render

---

## Important Notes for SMS

### Twilio Trial Account Limitations
- Trial accounts can only send **predefined SMS templates**
- Custom messages with dynamic data (patient name, vitals, location) require a **paid Twilio account**
- Upgrade your Twilio account to send real SMS

### To Upgrade Twilio
1. Go to https://console.twilio.com
2. Navigate to "Billing"
3. Select a plan (starting at ~$1/month)
4. After upgrade, you can send any custom message

### Alternative: Use Mock Mode
For demonstration purposes without upgrading:
- Set `MOCK_MODE=true` in environment variables
- The system will simulate SMS sending
- Notification history will show as "SENT"
- No actual SMS will be sent

---

## Environment Variables Reference

### Backend (.env)
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
DATABASE_URL=postgresql://user:password@host:port/dbname
MOCK_MODE=false
FRONTEND_URL=https://your-frontend-url.com
```

### Frontend
```
VITE_API_URL=https://your-backend-url.com
```

---

## Troubleshooting

### SMS Not Sending
1. Check if Twilio account is upgraded (trial accounts can't send custom messages)
2. Verify phone numbers are verified in Twilio
3. Check Twilio error logs in console
4. Enable mock mode for testing

### WebSocket Connection Issues
1. Ensure backend URL is correct in frontend
2. Check CORS settings in backend
3. Verify WebSocket proxy configuration in nginx

### Database Connection Issues
1. Check DATABASE_URL format
2. Ensure database is running
3. Verify database credentials

---

## Quick Start with Render (Fastest)

1. **Push code to GitHub**
2. **Create PostgreSQL on Render**
3. **Create Backend on Render** (set environment variables)
4. **Create Frontend on Render** (set VITE_API_URL)
5. **Done!**

Your app will be live at:
- Backend: https://health-monitoring-backend.onrender.com
- Frontend: https://health-monitoring-frontend.onrender.com
