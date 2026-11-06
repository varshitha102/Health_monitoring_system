import random
import time
from datetime import datetime, timedelta
from typing import Generator, Dict, Any
import asyncio


class SyntheticScenarioGenerator:
    """Generate synthetic patient health readings for demonstration."""

    def __init__(self):
        self.scenarios = {
            'NORMAL': {
                'temperature_range': (36.2, 37.2),
                'heart_rate_range': (65, 85),
                'spo2_range': (96, 99),
                'target_duration': 60
            },
            'WARNING': {
                'temperature_range': (37.8, 38.4),
                'heart_rate_range': (95, 115),
                'spo2_range': (91, 94),
                'target_duration': 60
            },
            'CRITICAL': {
                'temperature_range': (38.8, 40.0),
                'heart_rate_range': (125, 145),
                'spo2_range': (82, 89),
                'target_duration': 60
            }
        }

    def generate_reading(
        self,
        patient_id: str,
        patient_name: str,
        scenario_type: str,
        current_step: int,
        total_steps: int,
        transition_factor: float = 0.0
    ) -> Dict[str, Any]:
        """
        Generate a single synthetic health reading.

        Args:
            patient_id: Patient identifier
            patient_name: Patient's actual name
            scenario_type: NORMAL, WARNING, or CRITICAL
            current_step: Current step in sequence
            total_steps: Total steps in sequence
            transition_factor: 0.0 to 1.0, how far into transition

        Returns:
            Dictionary with health readings
        """
        scenario = self.scenarios[scenario_type]

        # Base normal values for transition
        normal_temp = 36.8
        normal_hr = 75
        normal_spo2 = 98

        # Target values based on scenario
        target_temp = random.uniform(*scenario['temperature_range'])
        target_hr = random.uniform(*scenario['heart_rate_range'])
        target_spo2 = random.uniform(*scenario['spo2_range'])

        # Apply transition (gradual change from normal to target)
        if transition_factor > 0:
            temp = normal_temp + (target_temp - normal_temp) * transition_factor
            hr = normal_hr + (target_hr - normal_hr) * transition_factor
            spo2 = normal_spo2 + (target_spo2 - normal_spo2) * transition_factor
        else:
            temp = target_temp
            hr = target_hr
            spo2 = target_spo2

        # Add small random variation
        temp += random.uniform(-0.2, 0.2)
        hr += random.uniform(-3, 3)
        spo2 += random.uniform(-1, 1)

        # Clamp to reasonable ranges
        temp = max(35.0, min(42.0, temp))
        hr = max(40, min(180, hr))
        spo2 = max(70, min(100, spo2))

        # Determine health status based on rule-based thresholds
        health_status = self._classify_health_status(temp, hr, spo2)

        # Generate age (for ML prediction)
        age = random.randint(25, 75)

        # Generate steps
        steps = random.randint(0, 500)

        return {
            'patient_id': patient_id,
            'patient_name': patient_name,
            'timestamp': datetime.now().isoformat(),
            'temperature': round(temp, 1),
            'heart_rate': round(hr),
            'spo2': round(spo2, 1),
            'steps': steps,
            'age': age,
            'health_status': health_status,
            'scenario_type': scenario_type,
            'data_source': 'SYNTHETIC_SIMULATION',
            'step': current_step,
            'total_steps': total_steps
        }

    def _classify_health_status(self, temp: float, hr: int, spo2: float) -> str:
        """Classify health status using rule-based thresholds."""
        # Critical conditions
        if temp >= 39.0 or hr >= 130 or spo2 <= 89:
            return 'CRITICAL'

        # Warning conditions
        if (temp >= 37.6 or hr >= 101 or spo2 <= 94):
            return 'WARNING'

        return 'NORMAL'

    async def generate_stream(
        self,
        patient_id: str,
        patient_name: str,
        scenario_type: str,
        total_steps: int = 60,
        interval: float = 1.0,
        enable_transition: bool = True
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Generate a stream of synthetic readings.

        Args:
            patient_id: Patient identifier
            patient_name: Patient's actual name
            scenario_type: NORMAL, WARNING, or CRITICAL
            total_steps: Number of readings to generate
            interval: Seconds between readings
            enable_transition: Whether to gradually transition from normal

        Yields:
            Synthetic health readings
        """
        for step in range(total_steps):
            # Calculate transition factor (gradual transition from normal)
            if enable_transition and scenario_type != 'NORMAL':
                transition_factor = min(1.0, step / 10.0)  # Transition over first 10 steps
            else:
                transition_factor = 0.0

            reading = self.generate_reading(
                patient_id=patient_id,
                patient_name=patient_name,
                scenario_type=scenario_type,
                current_step=step,
                total_steps=total_steps,
                transition_factor=transition_factor
            )

            yield reading

            # Wait before next reading
            await asyncio.sleep(interval)


# Singleton instance
synthetic_generator = SyntheticScenarioGenerator()
