import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
import joblib
import os


class DataPreprocessor:
    """Preprocess health monitoring data for ML model training."""

    def __init__(self):
        self.numerical_features = ['heart_rate_bpm', 'spo2_pct', 'skin_temp_c', 'steps', 'age']
        self.categorical_features = []
        self.preprocessor = None
        self.feature_names = None

    def load_and_merge_data(self, readings_path, participants_path):
        """
        Load and merge readings with participants data.

        Args:
            readings_path: Path to readings CSV
            participants_path: Path to participants CSV

        Returns:
            Merged DataFrame with age derived from birth_year
        """
        # Load data
        readings_df = pd.read_csv(readings_path)
        participants_df = pd.read_csv(participants_path)

        # Calculate age from birth_year (assuming current year 2025)
        participants_df['age'] = 2025 - participants_df['birth_year']

        # Merge on participant_id
        merged_df = pd.merge(
            readings_df,
            participants_df[['id', 'age']],
            left_on='participant_id',
            right_on='id',
            how='left'
        )

        # Drop redundant id column from participants
        merged_df = merged_df.drop(columns=['id_y'])
        merged_df = merged_df.rename(columns={'id_x': 'id'})

        return merged_df

    def create_preprocessing_pipeline(self):
        """
        Create sklearn preprocessing pipeline.

        Returns:
            ColumnTransformer with imputation and scaling
        """
        # Numerical pipeline: impute missing values with median, then scale
        numerical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])

        # Column transformer
        self.preprocessor = ColumnTransformer(
            transformers=[
                ('num', numerical_transformer, self.numerical_features)
            ],
            remainder='drop'  # Drop other columns
        )

        return self.preprocessor

    def split_data(self, df, test_size=0.2, random_state=42):
        """
        Split data by participant (not random) to prevent data leakage.

        Args:
            df: Input DataFrame
            test_size: Proportion of participants for testing
            random_state: Random seed

        Returns:
            X_train, X_test, y_train, y_test (though y is not used for anomaly detection)
        """
        # Get unique participants
        unique_participants = df['participant_id'].unique()

        # Split participants
        train_participants, test_participants = train_test_split(
            unique_participants,
            test_size=test_size,
            random_state=random_state
        )

        # Split dataframes
        train_df = df[df['participant_id'].isin(train_participants)]
        test_df = df[df['participant_id'].isin(test_participants)]

        # Extract features
        X_train = train_df[self.numerical_features]
        X_test = test_df[self.numerical_features]

        print(f"Training samples: {len(X_train)} from {len(train_participants)} participants")
        print(f"Testing samples: {len(X_test)} from {len(test_participants)} participants")

        return X_train, X_test, train_df, test_df

    def fit_transform(self, X_train):
        """
        Fit preprocessing pipeline on training data and transform.

        Args:
            X_train: Training features

        Returns:
            Transformed training data
        """
        if self.preprocessor is None:
            self.create_preprocessing_pipeline()

        X_train_transformed = self.preprocessor.fit_transform(X_train)
        self.feature_names = self.numerical_features

        return X_train_transformed

    def transform(self, X):
        """
        Transform data using fitted preprocessing pipeline.

        Args:
            X: Features to transform

        Returns:
            Transformed features
        """
        if self.preprocessor is None:
            raise ValueError("Preprocessor not fitted. Call fit_transform first.")

        return self.preprocessor.transform(X)

    def save_pipeline(self, path='trained_models/preprocessing_pipeline.joblib'):
        """
        Save preprocessing pipeline to disk.

        Args:
            path: Path to save pipeline
        """
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({
            'preprocessor': self.preprocessor,
            'feature_names': self.feature_names,
            'numerical_features': self.numerical_features
        }, path)
        print(f"Preprocessing pipeline saved to {path}")

    def load_pipeline(self, path='trained_models/preprocessing_pipeline.joblib'):
        """
        Load preprocessing pipeline from disk.

        Args:
            path: Path to load pipeline from

        Returns:
            Loaded pipeline data
        """
        pipeline_data = joblib.load(path)
        self.preprocessor = pipeline_data['preprocessor']
        self.feature_names = pipeline_data['feature_names']
        self.numerical_features = pipeline_data['numerical_features']
        print(f"Preprocessing pipeline loaded from {path}")
        return pipeline_data


if __name__ == "__main__":
    # Test preprocessing
    preprocessor = DataPreprocessor()

    # Load data
    readings_path = '../../smartwatch-wearable-telemetry-heart-rate-spo2-sleep-stages-v1-csv-readings.csv'
    participants_path = '../../smartwatch-wearable-telemetry-heart-rate-spo2-sleep-stages-v1-csv-participants.csv'

    df = preprocessor.load_and_merge_data(readings_path, participants_path)
    print(f"Merged data shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")

    # Split data
    X_train, X_test, train_df, test_df = preprocessor.split_data(df)

    # Create and fit pipeline
    preprocessor.create_preprocessing_pipeline()
    X_train_transformed = preprocessor.fit_transform(X_train)
    print(f"Transformed training data shape: {X_train_transformed.shape}")

    # Transform test data
    X_test_transformed = preprocessor.transform(X_test)
    print(f"Transformed test data shape: {X_test_transformed.shape}")
