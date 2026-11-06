import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from ml.train_model import classify_health_status


class PredictionService:
    """Service for ML-based health predictions."""

    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.metadata = None
        self.model_loaded = False

    def load_model(self):
        """Load trained model and preprocessing pipeline."""
        try:
            # Load model - use absolute path from backend directory
            import os
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            model_path = os.path.join(backend_dir, 'ml', 'trained_models', 'model.joblib')
            pipeline_path = os.path.join(backend_dir, 'ml', 'trained_models', 'preprocessing_pipeline.joblib')
            metadata_path = os.path.join(backend_dir, 'ml', 'trained_models', 'model_metadata.json')

            self.model = joblib.load(model_path)

            # Load preprocessing pipeline
            pipeline_data = joblib.load(pipeline_path)
            self.preprocessor = pipeline_data['preprocessor']
            self.feature_names = pipeline_data['feature_names']

            # Load metadata
            import json
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)

            self.model_loaded = True
            print("ML model loaded successfully")
            return True

        except Exception as e:
            print(f"Failed to load ML model: {e}")
            self.model_loaded = False
            return False

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate prediction for patient health data.

        Args:
            features: Dictionary with patient features

        Returns:
            Prediction result with status and anomaly score
        """
        if not self.model_loaded:
            self.load_model()

        if not self.model_loaded:
            # Fallback to rule-based classification
            return self._rule_based_prediction(features)

        # Prepare features in correct order
        feature_values = [
            features.get('heart_rate_bpm'),
            features.get('spo2_pct'),
            features.get('skin_temp_c'),
            features.get('steps'),
            features.get('age')
        ]

        # Create DataFrame for preprocessing
        df = pd.DataFrame([feature_values], columns=self.feature_names)

        # Transform features
        try:
            features_transformed = self.preprocessor.transform(df)

            # Predict anomaly
            prediction = self.model.predict(features_transformed)[0]
            anomaly_score = self.model.score_samples(features_transformed)[0]

            # Convert prediction (1=normal, -1=anomaly)
            is_anomaly = 1 if prediction == -1 else 0

            # Rule-based classification for status
            status = self._rule_based_classification(features)

            return {
                'predicted_status': status,
                'anomaly_score': float(anomaly_score),
                'is_anomaly': is_anomaly,
                'model_version': self.metadata.get('model_type', 'IsolationForest'),
                'ml_available': True
            }

        except Exception as e:
            print(f"ML prediction failed: {e}")
            return self._rule_based_prediction(features)

    def _rule_based_prediction(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback to rule-based classification."""
        status = self._rule_based_classification(features)

        return {
            'predicted_status': status,
            'anomaly_score': None,
            'is_anomaly': None,
            'model_version': 'Rule-Based',
            'ml_available': False
        }

    def _rule_based_classification(self, features: Dict[str, Any]) -> str:
        """Classify using rule-based thresholds."""
        # Use temperature, heart rate, spo2 for classification
        # Use defaults if missing
        temp = features.get('temperature', features.get('skin_temp_c', 36.5))
        hr = features.get('heart_rate_bpm', 75)
        spo2 = features.get('spo2_pct', 98)

        return classify_health_status(temp, hr, spo2)

    def get_model_info(self) -> Dict[str, Any]:
        """Get model metadata."""
        if not self.model_loaded:
            self.load_model()

        if self.metadata:
            return {
                'model_type': self.metadata.get('model_type'),
                'contamination': self.metadata.get('contamination'),
                'training_date': self.metadata.get('training_date'),
                'n_train_samples': self.metadata.get('n_train_samples'),
                'n_test_samples': self.metadata.get('n_test_samples'),
                'features': self.metadata.get('features'),
                'contamination_actual': self.metadata.get('contamination_actual'),
                'model_loaded': self.model_loaded
            }
        else:
            return {
                'model_loaded': False,
                'error': 'Model not loaded'
            }


# Singleton instance
prediction_service = PredictionService()
