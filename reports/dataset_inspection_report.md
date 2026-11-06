# Dataset Inspection Report

## Executive Summary

The project root contains three CSV files from a smartwatch wearable telemetry dataset:

1. **participants.csv** - 24 participants with demographic and device information
2. **readings.csv** - 960 physiological readings (heart rate, SpO2, skin temperature, steps)
3. **sleep_segments.csv** - Sleep stage data (not used for health monitoring prediction)

---

## File 1: participants.csv

### Dimensions
- **Rows**: 24
- **Columns**: 8

### Columns
| Column | Data Type | Description | Missing Values |
|--------|-----------|-------------|----------------|
| id | int64 | Unique participant identifier | 0 |
| study_code | object | Study identifier (e.g., WT-1228) | 0 |
| birth_year | int64 | Year of birth (age calculation) | 0 |
| watch_model | object | Smartwatch model (Stride S, Pulse 3, etc.) | 0 |
| firmware | object | Device firmware version | 0 |
| wrist | object | Wrist worn (left/right) | 0 |
| fitted_at | object | Device fitting timestamp | 0 |
| bedtime_at | object | Bedtime timestamp | 0 |

### Observations
- 24 unique participants
- Birth years range from 1952 to 2002 (ages ~24-73 in 2025)
- Multiple watch models: Stride S, Stride S2, Pulse 3, Pulse 3 Pro
- No missing values
- Can derive age from birth_year

---

## File 2: readings.csv (PRIMARY DATASET FOR ML)

### Dimensions
- **Rows**: 960
- **Columns**: 7

### Columns
| Column | Data Type | Description | Missing Values | Range |
|--------|-----------|-------------|----------------|-------|
| id | int64 | Unique reading identifier | 0 | 1-960 |
| participant_id | int64 | Foreign key to participants | 0 | 1-24 |
| slot_start | object | Timestamp of reading slot | 0 | - |
| heart_rate_bpm | float64 | Heart rate in beats per minute | 27 (2.8%) | 62-80 BPM |
| spo2_pct | float64 | Blood oxygen saturation percentage | 88 (9.2%) | 94.8-97.5% |
| skin_temp_c | float64 | Skin temperature in Celsius | 37 (3.9%) | 31.91-34.85°C |
| steps | int64 | Step count in slot | 0 | 0-2398 |

### Statistical Summary

**Heart Rate (BPM)**
- Range: 62-80 BPM
- Mean: ~71 BPM
- Missing: 27 values (2.8%)

**SpO2 (%)**
- Range: 94.8-97.5%
- Mean: ~96%
- Missing: 88 values (9.2%)

**Skin Temperature (°C)**
- Range: 31.91-34.85°C
- Mean: ~33.3°C
- Missing: 37 values (3.9%)

**Steps**
- Range: 0-2398
- Mean: ~778 steps
- Missing: 0 values

### Important Observations

#### 1. NO EXPLICIT HEALTH STATUS LABEL
**CRITICAL FINDING**: The readings.csv dataset does **NOT** contain a target/label column indicating:
- Normal vs. Abnormal health status
- Warning vs. Critical conditions
- Health risk categories
- Any form of diagnostic label

#### 2. Data Characteristics
- All physiological readings appear to be within **normal healthy ranges**
- Heart rate (62-80 BPM) is normal for adults
- SpO2 (94.8-97.5%) is normal
- Skin temperature (31.9-34.8°C) is normal for skin (not core body temperature)
- This is **sleep monitoring data**, not emergency health monitoring data

#### 3. Missing Values
- Missing values are relatively low (max 9.2% for SpO2)
- Can be handled with imputation or removal

#### 4. Time Structure
- Readings are timestamped (slot_start)
- 30-minute intervals appear to be used
- Data is time-series in nature

#### 5. Participant Distribution
- 24 participants
- ~40 readings per participant on average
- Sufficient for a demonstration model

---

## File 3: sleep_segments.csv

### Dimensions
- **Rows**: Multiple sleep segments
- **Columns**: 5

### Columns
| Column | Description |
|--------|-------------|
| id | Unique segment identifier |
| participant_id | Foreign key to participants |
| segment_no | Segment number for participant |
| started_at | Segment start timestamp |
| stage | Sleep stage (deep, rem, light, awake) |
| confidence | Model confidence score |

### Observations
- Contains sleep stage labels (deep, rem, light, awake)
- **NOT** suitable for health emergency prediction
- Could be used for sleep quality analysis (out of scope)

---

## TARGET COLUMN ANALYSIS

### Problem
The **readings.csv** dataset has **NO explicit health status label**.

Available columns:
- ✅ heart_rate_bpm (physiological measurement)
- ✅ spo2_pct (physiological measurement)
- ✅ skin_temp_c (physiological measurement)
- ✅ steps (activity measurement)
- ❌ health_status (MISSING)
- ❌ risk_level (MISSING)
- ❌ condition (MISSING)

### Implications for Supervised Learning

**Traditional supervised learning requires a target variable.**

Without labeled data indicating "this reading is normal/warning/critical", we cannot:
- Train a classifier to predict health status
- Learn decision boundaries for emergency detection
- Validate model accuracy against ground truth

---

## PROPOSED APPROACH

