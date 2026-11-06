import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import json
import os
from datetime import datetime
from .preprocessing import DataPreprocessor


class AnomalyDetectionModel:
    """Train Isolation Forest for health anomaly detection."""

    def __init__(self, contamination=0.1, random_state=42):
        """
        Initialize anomaly detection model.

        Args:
            contamination: Expected proportion of outliers in dataset
            random_state: Random seed
        """
        self.contamination = contamination
        self.random_state = random_state
        self.model = None
        self.preprocessor = DataPreprocessor()
        self.training_metadata = {}

    def train(self, readings_path, participants_path):
        """
        Train anomaly detection model on healthy readings.

        Args:
            readings_path: Path to readings CSV
            participants_path: Path to participants CSV

        Returns:
            Training results
        """
        print("=" * 60)
        print("TRAINING ANOMALY DETECTION MODEL")
        print("=" * 60)

        # Load and preprocess data
        print("\n1. Loading and merging data...")
        df = self.preprocessor.load_and_merge_data(readings_path, participants_path)
        print(f"   Merged data shape: {df.shape}")

        # Split data by participant
        print("\n2. Splitting data by participant...")
        X_train, X_test, train_df, test_df = self.preprocessor.split_data(df)

        # Fit preprocessing pipeline
        print("\n3. Fitting preprocessing pipeline...")
        X_train_transformed = self.preprocessor.fit_transform(X_train)
        print(f"   Transformed training data shape: {X_train_transformed.shape}")

        # Train Isolation Forest
        print("\n4. Training Isolation Forest...")
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100,
            max_samples='auto'
        )

        self.model.fit(X_train_transformed)
        print("   Model trained successfully")

        # Evaluate on training data
        print("\n5. Evaluating on training data...")
        train_predictions = self.model.predict(X_train_transformed)
        train_anomaly_scores = self.model.score_samples(X_train_transformed)

        # Count predictions (1 = normal, -1 = anomaly)
        normal_count = np.sum(train_predictions == 1)
        anomaly_count = np.sum(train_predictions == -1)

        print(f"   Normal samples: {normal_count} ({normal_count/len(train_predictions)*100:.1f}%)")
        print(f"   Anomaly samples: {anomaly_count} ({anomaly_count/len(train_predictions)*100:.1f}%)")

        # Evaluate on test data
        print("\n6. Evaluating on test data...")
        X_test_transformed = self.preprocessor.transform(X_test)
        test_predictions = self.model.predict(X_test_transformed)
        test_anomaly_scores = self.model.score_samples(X_test_transformed)

        test_normal_count = np.sum(test_predictions == 1)
        test_anomaly_count = np.sum(test_predictions == -1)

        print(f"   Normal samples: {test_normal_count} ({test_normal_count/len(test_predictions)*100:.1f}%)")
        print(f"   Anomaly samples: {test_anomaly_count} ({test_anomaly_count/len(test_predictions)*100:.1f}%)")

        # Save metadata
        self.training_metadata = {
            'model_type': 'IsolationForest',
            'contamination': self.contamination,
            'random_state': self.random_state,
            'training_date': datetime.now().isoformat(),
            'n_train_samples': len(X_train),
            'n_test_samples': len(X_test),
            'n_train_participants': train_df['participant_id'].nunique(),
            'n_test_participants': test_df['participant_id'].nunique(),
            'features': self.preprocessor.numerical_features,
            'train_normal_count': int(normal_count),
            'train_anomaly_count': int(anomaly_count),
            'test_normal_count': int(test_normal_count),
            'test_anomaly_count': int(test_anomaly_count),
            'contamination_actual': anomaly_count / len(train_predictions)
        }

        return {
            'train_predictions': train_predictions,
            'train_scores': train_anomaly_scores,
            'test_predictions': test_predictions,
            'test_scores': test_anomaly_scores,
            'metadata': self.training_metadata
        }

    def save_model(self, model_path='trained_models/model.joblib', metadata_path='trained_models/model_metadata.json'):
        """
        Save trained model and metadata.

        Args:
            model_path: Path to save model
            metadata_path: Path to save metadata
        """
        os.makedirs(os.path.dirname(model_path), exist_ok=True)

        # Save model
        joblib.dump(self.model, model_path)
        print(f"\nModel saved to {model_path}")

        # Save metadata
        with open(metadata_path, 'w') as f:
            json.dump(self.training_metadata, f, indent=2)
        print(f"Metadata saved to {metadata_path}")

        # Save preprocessing pipeline
        self.preprocessor.save_pipeline()

    def load_model(self, model_path='trained_models/model.joblib', metadata_path='trained_models/model_metadata.json'):
        """
        Load trained model and metadata.

        Args:
            model_path: Path to load model from
            metadata_path: Path to load metadata from
        """
        self.model = joblib.load(model_path)
        print(f"Model loaded from {model_path}")

        with open(metadata_path, 'r') as f:
            self.training_metadata = json.load(f)
        print(f"Metadata loaded from {metadata_path}")

        # Load preprocessing pipeline
        self.preprocessor.load_pipeline()

        return self.model, self.training_metadata

    def predict(self, features):
        """
        Predict anomaly score for new data.

        Args:
            features: Input features (DataFrame or array)

        Returns:
            prediction (1=normal, -1=anomaly), anomaly_score
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")

        # Transform features
        features_transformed = self.preprocessor.transform(features)

        # Predict
        prediction = self.model.predict(features_transformed)
        anomaly_score = self.model.score_samples(features_transformed)

        return prediction, anomaly_score


def create_rule_based_thresholds():
    """
    Define rule-based thresholds for health status classification.

    Returns:
        Dictionary of thresholds
    """
    thresholds = {
        'temperature': {
            'normal_min': 36.0,
            'normal_max': 37.5,
            'warning_min': 37.6,
            'warning_max': 38.5,
            'critical_min': 38.6
        },
        'heart_rate': {
            'normal_min': 60,
            'normal_max': 90,
            'warning_low': 55,
            'warning_high': 110,
            'critical_low': 50,
            'critical_high': 120
        },
        'spo2': {
            'normal_min': 95,
            'normal_max': 100,
            'warning_min': 91,
            'warning_max': 94,
            'critical_min': 0,
            'critical_max': 90
        }
    }

    return thresholds


def classify_health_status(temperature, heart_rate, spo2, thresholds=None):
    """
    Classify health status based on rule-based thresholds.

    Args:
        temperature: Body temperature in Celsius
        heart_rate: Heart rate in BPM
        spo2: Blood oxygen saturation percentage
        thresholds: Threshold dictionary (uses defaults if None)

    Returns:
        Health status: 'NORMAL', 'WARNING', or 'CRITICAL'
    """
    if thresholds is None:
        thresholds = create_rule_based_thresholds()

    temp_thresholds = thresholds['temperature']
    hr_thresholds = thresholds['heart_rate']
    spo2_thresholds = thresholds['spo2']

    # Check for critical conditions
    is_critical = (
        temperature >= temp_thresholds['critical_min'] or
        heart_rate <= hr_thresholds['critical_low'] or
        heart_rate >= hr_thresholds['critical_high'] or
        spo2 <= spo2_thresholds['critical_max']
    )

    if is_critical:
        return 'CRITICAL'

    # Check for warning conditions
    is_warning = (
        (temperature >= temp_thresholds['warning_min'] and temperature <= temp_thresholds['warning_max']) or
        (heart_rate <= hr_thresholds['warning_low'] or heart_rate >= hr_thresholds['warning_high']) or
        (spo2 >= spo2_thresholds['warning_min'] and spo2 <= spo2_thresholds['warning_max'])
    )

    if is_warning:
        return 'WARNING'

    return 'NORMAL'


if __name__ == "__main__":
    # Train model
    model = AnomalyDetectionModel(contamination=0.05)

    readings_path = '../../smartwatch-wearable-telemetry-heart-rate-spo2-sleep-stages-v1-csv-readings.csv'
    participants_path = '../../smartwatch-wearable-telemetry-heart-rate-spo2-sleep-stages-v1-csv-participants.csv'

    results = model.train(readings_path, participants_path)

    # Save model
    model.save_model()

    # Test rule-based classification
    print("\n" + "=" * 60)
    print("TESTING RULE-BASED CLASSIFICATION")
    print("=" * 60)

    test_cases = [
        (36.5, 75, 98),  # Normal
        (38.0, 115, 92),  # Warning
        (39.5, 145, 85),  # Critical
    ]

    for temp, hr, spo2 in test_cases:
        status = classify_health_status(temp, hr, spo2)
        print(f"Temp: {temp}°C, HR: {hr} BPM, SpO2: {spo2}% -> {status}")

    print("\nTraining complete!")
