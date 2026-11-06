# Health Monitoring System - Deployment Guide

## Recommended Deployment: Render (Backend) + Vercel (Frontend)

This is the best setup for a React + FastAPI application.

---

## Part 1: Deploy Backend to Render

### Step 1: Create PostgreSQL Database
1. Go to https://dashboard.render.com
2. Click **New +** → **PostgreSQL**
3. Name: `health-monitoring-db`
4. Database: `health_monitoring`
5. User: `health_monitoring_user`
6. Region: Choose nearest to you
7. Click **Create Database**

### Step 2: Deploy Backend
1. Click **New +** → **Web Service**
2. Connect your GitHub repository: `varshitha102/Health_monitoring_system`
3. Settings:
   - **Name**: `health-monitoring-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables**:
   - `DATABASE_URL`: Click "Add" → "Select Database" → choose your database
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
   - `TWILIO_PHONE_NUMBER`: Your Twilio Phone Number
   - `MOCK_MODE`: `false`
   - `FRONTEND_URL`: Your Vercel URL (add after frontend is deployed)
5. Click **Create Web Service**

Wait for the backend to deploy. You'll get a URL like: `https://health-monitoring-backend.onrender.com`

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Prepare Frontend for Vercel
Create `frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api",
      "destination": "https://health-monitoring-backend.onrender.com/api"
    },
    {
      "source": "/ws",
      "destination": "https://health-monitoring-backend.onrender.com/ws"
    }
  ]
}
```

### Step 2: Deploy to Vercel
1. Go to https://vercel.com
2. Click **Add New Project**
3. Import your GitHub repository: `varshitha102/Health_monitoring_system`
4. Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_URL`: `https://health-monitoring-backend.onrender.com`
6. Click **Deploy**

Your frontend will be live at: `https://health-monitoring-system.vercel.app`

---

## Part 3: Update Frontend API URL in Vercel

After backend is deployed:
1. Go to your Vercel project
2. Go to Settings → Environment Variables
3. Update `VITE_API_URL` to your backend URL
4. Redeploy

---

## Important: Twilio SMS Will NOT Work

### The Problem:
Your Twilio account is a **Trial Account** which only allows:
- Predefined SMS templates
- Cannot send custom messages with dynamic data (patient name, vitals, location)

### Solution: Upgrade Twilio
1. Go to https://console.twilio.com
2. Navigate to **Billing**
3. Upgrade to a paid plan (starting at ~$1/month)
4. After upgrade, you can send any custom message

### Alternative: Use Mock Mode
For demonstration purposes without upgrading:
- Set `MOCK_MODE=true` in Render environment variables
- The system will simulate SMS sending
- Notification history will show as "SENT"
- No actual SMS will be sent

---

## Why This Setup is Better

### Vercel for Frontend (React)
- ✅ Optimized for React apps
- ✅ Automatic HTTPS
- ✅ Fast global CDN
- ✅ Automatic builds on git push
- ✅ Preview deployments for every branch
- ✅ Better performance than Render for static sites

### Render for Backend (FastAPI)
- ✅ Support for Python web applications
- ✅ Built-in PostgreSQL database
- ✅ Automatic HTTPS
- ✅ Databases are managed for you
- ✅ Good for APIs with websockets

---

## Troubleshooting

### Backend Deploy Fails
- Check requirements.txt has all dependencies
- Ensure DATABASE_URL is correctly set
- Check Render logs for errors

### Frontend Deploy Fails
- Ensure Vite builds locally: `npm run build`
- Check vercel.json configuration
- Verify VITE_API_URL is set correctly

### WebSocket Connection Issues
- Ensure backend URL is correct in Vercel environment variables
- Check if backend CORS allows Vercel origin
- Verify WebSocket is enabled in backend

### SMS Not Sending
- Upgrade Twilio account from trial to paid
- Or use MOCK_MODE=true for testing

---

## Quick Deploy Checklist

1. [ ] Create PostgreSQL on Render
2. [ ] Deploy backend to Render with environment variables
3. [ ] Get backend URL
4. [ ] Create vercel.json in frontend folder
5. [ ] Deploy frontend to Vercel
6. [ ] Set VITE_API_URL in Vercel
7. [ ] Upgrade Twilio account (optional for real SMS)
8. [ ] Test the deployed application

---

## URLs After Deployment

- **Backend**: `https://health-monitoring-backend.onrender.com`
- **Frontend**: `https://health-monitoring-system.vercel.app`
- **Backend API Docs**: `https://health-monitoring-backend.onrender.com/docs`
- **Health Monitoring**: `https://health-monitoring-system.vercel.app`

---

## Cost Estimate

- **Render PostgreSQL**: ~$7/month
- **Render Backend**: ~$7/month (Free tier available)
- **Vercel Frontend**: Free (Hobby tier)
- **Twilio Paid**: ~$1/month minimum

**Total**: ~$15/month for production deployment

---

## Next Steps

1. Create the vercel.json file I showed above
2. Deploy to Render (backend)
3. Deploy to Vercel (frontend)
4. Upgrade Twilio account for real SMS
5. Test your deployed application