### Option A: Create Synthetic Labels (NOT RECOMMENDED)
- Define thresholds for WARNING/CRITICAL based on medical literature
- Label the existing readings as NORMAL (since they're all in healthy range)
- **Problem**: This would fabricate labels and not represent real patient conditions

### Option B: Use Anomaly Detection (RECOMMENDED)
- Train an anomaly detection model (e.g., Isolation Forest, One-Class SVM)
- Learn "normal" patterns from the healthy dataset
- Flag deviations as potential anomalies
- **Advantage**: Doesn't require labeled data
- **Limitation**: Cannot distinguish between WARNING and CRITICAL specifically

### Option C: Define Rule-Based Thresholds (RECOMMENDED FOR DEMONSTRATION)
- Use medically established thresholds for temperature, heart rate, SpO2
- Implement rule-based classification:
  - NORMAL: All values within healthy ranges
  - WARNING: One or more values moderately abnormal
  - CRITICAL: One or more values severely abnormal
- **Advantage**: Clear, explainable, clinically grounded
- **Limitation**: Not "learned" from data, but rules applied to data

### Option D: Hybrid Approach (SELECTED FOR THIS PROJECT)

**ML Model**: Train an anomaly detection model on the healthy readings dataset
- Learn normal physiological patterns
- Detect deviations from normal

**Rule-Based Thresholds**: Apply for the emergency alert system
- WARNING/Critical classification based on medical thresholds
- Used for Twilio SMS triggers

**Synthetic Scenario Generator**: Generate WARNING/CRITICAL scenarios
- Demonstrate the system's response to abnormal conditions
- Not used for ML training

---

## FEATURE SELECTION FOR ML MODEL

### Input Features (Available)
1. **heart_rate_bpm** - Heart rate (numerical)
2. **spo2_pct** - Blood oxygen saturation (numerical)
3. **skin_temp_c** - Skin temperature (numerical)
4. **steps** - Physical activity (numerical)

### Features from Participants Table (via join)
5. **age** - Derived from birth_year (numerical)
6. **watch_model** - Device type (categorical - optional)
7. **wrist** - Worn wrist (categorical - optional)

### Excluded Features
- id, participant_id - Identifiers (not predictive)
- slot_start - Timestamp (unless doing time-series)
- study_code, firmware - Not health-relevant
- fitted_at, bedtime_at - Not health-relevant

### Selected Features for ML Model
```
1. heart_rate_bpm
2. spo2_pct
3. skin_temp_c
4. steps
5. age (derived from birth_year)
```

---

## DATA PREPROCESSING PLAN

### 1. Join participants and readings
- Merge on participant_id
- Calculate age from birth_year

### 2. Handle missing values
- Impute heart_rate_bpm with participant mean
- Impute spo2_pct with participant mean
- Impute skin_temp_c with participant mean
- Or use KNN imputation

### 3. Feature scaling
- StandardScaler for numerical features
- Normalize to zero mean, unit variance

### 4. Train/test split
- **IMPORTANT**: Participant-level split to prevent data leakage
- Use ~80% of participants for training
- Use ~20% of participants for testing
- Do NOT split randomly across readings

### 5. Preprocessing pipeline
- Imputation
- Scaling
- Save as sklearn Pipeline

---

## PROPOSED ML MODEL

### Model Type: Isolation Forest (Anomaly Detection)

**Rationale**:
- Does not require labeled data
- Effective for detecting outliers in high-dimensional data
- Well-suited for health monitoring where "normal" is well-represented

**Alternative**: One-Class SVM, Local Outlier Factor

### Evaluation Metrics
Since this is anomaly detection:
- Reconstruction error or anomaly score
- Manual inspection of flagged anomalies
- Compare flagged anomalies against rule-based thresholds

---

## LIMITATIONS AND TRANSPARENCY

### Important Notes for Academic Project

1. **The dataset contains only healthy readings**
   - No WARNING or CRITICAL examples in the original data
   - Cannot train a supervised classifier for health status prediction

2. **ML model will be anomaly detection, not classification**
   - Detects deviations from normal patterns
   - Does not predict specific health conditions

3. **Synthetic scenarios are for demonstration only**
   - Generated independently of the training dataset
   - Not used to validate model accuracy
   - Clearly labeled as SYNTHETIC_SIMULATION

4. **Rule-based thresholds for emergency alerts**
   - Based on medical literature, not learned from data
   - Used for Twilio SMS triggering
   - Transparent about this in the application

---

## RECOMMENDATION

For this academic project, implement:

1. **Anomaly Detection Model** trained on the healthy readings
   - Detect abnormal patterns in real-time data
   - Provide anomaly scores as supplementary information

2. **Rule-Based Classification** for emergency alerts
   - Define WARNING/CRITICAL thresholds
   - Use for Twilio SMS triggers
   - Clearly document these are rule-based, not ML-learned

3. **Synthetic Scenario Generator**
   - Generate WARNING/CRITICAL examples for demonstration
   - Show how the system responds to emergencies
   - Never claim synthetic data validates the ML model

4. **Clear Documentation**
   - Explain the dataset limitations
   - Be transparent about rule-based vs. ML-based decisions
   - Distinguish between anomaly detection and classification

---

## CONCLUSION

The dataset provides excellent physiological measurements but lacks health status labels. The appropriate approach is:

- **ML**: Anomaly detection on healthy data
- **Alerts**: Rule-based thresholds
- **Demo**: Synthetic scenarios for testing UI and Twilio integration

This is a common real-world scenario where labeled emergency data is scarce, and systems must combine learned patterns with domain expertise.
