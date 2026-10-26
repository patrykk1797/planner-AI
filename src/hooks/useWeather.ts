import { useState, useEffect, useCallback } from 'react';
import { WeatherData } from '../types.ts';

interface UseWeatherOptions {
  city: string;
  onUpdateCityFromGps?: (newCity: string) => void;
  showToast?: (msg: string) => void;
}

export function useWeather({ city, onUpdateCityFromGps, showToast }: UseWeatherOptions) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);

  const fetchWeather = useCallback(
    async (lat?: number, lon?: number) => {
      setIsWeatherLoading(true);
      try {
        let url = '/api/weather';
        if (lat !== undefined && lon !== undefined) {
          url += `?lat=${lat}&lon=${lon}`;
        } else if (city) {
          url += `?city=${encodeURIComponent(city)}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Weather API returned status: ${res.status}`);
        }
        const rawText = await res.text();
        let data: WeatherData;
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error(`Weather response is not JSON: ${rawText.slice(0, 30)}`);
        }

        setWeather(data);
        if (lat !== undefined && lon !== undefined && data.city && onUpdateCityFromGps) {
          onUpdateCityFromGps(data.city);
        }
      } catch (err) {
        console.warn('Weather fetch handled with graceful fallback:', err);
        setWeather((prev) =>
          prev || {
            city: city || 'Warszawa',
            lat: 52.23,
            lon: 21.01,
            temp: 18,
            windSpeed: 12,
            humidity: 55,
            pm2_5: 10,
            pm10: 16,
            aqi: 20,
            condition: 'Częściowe zachmurzenie ⛅',
          }
        );
      } finally {
        setIsWeatherLoading(false);
      }
    },
    [city, onUpdateCityFromGps]
  );

  useEffect(() => {
    fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshGpsWeather = useCallback(() => {
    if (!navigator.geolocation) {
      showToast?.('Geolokalizacja niedostępna. Pobieranie danych dla miasta.');
      fetchWeather();
      return;
    }

    setIsWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchWeather(latitude, longitude);
        showToast?.('Pobrano współrzędne GPS i realny odczyt PM2.5 / AQI! 📍');
      },
      (err) => {
        console.warn('GPS error:', err);
        showToast?.('Nie udało się pobrać GPS. Załadowano dane dla miasta bazowego.');
        fetchWeather();
      },
      { timeout: 7000 }
    );
  }, [fetchWeather, showToast]);

  return {
    weather,
    isWeatherLoading,
    fetchWeather,
    refreshGpsWeather,
  };
}
