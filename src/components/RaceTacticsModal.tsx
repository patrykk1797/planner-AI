import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Sun,
  CloudRain,
  Wind,
  Thermometer,
  Zap,
  Droplets,
  Clock,
  TrendingDown,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Calendar,
  MapPin,
  Flame,
  Award
} from 'lucide-react';
import { RaceSlot, RunnerProfile } from '../types.ts';
import { useLockBodyScroll } from '../utils/useLockBodyScroll.ts';

interface RaceTacticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  race: RaceSlot | null;
  profile: RunnerProfile;
  showToast: (msg: string) => void;
}

interface PredictedRaceWeather {
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  conditionLabel: string;
  conditionIcon: string;
  source: 'open-meteo' | 'climate-model-2027';
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  warszawa: { lat: 52.2297, lng: 21.0122 },
  łódź: { lat: 51.7592, lng: 19.456 },
  zgierz: { lat: 51.8569, lng: 19.4064 },
  kraków: { lat: 50.0647, lng: 19.945 },
  wrocław: { lat: 51.1079, lng: 17.0385 },
  poznań: { lat: 52.4064, lng: 16.9252 },
  gdańsk: { lat: 54.352, lng: 18.6466 },
  gdynia: { lat: 54.5189, lng: 18.5305 },
  katowice: { lat: 50.2649, lng: 19.0238 },
  szczecin: { lat: 53.4285, lng: 14.5528 },
  bydgoszcz: { lat: 53.1235, lng: 18.0084 },
  toruń: { lat: 53.0138, lng: 18.5984 },
  lublin: { lat: 51.2465, lng: 22.5684 },
  białystok: { lat: 53.1325, lng: 23.1688 },
};

