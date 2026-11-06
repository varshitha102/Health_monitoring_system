# Real-Time Health Monitoring System - Page Documentation

## Table of Contents
1. [Overview](#overview)
2. [Page 1: Scenario Monitoring](#page-1-scenario-monitoring)
3. [Page 2: Emergency Management](#page-2-emergency-management)
4. [Page 3: Patient Prediction](#page-3-patient-prediction)
5. [Page 4: Settings](#page-4-settings)

---

## Overview

The Real-Time Health Monitoring System is a comprehensive healthcare monitoring application with four main pages:

- **Scenario Monitoring**: Real-time synthetic health data generation with live location tracking
- **Emergency Management**: Contact management and SMS notification history
- **Patient Prediction**: ML-based health prediction using trained models
- **Settings**: Patient profile configuration

---

## Page 1: Scenario Monitoring

**Path:** `/` (Home Page)

**Purpose:** Simulate real-time patient health monitoring with synthetic scenarios, visualize vital signs, and track patient location.

### UI Components:

#### 1. Patient Profile Bar (Top Section)
- **Patient Avatar**: Circular blue badge displaying the first letter of patient's name
- **Patient Name**: Displays the configured patient name (loaded from Settings)
- **Patient ID**: Shows the patient identifier (e.g., "P001")
- **Location Controls**:
  - **"Start Location Session" button** (Green): Initiates live location tracking and automatically starts continuous updates
  - **"Stop Location Session" button** (Red): Stops location tracking
  - **Location Permission Status**: Shows "Location denied" error if permission is not granted
  - **"Configure Profile" link**: Redirects to Settings page if patient name is not configured
- **Error Messages**: Displays location-related errors (e.g., permission denied, timeout)

#### 2. Scenario Selection Card
- **Three Scenario Buttons** (Grid Layout):
  - **Normal Patient** (Green): ✅ - All readings within healthy ranges
  - **Warning Patient** (Yellow): ⚠️ - Moderately elevated vital signs
  - **Critical Patient** (Red): 🚨 - Severely abnormal vital signs
- **Active Scenario Highlighting**: Selected scenario shows colored background and border
- **Progress Indicator**: Shows "Progress: X / 60" during streaming
- **Control Buttons** (visible during streaming):
  - **Pause button** (Red): Stops the WebSocket stream
  - **Reset button** (Gray): Clears all data and resets to initial state

#### 3. Real-Time Health Metrics Cards (3 Cards)
- **Body Temperature Card**:
  - Label: "Body Temperature"
  - Large value display: "XX.X°C"
  - Status badge: NORMAL (green), WARNING (yellow), or CRITICAL (red)
  - Color-coded left border based on health status
- **Heart Rate Card**:
  - Label: "Heart Rate"
  - Large value display: "XX BPM"
  - Status badge with color coding
  - Color-coded left border
- **SpO2 Card**:
  - Label: "SpO2"
  - Large value display: "XX%"
  - Status badge with color coding
  - Color-coded left border

#### 4. Real-Time Charts Section
- **Three Line Charts** (using Recharts):
  - **Temperature Chart**: Red line showing temperature over time
  - **Heart Rate Chart**: Blue line showing heart rate over time
  - **SpO2 Chart**: Green line showing oxygen saturation over time
- **Chart Features**:
  - X-axis: Time (local time format)
  - Y-axis: Vital sign values
  - Tooltips on hover
  - Grid lines for reference
  - Last 60 data points displayed

#### 5. Alert History Section
- **Alert Cards** (Yellow/Red background):
  - Alert level indicator (WARNING or CRITICAL)
  - Timestamp of alert
  - List of all alerts sent during current scenario
- **Conditional Display**: Only shows when alerts have been triggered

#### 6. Data Source Information
- **Blue Information Box**:
  - Data Source: SYNTHETIC_SIMULATION
  - Patient ID
  - Current Scenario type
- Note: Distinguishes synthetic data from real patient data

#### 7. Patient Location Map (Sidebar)
- **Interactive Leaflet Map**:
  - OpenStreetMap tiles
  - Patient location marker (blue pin)
  - Accuracy circle (blue semi-transparent circle)
  - Zoom and pan controls
  - Popup with coordinates on marker click
- **Location Details Grid**:
  - Latitude (6 decimal precision)
  - Longitude (6 decimal precision)
  - Accuracy (in meters)
  - Last Updated timestamp
- **Live Tracking Status**:
  - Green pulsing dot when tracking active
  - "Live Location Session Active" status
  - "Sending live location updates to backend" message
- **Live Sharing Status** (Purple section):
  - Purple pulsing dot when sharing active
  - "Live Sharing with Contacts Active" status
  - "Contacts receive location updates every 30 seconds" message
- **Action Buttons**:
  - **"Start Live Sharing" button** (Purple): Sends location to emergency contacts every 30 seconds
  - **"Stop Live Sharing" button** (Orange): Stops continuous location sharing
- **Map Links**:
  - "Open in Google Maps" button (Blue)
  - "Get Directions" button (Green)
- **Disclaimer Note**:
  - Yellow box explaining device location vs. patient physical location

#### 8. Empty State Message
- **Placeholder Message**: "Select a scenario above to begin real-time monitoring"
- Displayed when no scenario is active

### Functionality:
- WebSocket connection for real-time data streaming
- Automatic SMS alerts on WARNING/CRITICAL conditions (one per scenario)
- Persistent location tracking across page navigation
- Continuous location sharing with emergency contacts
- Real-time chart updates
- Progress tracking (60 steps per scenario)

---

## Page 2: Emergency Management

**Path:** `/emergency`

**Purpose:** Manage emergency contacts and view SMS notification history.

### UI Components:

#### 1. Page Header
- **Title**: "Emergency Contact Management"
- **Description**: "Configure emergency contacts for automated SMS notifications during health emergencies"

#### 2. Twilio Setup Guide (Yellow Info Box)
- **Title**: "Twilio SMS Delivery Setup"
- **Instructions** (Numbered list):
  1. Go to console.twilio.com
  2. Navigate to "Phone Numbers" → "Verified Caller IDs"
  3. Click "Add Verified Caller ID"
  4. Enter phone number (e.g., +919110542032033)
  5. Enter verification code
  6. SMS will be delivered after verification
- **Note**: Explains trial account restrictions and verification requirements

#### 3. Contact Manager Component
- **Add Contact Form**:
  - Name input field
  - Phone number input field (E.164 format validation)
  - "Add Contact" button (Blue)
- **Contact List**:
  - Contact cards with name and phone number
  - "Primary" badge for primary contact
  - Edit button (Pencil icon)
  - Delete button (Trash icon)
  - Checkbox for selection
- **No Contacts State**: Message when no contacts exist

#### 4. Notification History Component
- **Filter Options**:
  - Patient ID filter (optional)
  - Limit selector (default: 20)
- **Notification Cards**:
  - Alert level badge (WARNING/Yellow, CRITICAL/Red)
  - Delivery status badge (CREATING, SENDING, SENT, FAILED)
  - Patient ID
  - Recipient phone number (masked for privacy)
  - Message content preview
  - Twilio Message SID (if available)
  - Created timestamp
  - Updated timestamp
- **Location Information** (if available):
  - Blue box with location snapshot
  - Latitude and longitude
  - Accuracy
  - "Open in Google Maps" link
  - "Location unavailable" message if no location
- **Empty State**: Message when no notifications exist

### Functionality:
- Add, edit, and delete emergency contacts
- Set primary contact for alerts
- View complete SMS notification history
- Track delivery status of each message
- View location snapshots from emergency alerts
- Phone number validation (E.164 format)

---

## Page 3: Patient Prediction

**Path:** `/prediction`

**Purpose:** Use ML model to predict patient health status based on input vital signs.

### UI Components:

#### 1. Page Header
- **Title**: "Patient Health Prediction"
- **Description**: "ML-based health prediction using Isolation Forest anomaly detection"

#### 2. Model Information Card (Blue Info Box)
- **Title**: "Model Information"
- **Model Details Grid**:
  - Model Type (e.g., "IsolationForest")
  - Training Samples (number of records)
  - Features (number of input features)
  - Contamination (percentage of expected anomalies)
- **Conditional Display**: Only shows if model is loaded

#### 3. Patient Input Form
- **Form Fields** (2-column grid):
  - **Patient ID** (Required): Text input
  - **Age** (Required): Number input (25-75 range)
  - **Heart Rate (BPM)**: Number input (60-100 range)
  - **SpO2 (%)**: Number input (95-100 range)
  - **Skin Temperature (°C)**: Number input with decimal (33-35 range)
  - **Steps**: Number input (0-2000 range)
- **Auto-fill**: Patient ID and Age loaded from Settings
- **Submit Button**: "Generate Prediction" (Blue)
- **Error Message**: Red box showing validation or API errors

#### 4. Prediction Result Card
- **Color-coded Border**: Green (NORMAL), Yellow (WARNING), Red (CRITICAL)
- **Result Details Grid**:
  - Patient ID
  - Predicted Status (Large badge with color)
  - Anomaly Score (decimal, if available)
  - Is Anomaly (Yes/No, if available)
  - Model Version
  - Timestamp
- **Input Summary Section**:
  - Gray box showing all input values
  - HR, SpO2, Temp, Steps, Age displayed compactly

#### 5. Prediction History Table
- **Table Headers**:
  - Patient ID
  - Status (color-coded badge)
  - Anomaly (Yes/No)
  - Model (version)
  - Time (timestamp)
- **Table Rows**:
  - Scrollable list of recent predictions
  - Color-coded status badges
  - Formatted timestamps
- **Empty State**: "No predictions yet" message

### Functionality:
- ML-based health prediction using trained Isolation Forest model
- Input validation and preprocessing
- Real-time prediction results
- Anomaly detection scoring
- Prediction history tracking
- Model information display
- Auto-fill patient data from Settings

---

## Page 4: Settings

**Path:** `/settings`

**Purpose:** Configure patient profile and application preferences.

### UI Components:

#### 1. Page Header
- **Title**: "Settings"
- **Description**: "Configure your patient profile and preferences"

#### 2. Patient Profile Form
- **Success Message**: Green box "Settings saved successfully!" (auto-dismisses after 3 seconds)
- **Form Fields** (2-column grid):
  - **Patient ID**: Text input (default: P001)
  - **Full Name** (Required, highlighted with red asterisk): Text input with blue border
  - **Age**: Number input
  - **Email**: Email input type
  - **Phone Number**: Phone input type
- **Medical Notes**:
  - Textarea (3 rows)
  - Placeholder: "Any relevant medical information..."
- **Action Buttons**:
  - **Save Settings** (Blue): Saves to localStorage
  - **Reset to Default** (Gray): Clears all settings to defaults

#### 3. Information Box (Blue Info Box)
- **Title**: "Information"
- **Bullet Points**:
  - Patient Name is used in emergency SMS alerts to family members
  - Settings are saved locally in your browser
  - These settings will be used automatically in the Scenario Monitoring page
  - Age is used for ML predictions on the Patient Prediction page

### Functionality:
- Persistent patient profile storage (localStorage)
- Configuration used across all pages
- Auto-load on page visit
- Validation for required fields
- Reset to default option
- Integration with emergency SMS system

---

## Shared Components

### Navigation Bar
- **Logo/Title**: "Real-Time Health Monitoring System"
- **Navigation Links** (4 items):
  - 📊 Scenario Monitoring
  - 🚨 Emergency Management
  - 🔮 Patient Prediction
  - ⚙️ Settings
- **Active State**: Blue underline on current page
- **Hover Effects**: Gray underline on hover

### Footer
- **Project Name**: "Health Monitoring System - Academic Project"
- **Technology Stack**: "Isolation Forest Anomaly Detection + Rule-Based Classification + Twilio SMS"

---

## Data Flow Summary

1. **Settings Page**: Configures patient profile → Saved to localStorage
2. **Scenario Monitoring**: 
   - Loads patient settings
   - Streams synthetic health data via WebSocket
   - Tracks location and sends to backend
   - Triggers SMS alerts on emergency conditions
3. **Emergency Management**: 
   - Manages contacts in database
   - Stores notification history with location snapshots
4. **Patient Prediction**: 
   - Uses patient settings for auto-fill
   - Sends vital signs to ML model
   - Stores prediction results in database

---

## Technology Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Router
- Recharts (Charts)
- Leaflet + react-leaflet (Maps)
- Axios (API calls)

### Backend
- Python FastAPI
- SQLAlchemy + SQLite
- Twilio SDK (SMS)
- Scikit-learn (ML)
- WebSockets (Real-time)
- Pydantic (Validation)

---

## Notes

- All location tracking persists across page navigation using localStorage
- Emergency SMS includes Google Maps link with patient coordinates
- Synthetic scenario data is labeled separately from real patient data
- ML model is trained on original CSV dataset only
- Mock mode available for SMS testing without Twilio credentials
