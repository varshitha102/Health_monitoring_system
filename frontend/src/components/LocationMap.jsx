import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import { MapPin, Navigation, ExternalLink, Share2, XCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker images are resolved relative to the CSS, which breaks under
// Vite. Point them at fixed CDN URLs instead.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * Recents the map when the coordinates move meaningfully.
 *
 * The previous version forced a full remount of <MapContainer> on every GPS update
 * (by bumping a `key`), which reset zoom/pan about once per second and made the map
 * unusable. Updating the view imperatively avoids that.
 */
const Recenter = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat == null || lng == null) return;
    const target = L.latLng(lat, lng);
    const moved = map.getCenter().distanceTo(target);
    if (moved > 5) {
      map.setView(target, map.getZoom(), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
};

const LocationMap = ({
  location,
  isTracking,
  isSharing,
  patientId,
  patientName,
  onStartSharing,
  onStopSharing,
}) => {
  const [sendStatus, setSendStatus] = useState(null);

  const hasFix = location?.latitude != null && location?.longitude != null;

  if (!hasFix) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Patient Location</h3>
        </div>
        <div className="text-center py-8 text-slate-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">Patient location is currently unavailable</p>
          <p className="text-xs mt-2">
            Start a location session to see the patient&apos;s location on the map
          </p>
        </div>
      </div>
    );
  }

  const { latitude, longitude, accuracy, timestamp } = location;
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const googleMapsShareUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  const timeAgo = (() => {
    if (!timestamp) return 'just now';
    const diff = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  })();

  const handleStartSharing = () => {
    if (!patientName?.trim()) {
      setSendStatus({
        type: 'error',
        message: 'Set a patient name in Settings before sharing live location.',
      });
      return;
    }
    onStartSharing?.();
    setSendStatus({
      type: 'success',
      message: 'Live location sharing started. Contacts receive updates every 30 seconds.',
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1F06AC] to-[#0F42C0] rounded-lg flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 truncate">Patient Location</h3>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1F06AC] hover:bg-[#0F42C0] text-white px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            Maps
          </a>
          <a
            href={googleMapsShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#5882E8] hover:bg-[#0F42C0] text-white px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
          >
            <Navigation className="w-4 h-4" />
            Directions
          </a>
        </div>
      </div>

      <div
        className="h-64 rounded-xl overflow-hidden mb-4 border border-slate-200"
        style={{ minHeight: 250 }}
      >
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%', minHeight: 250 }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Recenter lat={latitude} lng={longitude} />
          <Marker position={[latitude, longitude]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Patient Location</p>
                <p>Lat: {latitude.toFixed(6)}</p>
                <p>Lng: {longitude.toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
          {accuracy ? (
            <Circle
              center={[latitude, longitude]}
              radius={accuracy}
              pathOptions={{ color: '#1F06AC', fillColor: '#5882E8', fillOpacity: 0.2 }}
            />
          ) : null}
        </MapContainer>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Latitude</p>
            <p className="font-bold text-slate-800 tabular-nums">{latitude.toFixed(6)}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Longitude</p>
            <p className="font-bold text-slate-800 tabular-nums">{longitude.toFixed(6)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Accuracy</p>
            <p className="font-semibold text-slate-800">
              {accuracy ? `${Math.round(accuracy)}m` : 'N/A'}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Updated</p>
            <p className="font-semibold text-slate-800">{timeAgo}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Time</p>
            <p className="font-semibold text-xs text-slate-800">
              {timestamp ? new Date(timestamp).toLocaleTimeString() : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gradient-to-r from-[#1F06AC]/10 to-[#0F42C0]/10 p-3 rounded-xl border border-[#1F06AC]/20">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isTracking ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <div>
              <p className="text-xs font-semibold text-[#1F06AC]">
                {isTracking ? 'Live Tracking Active' : 'Tracking Inactive'}
              </p>
              <p className="text-xs text-slate-600">
                {isTracking ? 'Sending updates to backend' : 'Start session to begin'}
              </p>
            </div>
          </div>
        </div>

        {isTracking && (
          <div className="flex items-center justify-between bg-gradient-to-r from-[#E3EF4F]/20 to-[#E3EF4F]/10 p-3 rounded-xl border border-[#E3EF4F]/30">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isSharing ? 'bg-[#1F06AC] animate-pulse' : 'bg-slate-400'
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-[#1F06AC]">
                  {isSharing ? 'Live Sharing Active' : 'Sharing Inactive'}
                </p>
                <p className="text-xs text-slate-600">
                  {isSharing ? 'Updates every 30s' : 'Share with contacts'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isSharing ? (
            <button
              type="button"
              onClick={handleStartSharing}
              disabled={!isTracking}
              className="flex-1 bg-[#1F06AC] hover:bg-[#0F42C0] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Start Live Sharing
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onStopSharing?.();
                setSendStatus({ type: 'success', message: 'Live location sharing stopped.' });
              }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Stop Sharing
            </button>
          )}
        </div>

        {sendStatus && (
          <div
            className={`p-3 rounded-xl text-sm ${
              sendStatus.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {sendStatus.message}
          </div>
        )}

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> This represents the device location (laptop/phone), not necessarily
            the patient&apos;s physical location. Patient ID: {patientId}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;
