import { useState, useEffect, useRef } from 'react';

const usePatientLocation = (patientId) => {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
  });
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [isTracking, setIsTracking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);
  const sharingIntervalRef = useRef(null);

  // Restore tracking state from localStorage on mount
  useEffect(() => {
    const savedTrackingState = localStorage.getItem('locationTrackingState');
    if (savedTrackingState) {
      const state = JSON.parse(savedTrackingState);
      if (state.isTracking && state.patientId === patientId) {
        // Resume tracking automatically
        setIsTracking(true);
        startTracking();
      }
    }
  }, [patientId]);

  // Save tracking state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('locationTrackingState', JSON.stringify({
      isTracking,
      patientId,
      timestamp: new Date().toISOString()
    }));
  }, [isTracking, patientId]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Automatically start continuous tracking after getting current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
        setPermissionStatus('granted');
        setError(null);
        
        // Send to backend
        sendLocationToBackend(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
        
        // Automatically start continuous tracking (session-based)
        startTracking();
      },
      (err) => {
        setError(getErrorMessage(err));
        setPermissionStatus('denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    if (isTracking) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
        setPermissionStatus('granted');
        setError(null);
        setIsTracking(true);
        
        // Send to backend
        sendLocationToBackend(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      },
      (err) => {
        setError(getErrorMessage(err));
        setPermissionStatus('denied');
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      stopSharing(); // Also stop sharing if active
    }
  };

  const startLiveSharing = (patientName) => {
    if (!isTracking) {
      setError('Please start location tracking first');
      return;
    }

    if (isSharing) return;

    setIsSharing(true);
    
    // Send location updates to contacts every 30 seconds
    sharingIntervalRef.current = setInterval(() => {
      if (location.latitude && location.longitude) {
        sendLiveLocationToContacts(patientName);
      }
    }, 30000); // 30 seconds

    // Send initial location immediately
    if (location.latitude && location.longitude) {
      sendLiveLocationToContacts(patientName);
    }
  };

  const stopSharing = () => {
    if (sharingIntervalRef.current) {
      clearInterval(sharingIntervalRef.current);
      sharingIntervalRef.current = null;
      setIsSharing(false);
    }
  };

  const sendLocationToBackend = async (latitude, longitude, accuracy) => {
    try {
      const response = await fetch('http://localhost:8000/api/location/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId,
          latitude: latitude,
          longitude: longitude,
          accuracy: accuracy,
          source: 'BROWSER_GEOLOCATION',
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to send location to backend');
      }
    } catch (err) {
      console.error('Error sending location to backend:', err);
    }
  };

  const sendLiveLocationToContacts = async (patientName) => {
    try {
      const response = await fetch('http://localhost:8000/api/notifications/send-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId,
          patient_name: patientName,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to send live location to contacts');
      }
    } catch (err) {
      console.error('Error sending live location to contacts:', err);
    }
  };

  const getErrorMessage = (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location access in your browser settings.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable.';
      case error.TIMEOUT:
        return 'Location request timed out.';
      default:
        return 'An unknown error occurred while retrieving location.';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (sharingIntervalRef.current) {
        clearInterval(sharingIntervalRef.current);
      }
    };
  }, []);

  // Check permission status on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
      });
    }
  }, []);

  return {
    location,
    permissionStatus,
    isTracking,
    isSharing,
    error,
    getCurrentLocation,
    startTracking,
    stopTracking,
    startLiveSharing,
    stopSharing,
  };
};

export default usePatientLocation;
