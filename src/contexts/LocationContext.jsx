import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '../config';

const LocationContext = createContext(null);

const STORAGE_KEY = 'locationState';

const emptyLocation = {
  latitude: null,
  longitude: null,
  accuracy: null,
  timestamp: null,
};

const readSavedState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(emptyLocation);
  const [permissionStatus, setPermissionStatus] = useState(() =>
    typeof navigator !== 'undefined' && navigator.permissions ? 'prompt' : 'unsupported',
  );
  const [isTracking, setIsTracking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const watchIdRef = useRef(null);
  const sharingIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  // Refs mirror state so async callbacks / intervals never read a stale closure.
  const locationRef = useRef(emptyLocation);
  const patientIdRef = useRef(null);
  const isTrackingRef = useRef(false);
  const isSharingRef = useRef(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);
  useEffect(() => {
    patientIdRef.current = patientId;
  }, [patientId]);
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);
  useEffect(() => {
    isSharingRef.current = isSharing;
  }, [isSharing]);

  const getErrorMessage = (err) => {
    switch (err?.code) {
      case 1:
        return 'Location permission denied. Please enable location access in your browser settings.';
      case 2:
        return 'Location information is unavailable. Check that GPS/location services are on.';
      case 3:
        return 'Location request timed out. Try again in an area with better signal.';
      default:
        return 'An unknown error occurred while retrieving location.';
    }
  };

  const sendLocationToBackend = useCallback(async (latitude, longitude, accuracy, id) => {
    const effectiveId = id ?? patientIdRef.current;
    if (!effectiveId) return; // nothing to attach the fix to yet
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.locationUpdate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: effectiveId,
          latitude,
          longitude,
          accuracy,
          source: 'BROWSER_GEOLOCATION',
        }),
      });
      if (response.ok && mountedRef.current) setLastSync(new Date().toISOString());
    } catch (err) {
      // The backend being down must never break the tracker UI.
      console.warn('[location] could not sync with backend:', err?.message);
    }
  }, []);

  const sendLiveLocationToContacts = useCallback(async (name) => {
    const { latitude, longitude, accuracy } = locationRef.current;
    if (latitude == null || longitude == null) return;
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.sendLocation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientIdRef.current,
          patient_name: name,
          latitude,
          longitude,
          accuracy,
        }),
      });
      if (!response.ok) console.warn('[location] live-share rejected by backend');
    } catch (err) {
      console.warn('[location] could not send live location:', err?.message);
    }
  }, []);

  const stopSharing = useCallback(() => {
    if (sharingIntervalRef.current) {
      clearInterval(sharingIntervalRef.current);
      sharingIntervalRef.current = null;
    }
    isSharingRef.current = false;
    setIsSharing(false);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    isTrackingRef.current = false;
    setIsTracking(false);
    stopSharing();
  }, [stopSharing]);

  const startTracking = useCallback(
    (id) => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        return;
      }
      // Guard against double watches (the old code could start two by calling this twice).
      if (watchIdRef.current != null) return;

      const effectiveId = id ?? patientIdRef.current;
      if (effectiveId) {
        patientIdRef.current = effectiveId;
        setPatientId(effectiveId);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          locationRef.current = next;
          if (!mountedRef.current) return;
          setLocation(next);
          setPermissionStatus('granted');
          setError(null);
          isTrackingRef.current = true;
          setIsTracking(true);
          sendLocationToBackend(next.latitude, next.longitude, next.accuracy, effectiveId);
        },
        (err) => {
          if (!mountedRef.current) return;
          setError(getErrorMessage(err));
          setPermissionStatus('denied');
          stopTracking();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    },
    [sendLocationToBackend, stopTracking],
  );

  const startLiveSharing = useCallback(
    (name) => {
      if (isSharingRef.current) return;
      if (!isTrackingRef.current) {
        setError('Please start location tracking first');
        return;
      }
      if (!name || !name.trim()) {
        setError('Please configure a patient name before starting live sharing');
        return;
      }

      setPatientName(name);
      setError(null);
      isSharingRef.current = true;
      setIsSharing(true);

      // Send immediately, then every 30s. Reads locationRef so coordinates stay fresh.
      sendLiveLocationToContacts(name);
      sharingIntervalRef.current = setInterval(() => sendLiveLocationToContacts(name), 30000);
    },
    [sendLiveLocationToContacts],
  );

  const getCurrentLocation = useCallback(
    (id) => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        return;
      }
      const effectiveId = id ?? patientIdRef.current;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          locationRef.current = next;
          if (!mountedRef.current) return;
          setLocation(next);
          setPermissionStatus('granted');
          setError(null);
          sendLocationToBackend(next.latitude, next.longitude, next.accuracy, effectiveId);
          // Continue with continuous tracking.
          startTracking(effectiveId);
        },
        (err) => {
          if (!mountedRef.current) return;
          setError(getErrorMessage(err));
          setPermissionStatus('denied');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    },
    [sendLocationToBackend, startTracking],
  );

  // Permission state
  useEffect(() => {
    if (!navigator.permissions?.query) {
      setPermissionStatus(navigator.geolocation ? 'prompt' : 'unsupported');
      return;
    }
    let cancelled = false;
    let statusObj = null;
    const onChange = () => {
      if (!cancelled) setPermissionStatus(statusObj.state);
    };
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (cancelled) return;
        statusObj = result;
        setPermissionStatus(result.state);
        result.addEventListener?.('change', onChange);
      })
      .catch(() => {
        if (!cancelled) setPermissionStatus('prompt');
      });
    return () => {
      cancelled = true;
      statusObj?.removeEventListener?.('change', onChange);
    };
  }, []);

  // Restore last session once. IMPORTANT: the previous version persisted state in an
  // effect that ran *after* the restore effect and immediately overwrote the saved
  // values with the initial (false) state, so tracking never resumed.
  useEffect(() => {
    const saved = readSavedState();
    if (saved) {
      if (saved.patientId) {
        patientIdRef.current = saved.patientId;
        setPatientId(saved.patientId);
      }
      if (saved.patientName) setPatientName(saved.patientName);

      if (saved.isTracking && saved.patientId) {
        startTracking(saved.patientId);
      }
      if (saved.isSharing && saved.patientName) {
        // Sharing depends on tracking; start it once a first fix arrives.
        const timer = setTimeout(() => {
          if (isTrackingRef.current) startLiveSharing(saved.patientName);
        }, 1500);
        setTimeout(() => clearTimeout(timer), 1500);
      }
    }
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist only after hydration so we never clobber the restored snapshot.
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isTracking,
          isSharing,
          patientId,
          patientName,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch {
      /* storage full / private mode */
    }
  }, [isTracking, isSharing, patientId, patientName]);

  // Full cleanup on unmount (the old provider leaked the watch and the interval).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (sharingIntervalRef.current) {
        clearInterval(sharingIntervalRef.current);
        sharingIntervalRef.current = null;
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      location,
      permissionStatus,
      isTracking,
      isSharing,
      patientId,
      patientName,
      error,
      lastSync,
      getCurrentLocation,
      startTracking,
      stopTracking,
      startLiveSharing,
      stopSharing,
      setPatientId,
      setPatientName,
    }),
    [
      location,
      permissionStatus,
      isTracking,
      isSharing,
      patientId,
      patientName,
      error,
      lastSync,
      getCurrentLocation,
      startTracking,
      stopTracking,
      startLiveSharing,
      stopSharing,
    ],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};

export default LocationContext;
