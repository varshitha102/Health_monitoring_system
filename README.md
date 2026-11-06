# Real-Time Patient Health Monitoring System

A comprehensive healthcare monitoring application combining machine learning prediction, real-time synthetic scenario generation, and Twilio emergency SMS notifications.

## Features

### 1. Real-Time Scenario Monitoring (Page 1)
- Three synthetic patient scenarios: NORMAL, WARNING, CRITICAL
- Real-time WebSocket streaming of health readings
- Live charts for temperature, heart rate, and SpO2
- Automatic threshold detection
- Triggered Twilio SMS notifications for emergencies
- Streaming controls (Start, Pause, Reset)

### 2. Emergency Management (Page 2)
- Emergency contact management (Add, Edit, Delete)
- Multiple emergency contacts support
- Primary contact selection
- E.164 phone number validation
- Twilio SMS integration
- Notification delivery status tracking
- Notification history with real-time updates

### 3. Patient Prediction (Page 3)
- ML-based health prediction using Isolation Forest
- Anomaly detection on physiological readings
- Rule-based classification (NORMAL/WARNING/CRITICAL)
- Dynamic form based on model features
- Prediction history storage
- Model information display

## Technology Stack

### Backend
- **FastAPI 0.104.1** - Python web framework
- **Twilio 8.11.0** - SMS API integration
- **SQLAlchemy 2.0.23** - ORM and database
- **Scikit-learn 1.6.1** - Machine learning
- **Pandas 2.3.3** - Data processing
- **Isolation Forest** - Anomaly detection algorithm
- **SQLite** - Database
- **WebSockets** - Real-time communication

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Axios** - HTTP client
- **WebSocket** - Real-time data

## Project Structure

```
health_monitoring/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Configuration
│   │   ├── database.py             # Database setup
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── contact.py
│   │   │   ├── notification.py
│   │   │   └── prediction.py
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── contact.py
│   │   │   ├── alert.py
│   │   │   └── prediction.py
│   │   ├── routers/                # API endpoints
│   │   │   ├── contacts.py
│   │   │   ├── notifications.py
│   │   │   ├── predictions.py
│   │   │   └── twilio.py
│   │   ├── services/               # Business logic
│   │   │   ├── twilio_service.py
│   │   │   ├── synthetic_generator.py
│   │   │   ├── prediction_service.py
│   │   │   └── notification_service.py
│   │   └── websockets/              # WebSocket handlers
│   │       └── monitoring_ws.py
│   ├── ml/                         # Machine learning
│   │   ├── train_model.py          # Training script
│   │   └── preprocessing.py        # Data preprocessing
│   ├── trained_models/              # Saved ML artifacts
│   │   ├── model.joblib
│   │   ├── preprocessing_pipeline.joblib
│   │   └── model_metadata.json
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                  # React pages
│   │   │   ├── ScenarioMonitoring.jsx
│   │   │   ├── EmergencyManagement.jsx
│   │   │   └── PatientPrediction.jsx
│   │   ├── components/             # Reusable components
│   │   │   ├── ContactManager.jsx
│   │   │   ├── AlertSender.jsx
│   │   │   └── NotificationHistory.jsx
│   │   ├── services/               # API clients
│   │   │   ├── api.js
│   │   │   └── websocket.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
├── reports/
│   └── dataset_inspection_report.md
├── *.csv                           # Original dataset files
└── README.md
```

## Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Twilio account (for SMS functionality)

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
DATABASE_URL=sqlite:///./health_monitoring.db
FRONTEND_URL=http://localhost:5173
MOCK_MODE=False  # Set to True for testing without Twilio
```

5. **Train ML model**
```bash
cd ml
python train_model.py
cd ..
```

This will:
- Load and preprocess the CSV dataset
- Train Isolation Forest anomaly detection model
- Save model and preprocessing pipeline
- Generate model metadata

6. **Start FastAPI server**
```bash
uvicorn app.main:app --reload
```

Backend will run on `http://localhost:8000`

API documentation available at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## Usage

### Page 1: Scenario Monitoring

1. Navigate to "Scenario Monitoring"
2. Select a scenario:
   - **Normal Patient**: Healthy vital signs
   - **Warning Patient**: Moderately elevated readings
   - **Critical Patient**: Severely abnormal readings
3. Click to start real-time streaming
4. Observe:
   - Live health cards with color-coded status
   - Real-time charts updating via WebSocket
   - Alert history when thresholds are exceeded
5. Use Pause/Reset controls as needed

### Page 2: Emergency Management

1. Navigate to "Emergency Management"
2. Add emergency contacts:
   - Click "Add Contact"
   - Enter name and phone number (E.164 format: +1234567890)
   - Set as primary if desired
3. Send test alerts:
   - Enter patient ID and health readings
   - Select alert level (WARNING/CRITICAL)
   - Choose contacts to notify
   - Click "Send Test Alert"
4. View notification history with delivery status

### Page 3: Patient Prediction

1. Navigate to "Patient Prediction"
2. View model information at the top
3. Enter patient details:
   - Patient ID (required)
   - Age (required)
   - Heart Rate, SpO2, Temperature, Steps (optional)
