import { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface LocationState {
    latitude: number | null;
    longitude: number | null;
    error: string | null;
    loading: boolean;
}

export const useGeolocation = () => {
    const [location, setLocation] = useState<LocationState>({
        latitude: null,
        longitude: null,
        error: null,
        loading: false,
    });

    const getCurrentLocation = async () => {
        setLocation(prev => ({ ...prev, loading: true, error: null }));
        try {
            // Request permissions first on native platforms
            if (Capacitor.getPlatform() !== 'web') {
                const permissionStatus = await Geolocation.requestPermissions();

                if (permissionStatus.location !== 'granted') {
                    setLocation(prev => ({ ...prev, loading: false, error: 'Permission denied' }));
                    return null;
                }
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000
            });

            const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                error: null,
                loading: false,
            };

            setLocation(newLocation);
            return { latitude: position.coords.latitude, longitude: position.coords.longitude };
        } catch (error: any) {
            console.error("Error obteniendo ubicación:", error);
            setLocation(prev => ({ ...prev, loading: false, error: error.message || 'Error al obtener ubicación' }));
            return null;
        }
    };

    return { ...location, getCurrentLocation };
};
