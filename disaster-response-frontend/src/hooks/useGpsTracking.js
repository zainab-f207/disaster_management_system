import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const PING_INTERVAL_MS = 15_000; // 15 seconds
const GEOFENCE_ARRIVED_M = 100;  // metres — auto Arrived
const GEOFENCE_ON_SCENE_M = 20;  // metres — auto OnScene
const GEOFENCE_LEAVE_M   = 150;  // metres — "leaving" prompt

/**
 * useGpsTracking — manages GPS tracking for a single active assignment.
 *
 * Returns:
 *   gpsActive      — true while watchPosition is running
 *   gpsError       — string error message or null
 *   distanceMeters — live distance to the incident, or null
 *   status         — latest known server-confirmed status string
 *   startTracking  — call with assignmentId to begin
 *   stopTracking   — call to cancel GPS watch
 */
export function useGpsTracking({ onStatusChange } = {}) {
  const [gpsActive,       setGpsActive]       = useState(false);
  const [gpsError,        setGpsError]        = useState(null);
  const [distanceMeters,  setDistanceMeters]  = useState(null);
  const [status,          setStatus]          = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);

  const watchIdRef     = useRef(null);
  const assignmentRef  = useRef(null);
  const lastPingRef    = useRef(0);
  const intervalRef    = useRef(null);

  // ─── Send ping to backend ────────────────────────────────────────────────
  const sendPing = useCallback(async (position) => {
    if (!assignmentRef.current) return;
    const { latitude, longitude, speed, accuracy } = position.coords;

    try {
      const res = await api.post(`/assignments/${assignmentRef.current}/location`, {
        latitude,
        longitude,
        speedKmh:      speed != null ? speed * 3.6 : null,  // m/s -> km/h
        accuracyMeters: accuracy,
      });
      const data = res.data;
      setDistanceMeters(data.distanceMeters);
      if (data.status && data.status !== status) {
        setStatus(data.status);
        onStatusChange?.(data.status, data.previousStatus, data.distanceMeters);
      }
    } catch {
      // Non-fatal — GPS keeps running even if one ping fails
    }
  }, [status, onStatusChange]);

  // ─── GPS position callback ───────────────────────────────────────────────
  const handlePosition = useCallback((position) => {
    setCurrentPosition(position);
    setGpsError(null);

    const now = Date.now();
    if (now - lastPingRef.current >= PING_INTERVAL_MS) {
      lastPingRef.current = now;
      sendPing(position);
    }
  }, [sendPing]);

  const handleError = useCallback((err) => {
    setGpsError(err.message || 'Location access denied');
  }, []);

  // ─── Start / Stop ────────────────────────────────────────────────────────
  const startTracking = useCallback((assignmentId, initialStatus) => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }
    assignmentRef.current = assignmentId;
    setStatus(initialStatus || null);
    setGpsActive(true);
    setGpsError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    );
  }, [handlePosition, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setGpsActive(false);
    assignmentRef.current = null;
    setDistanceMeters(null);
    setCurrentPosition(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopTracking(), [stopTracking]);

  return {
    gpsActive,
    gpsError,
    distanceMeters,
    status,
    currentPosition,
    startTracking,
    stopTracking,
    GEOFENCE_ARRIVED_M,
    GEOFENCE_ON_SCENE_M,
    GEOFENCE_LEAVE_M,
  };
}
