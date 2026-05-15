import { useCallback, useRef, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { getErrorMessage } from '@uniride/core';

const GPS_QUEUE_KEY = 'gps_offline_queue';

interface QueuedLocation {
  tripId: string;
  lat: number;
  lng: number;
  timestamp: number;
  retries: number;
}

let isFlushing = false;

export function flushGpsQueueForTest() {
  return flushGpsQueue();
}

export async function flushGpsQueue() {
  if (isFlushing) return;
  isFlushing = true;
  try {
    const queueData = await AsyncStorage.getItem(GPS_QUEUE_KEY);
    if (!queueData) return;

    const queue: QueuedLocation[] = JSON.parse(queueData);
    if (queue.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const failed: QueuedLocation[] = [];

    for (const item of queue) {
      try {
        const { error } = await supabase.rpc('update_trip_location', {
          p_trip_id: item.tripId,
          p_lat: item.lat,
          p_lng: item.lng,
        });

        if (error) {
          item.retries++;
          if (item.retries < 3) {
            failed.push(item);
          } else {
            logger.warn('[GPS Queue] Dropping item after 3 retries', { tripId: item.tripId });
          }
        }
      } catch (err) {
        item.retries++;
        if (item.retries < 3) {
          failed.push(item);
        }
      }
    }

    if (failed.length > 0) {
      await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify(failed));
    } else {
      await AsyncStorage.removeItem(GPS_QUEUE_KEY);
    }
  } catch (err) {
    logger.warn('Failed to flush GPS queue', { error: getErrorMessage(err) });
  } finally {
    isFlushing = false;
  }
}

let isQueueing = false;
let pendingQueue: QueuedLocation[] = [];

async function saveQueue() {
  if (isQueueing || pendingQueue.length === 0) return;
  isQueueing = true;
  try {
    const existing = await AsyncStorage.getItem(GPS_QUEUE_KEY);
    const queue: QueuedLocation[] = existing ? JSON.parse(existing) : [];
    queue.push(...pendingQueue);
    pendingQueue = [];
    await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    logger.warn('Failed to save to GPS queue', { error: getErrorMessage(err) });
  } finally {
    isQueueing = false;
    if (pendingQueue.length > 0) saveQueue();
  }
}

async function queueLocationUpdate(tripId: string, lat: number, lng: number) {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    logger.warn('[GPS Queue] Invalid coordinates rejected', { tripId, lat, lng });
    return;
  }
  const item: QueuedLocation = { tripId, lat, lng, timestamp: Date.now(), retries: 0 };
  pendingQueue.push(item);
  saveQueue();
}

export function useLocationTracker() {
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const isOnlineRef = useRef(true);

  const stopTracking = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  }, []);

  const startTracking = useCallback(async (tripId: string) => {
    try {
      // Stop any existing tracker to prevent multiple subscriptions
      stopTracking();

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { error: 'Location permission denied' };
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (location) => {
          const { coords } = location;

          if (
            coords.latitude < -90 ||
            coords.latitude > 90 ||
            coords.longitude < -180 ||
            coords.longitude > 180
          ) {
            logger.warn('[GPS] Invalid coordinates from device', {
              lat: coords.latitude,
              lng: coords.longitude,
            });
            return;
          }

          if (!isOnlineRef.current) {
            await queueLocationUpdate(tripId, coords.latitude, coords.longitude);
            return;
          }

          const { error } = await supabase.rpc('update_trip_location', {
            p_trip_id: tripId,
            p_lat: coords.latitude,
            p_lng: coords.longitude,
          });

          if (error) {
            if (error.code === 'NETWORK_ERROR' || !error.code) {
              isOnlineRef.current = false;
              await queueLocationUpdate(tripId, coords.latitude, coords.longitude);
              setTimeout(() => {
                isOnlineRef.current = true;
                flushGpsQueue();
              }, 5000);
            }
          }
        },
      );

      return { error: null };
    } catch (err: unknown) {
      return { error: getErrorMessage(err) };
    }
  }, [stopTracking]);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return { startTracking, stopTracking };
}