4. Click "Generate Prediction"
5. View results:
   - Predicted health status (color-coded)
   - Anomaly score (if ML model available)
   - Model version used
6. Check prediction history table

## ML Model Details

### Dataset
- Original dataset: Smartwatch wearable telemetry
- 960 readings from 24 participants
- Features: heart_rate_bpm, spo2_pct, skin_temp_c, steps, age
- No explicit health status labels in original data

### Model
- **Algorithm**: Isolation Forest (unsupervised anomaly detection)
- **Contamination**: 5% (expected outlier proportion)
- **Training samples**: 760 (19 participants)
- **Test samples**: 200 (5 participants)
- **Preprocessing**: Median imputation + StandardScaler

### Classification
- ML model provides anomaly scores
- Rule-based thresholds determine WARNING/CRITICAL status
- Thresholds based on medical literature:
  - Temperature: Normal 36.1-37.5°C, Warning 37.6-38.9°C, Critical ≥39.0°C
  - Heart Rate: Normal 60-100 BPM, Warning 101-119 BPM, Critical ≥130 BPM
  - SpO2: Normal 95-100%, Warning 90-94%, Critical ≤89%

### Important Notes
- The dataset contains only healthy readings
- ML model is anomaly detection, not supervised classification
- Synthetic scenarios are for demonstration only (clearly labeled)
- Rule-based classification is used for emergency thresholds
- Model should be retrained with labeled data for production use

## API Endpoints

### Contacts
- `POST /api/contacts/` - Create contact
- `GET /api/contacts/` - List all contacts
- `GET /api/contacts/{id}` - Get specific contact
- `PUT /api/contacts/{id}` - Update contact
- `DELETE /api/contacts/{id}` - Delete contact

### Notifications
- `POST /api/notifications/send-alert` - Send emergency alert
- `GET /api/notifications/` - List notifications
- `GET /api/notifications/{id}` - Get specific notification

### Predictions
- `POST /api/predictions/` - Generate prediction
- `GET /api/predictions/` - List predictions
- `GET /api/predictions/{id}` - Get specific prediction
- `GET /api/predictions/model/info` - Get model metadata

### WebSocket
- `WS /ws/monitor/{patient_id}` - Real-time health monitoring
  - Query params: scenario, steps, interval, notifications

## Twilio Configuration

### Getting Twilio Credentials

1. Sign up at [console.twilio.com](https://console.twilio.com)
2. From Dashboard, copy:
   - Account SID
   - Auth Token (click "Show" to reveal)
3. Purchase a phone number from "Phone Numbers" → "Buy a Number"
4. Add credentials to `.env` file

### Testing Without Twilio

Set `MOCK_MODE=True` in `.env` to simulate SMS sending without actual Twilio API calls.

## Data Flow

### Workflow A: Real-time Monitoring
```
Synthetic Generator → WebSocket → React Charts
→ Threshold Detection → Twilio SMS → Notification History
```

### Workflow B: ML Prediction
```
User Input → API → Preprocessing Pipeline → Isolation Forest
→ Anomaly Score → Rule-Based Classification → Result Display
```

## Troubleshooting

### Backend won't start
- Check Python version (3.11+)
- Ensure all dependencies installed: `pip install -r requirements.txt`
- Verify `.env` file exists and is configured
- Check if port 8000 is available

### Frontend won't load
- Check Node.js version (18+)
- Ensure dependencies installed: `npm install`
- Verify backend is running on port 8000
- Check browser console for errors

### ML model not loading
- Ensure `train_model.py` was run successfully
- Check `trained_models/` directory exists
- Verify model files are present:
  - `model.joblib`
  - `preprocessing_pipeline.joblib`
  - `model_metadata.json`

### WebSocket connection fails
- Ensure backend is running
- Check firewall settings
- Verify WebSocket URL: `ws://localhost:8000/ws/monitor/{patient_id}`

### Twilio SMS not sending
- Verify credentials in `.env`
- Check `MOCK_MODE` is set to `False`
- Ensure phone number is in E.164 format
- Check Twilio account has SMS capability
- Verify Twilio phone number is active

## Development

### Adding New Features

1. **Backend**: Add new router in `app/routers/`, include in `main.py`
2. **Frontend**: Add new page in `src/pages/`, add route in `App.jsx`
3. **ML**: Update `ml/train_model.py` and retrain model
4. **Database**: Add model in `app/models/`, run app to auto-create table

### Running Tests

```bash
# Backend tests (if implemented)
cd backend
pytest

# Frontend tests (if implemented)
cd frontend
npm test
```

## Academic Project Notes

This is an academic demonstration project. Important considerations:

1. **Dataset Limitations**: Original data has no health status labels
2. **ML Approach**: Anomaly detection (unsupervised) due to lack of labels
3. **Synthetic Data**: Used for demonstration, clearly labeled as such
4. **Rule-Based**: Emergency thresholds based on medical literature
5. **Production Use**: Requires labeled data and clinical validation

## License

This project is for academic purposes.

## Support

For issues or questions, refer to:
- Dataset inspection report: `reports/dataset_inspection_report.md`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
- API documentation: `http://localhost:8000/docs` (when backend is running)
