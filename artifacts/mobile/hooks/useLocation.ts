import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const defaultLocation: LocationData = {
    lat: 33.3152,
    lng: 44.3661,
    address: "بغداد، العراق",
  };

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        setLocation(defaultLocation);
        setLoading(false);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentPosition.coords;

      const reverseGeocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocoded.length > 0) {
        const result = reverseGeocoded[0];
        // Format address in Arabic: ${result.street ?? ""} ${result.district ?? ""} ${result.city ?? "بغداد"}
        const street = result.street ?? "";
        const district = result.district ?? "";
        const city = result.city ?? "بغداد";
        
        const formattedAddress = `${street} ${district} ${city}`.trim() || "بغداد، العراق";
        
        setLocation({
          lat: latitude,
          lng: longitude,
          address: formattedAddress,
        });
      } else {
        setLocation({
          lat: latitude,
          lng: longitude,
          address: "موقع غير معروف",
        });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching location');
      setLocation(defaultLocation);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return {
    location,
    loading,
    error,
    refresh: getLocation,
  };
}

export default useLocation;