export const RaceTacticsModal: React.FC<RaceTacticsModalProps> = ({
  isOpen,
  onClose,
  race,
  profile,
  showToast,
}) => {
  useLockBodyScroll(isOpen);

  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [weather, setWeather] = useState<PredictedRaceWeather>({
    temperatureC: 17,
    humidityPct: 62,
    windSpeedKmh: 12,
    conditionLabel: 'Umiarkowane warunki startowe',
    conditionIcon: '🌤️',
    source: 'climate-model-2027',
  });

  // Calculate Base Pace from 5K or VO2Max
  const basePaceSecPerKm = React.useMemo(() => {
    const time5k = profile.time5k || '25:00';
    const parts = time5k.split(':').map((p) => parseInt(p, 10) || 0);
    const sec5k = (parts[0] || 25) * 60 + (parts[1] || 0);
    const pace5k = sec5k / 5;

    const dist = race?.distanceKm || 10;
    // Riegel formula pace projection: T2 = T1 * (D2/D1)^1.06 -> Pace2 = (T2/D2)
    const factor = Math.pow(dist / 5, 0.06);
    return Math.round(pace5k * factor);
  }, [profile.time5k, race?.distanceKm]);

  // Fetch Open-Meteo or calculate climate prediction for race date/location
  useEffect(() => {
    if (!isOpen || !race) return;

    let isMounted = true;
    setIsLoadingWeather(true);

    const cityName = (race.city || 'Warszawa').toLowerCase().trim();
    const coords = CITY_COORDINATES[cityName] || CITY_COORDINATES['warszawa'];

    const raceDate = new Date(race.date || '2027-05-15');
    const month = raceDate.getMonth(); // 0..11

    // Fallback/Deterministic Poland Season Climate Model
    let estTemp = 16;
    let estWind = 14;
    let estHumidity = 65;
    let icon = '🌤️';
    let label = 'Optymalne warunki wiosenne';

    if (month >= 5 && month <= 7) { // Czerwiec - Sierpień (Lato)
      estTemp = 24;
      estHumidity = 55;
      icon = '☀️';
      label = 'Ciepły / Słoneczny dzień startowy (możliwy upał)';
    } else if (month >= 8 && month <= 9) { // Wrzesień - Październik (Jesień)
      estTemp = 15;
      estHumidity = 68;
      icon = '🍂';
      label = 'Chłodna i rześka jesienna aura PB';
    } else if (month >= 2 && month <= 4) { // Marzec - Maj (Wiosna)
      estTemp = 14;
      estHumidity = 60;
      icon = '🌱';
      label = 'Wiosenny wiatr i doskonała temperatura PB';
    } else { // Zima
      estTemp = 3;
      estHumidity = 80;
      icon = '❄️';
      label = 'Chłód zimowy / niska temperatura';
    }

    // Try fetching live / forecast data from Open-Meteo
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data && data.current) {
          const curTemp = Math.round(data.current.temperature_2m);
          const curWind = Math.round(data.current.wind_speed_10m);
          const curHum = Math.round(data.current.relative_humidity_2m);
          setWeather({
            temperatureC: curTemp,
            humidityPct: curHum,
            windSpeedKmh: curWind,
            conditionLabel: curTemp > 21 ? 'Ciepło / Ryzyko przegrzania' : 'Dobra pogoda biegowa',
            conditionIcon: curTemp > 21 ? '☀️' : curWind > 20 ? '💨' : '🌤️',
            source: 'open-meteo',
          });
        } else {
          setWeather({
            temperatureC: estTemp,
            humidityPct: estHumidity,
            windSpeedKmh: estWind,
            conditionLabel: label,
            conditionIcon: icon,
            source: 'climate-model-2027',
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setWeather({
          temperatureC: estTemp,
          humidityPct: estHumidity,
          windSpeedKmh: estWind,
          conditionLabel: label,
          conditionIcon: icon,
          source: 'climate-model-2027',
        });
      })
      .finally(() => {
        if (isMounted) setIsLoadingWeather(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, race]);

  if (!isOpen || !race) return null;

  // Thermal & Environmental Pace Correction
  let paceAdjustmentSeconds = 0;
  let weatherWarning = '';

  if (weather.temperatureC > 22) {
    paceAdjustmentSeconds = Math.round((weather.temperatureC - 20) * 2.5); // +5s do +12s /km
    weatherWarning = `Podwyższona temperatura (>22°C) zwiększa dryf tętna i wydatek potu. Sugerujemy bezpieczną korektę tempa o +${paceAdjustmentSeconds} s/km, aby uniknąć załamania tempa na ostatnich kilometrach.`;
  } else if (weather.temperatureC < 4) {
    paceAdjustmentSeconds = 3;
    weatherWarning = 'Niska temperatura: pamiętaj o dłuższej rozgrzewce dynamicznej (15 min) i czapce chroniącej przed ucieczką ciepła.';
  } else if (weather.windSpeedKmh > 24) {
    weatherWarning = `Silny wiatr (${weather.windSpeedKmh} km/h): w odcinkach pod wiatr biegnij w grupie (drafting - oszczędność do 6% energii), nie przyspieszaj na siłę pod porywy.`;
  } else {
    weatherWarning = 'Optymalne okno termiczne (10-18°C)! Warunki sprzyjają biciu rekordu życiowego (PB).';
  }

  const adjustedPaceSecPerKm = basePaceSecPerKm + paceAdjustmentSeconds;
  const formatPace = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s} /km`;
  };

  const dist = Number(race.distanceKm) || 10;
  const totalAdjustedSec = Math.round(adjustedPaceSecPerKm * dist);
  const finishHours = Math.floor(totalAdjustedSec / 3600);
  const finishMinutes = Math.floor((totalAdjustedSec % 3600) / 60);
  const finishSecs = totalAdjustedSec % 60;
  const finishTimeFormatted = finishHours > 0
    ? `${finishHours}h ${finishMinutes}m ${finishSecs}s`
    : `${finishMinutes}m ${finishSecs}s`;

  // Negative Split Breakdown:
  // Part 1: 51% total time (slightly conservative)
  // Part 2: 49% total time (faster finish)
  const halfDist = +(dist / 2).toFixed(1);
  const part1Pace = formatPace(adjustedPaceSecPerKm + 3);
  const part2Pace = formatPace(adjustedPaceSecPerKm - 3);

  // Dynamic Gel & Hydration Fueling Schedule
  const gelPlan = (() => {
    if (dist <= 6) {
      return [
        { km: '-15 min', label: 'Nawodnienie przedstartowe', item: '150 ml wody lub lekkiego izotoniku', desc: 'Nie ma potrzeby spożywania żeli na trasie 5K.' },
        { km: 'Meta', label: 'Regeneracja', item: 'Białko + węglowodany (np. napój kakaowy)', desc: 'Uzupełnienie zapasów glikogenu.' },
      ];
    }
    if (dist <= 12) {
      return [
        { km: '-15 min', label: 'Żel Kofeinowy Przedstartowy', item: '1x Żel Energetyczny (25g węgli + 50mg kofeiny)', desc: 'Pobudzenie układu nerwowego i oszczędność glikogenu.' },
        { km: '5.5 km', label: 'Punkt Nawadniania', item: '100 ml wody + opcjonalny żel izotoniczny', desc: 'Popij żel wodą, nie izotonikiem.' },
        { km: 'Meta', label: 'Regeneracja powysiłkowa', item: 'Woda mineralna + banan / baton białkowy', desc: 'Szybkie wyrównanie elektrolitów.' },
      ];
    }
    if (dist <= 25) { // Półmaraton 21.1 km
      return [
        { km: '-15 min', label: 'Żel 1 (Przedstartowy)', item: 'Żel węglowodanowy 25g + 150ml wody', desc: 'Zapewnia stabilną glikemię na start.' },
        { km: '7.0 km', label: 'Żel 2 (Tlenowy)', item: 'Żel izotoniczny (25-30g)', desc: 'Przed pierwszym punktem z wodą.' },
        { km: '14.0 km', label: 'Żel 3 (Kofeinowy Booster)', item: 'Żel z kofeiną 75mg', desc: 'Kluczowy impuls na trudne kilometry 15-20.' },
        { km: 'Nawodnienie', label: 'Punkty z wodą (5, 10, 15 km)', item: '150 ml płynów na każdym punkcie', desc: 'Bierz małe łyki, płucz usta.' },
      ];
    }
    // Maraton 42.2 km lub Ultra
    return [
      { km: '-15 min', label: 'Żel 1 (Start)', item: '1x Żel węglowodanowy', desc: 'Wypij z 200 ml wody.' },
      { km: '8.0 km', label: 'Żel 2', item: 'Żel izotoniczny (25g)', desc: 'Utrzymanie rezerw mięśniowych.' },
      { km: '16.0 km', label: 'Żel 3', item: 'Żel węglowodanowy z sodem', desc: 'Uzupełnienie elektrolitów.' },
      { km: '24.0 km', label: 'Żel 4', item: 'Żel energetyczny', desc: 'Ochrona przed „ścianą” maratońską.' },
      { km: '31.0 km', label: 'Żel 5 (Kofeina)', item: 'Żel z kofeiną (75mg)', desc: 'Kluczowe wsparcie ośrodkowego układu nerwowego.' },
      { km: '36.5 km', label: 'Żel 6 (Finiszowy)', item: 'Szybki hydrożel energetyczny', desc: 'Ostatnie paliwo na wbiegnięcie na metę.' },
    ];
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-2.5 sm:p-4 overscroll-contain h-[100dvh] w-screen overflow-y-auto animate-ios"
      onClick={onClose}
    >
      <div
        className="liquid-glass w-full max-w-xl max-h-[90dvh] overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-4 border border-emerald-500/40 shadow-2xl rounded-3xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xl shadow-md">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Taktyka Wyścigowa & Pogoda Open-Meteo
                </span>
                <span className="text-[9px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Sezon 2027
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black txt-main leading-tight mt-0.5">
                {race.name} ({race.distanceKm} km)
              </h2>
              <div className="text-[11px] txt-muted flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{race.city}</span>
                <span>•</span>
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{race.date}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white text-xs font-bold shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. WEATHER RADAR CARD (Open-Meteo) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/15 via-emerald-500/10 to-black/40 border border-sky-400/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>{weather.conditionIcon}</span>
              <span>Prognoza Pogody w Dniu Startu</span>
            </span>
            <span className="text-[9px] font-mono text-sky-200/80 bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-400/30">
              {weather.source === 'open-meteo' ? 'Live Open-Meteo API' : 'Model Klimatyczny 2027'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[9px] txt-muted block uppercase font-bold flex items-center justify-center gap-1">
                <Thermometer className="w-3 h-3 text-amber-400" /> Temperatura
              </span>
              <strong className="text-sm font-black text-amber-300 font-mono">
                {weather.temperatureC}°C
              </strong>
            </div>

            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[9px] txt-muted block uppercase font-bold flex items-center justify-center gap-1">
                <Droplets className="w-3 h-3 text-sky-400" /> Wilgotność
              </span>
              <strong className="text-sm font-black text-sky-300 font-mono">
                {weather.humidityPct}%
              </strong>
            </div>

            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[9px] txt-muted block uppercase font-bold flex items-center justify-center gap-1">
                <Wind className="w-3 h-3 text-teal-400" /> Wiatr
              </span>
              <strong className="text-sm font-black text-teal-300 font-mono">
                {weather.windSpeedKmh} km/h
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-sky-200/90 bg-black/30 p-2.5 rounded-xl border border-white/5 leading-relaxed">
            💡 <strong>Rekomendacja termiczna:</strong> {weatherWarning}
          </p>
        </div>

        {/* 2. ADAPTIVE PACING & NEGATIVE SPLIT */}
        <div className="p-3.5 rounded-2xl bg-[var(--surface-tile)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black txt-main uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Inteligentne Tempo Startowe & Negative Split</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400">
              Cel: {finishTimeFormatted}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-0.5">
              <span className="text-[9px] txt-muted uppercase block font-bold">Tempo Wyjściowe (Optymalne)</span>
              <strong className="text-sm font-black text-slate-300 font-mono">
                {formatPace(basePaceSecPerKm)}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-0.5">
              <span className="text-[9px] text-emerald-400 uppercase block font-bold">
                Skorygowane o pogodę {paceAdjustmentSeconds > 0 ? `(+${paceAdjustmentSeconds}s)` : ''}
              </span>
              <strong className="text-sm font-black text-emerald-300 font-mono">
                {formatPace(adjustedPaceSecPerKm)}
              </strong>
            </div>
          </div>

          {/* Negative split plan */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>Strategia Negative Split (Najszybszy Finisz):</span>
              <span className="text-slate-400 font-normal">51% / 49% podział sił</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-white/5">
                <span className="text-[9px] txt-muted block">I Połowa (0 - {halfDist} km)</span>
                <strong className="text-xs text-white font-mono">{part1Pace}</strong>
                <span className="text-[9px] text-amber-300 block mt-0.5">Kontrola emocji & tętno Z3</span>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <span className="text-[9px] txt-muted block">II Połowa ({halfDist} - {dist} km)</span>
                <strong className="text-xs text-emerald-400 font-mono">{part2Pace}</strong>
                <span className="text-[9px] text-emerald-300 block mt-0.5">Wyprzedzanie & finisz na maksa!</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. ENERGY GELS & HYDRATION SCHEDULE */}
        <div className="p-3.5 rounded-2xl bg-[var(--surface-tile)] border border-[var(--border-subtle)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black txt-main uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Harmonogram Żeli Energetycznych & Płynów</span>
            </span>
            <span className="text-[10px] font-bold text-amber-400">
              {gelPlan.length} punkty odżywcze
            </span>
          </div>

          <div className="space-y-1.5">
            {gelPlan.map((step, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-black/35 border border-white/5 flex items-start gap-2.5 text-xs"
              >
                <div className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-[10px] shrink-0 mt-0.5">
                  {step.km}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-[11px]">{step.label}</div>
                  <div className="text-[10px] text-amber-200/90 font-medium">{step.item}</div>
                  <div className="text-[9px] txt-muted mt-0.5">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              showToast(`Zapisano strategię tempa (${formatPace(adjustedPaceSecPerKm)}) dla ${race.name}! 🎯`);
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>Zastosuj tę taktykę do planu startowego</span>
          </button>
        </div>
      </div>
    </div>
  );
};
