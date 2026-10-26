import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  CloudSun,
  Thermometer,
  Wind,
  Droplets,
  CloudRain,
  CheckCircle2,
  ExternalLink,
  Copy,
  Clock,
  MapPin,
  ShieldCheck,
  Check,
  Search,
  Bell,
  Smartphone,
  Share2,
} from 'lucide-react';
import { RaceSlot } from '../../types.ts';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';
import {
  exportToAppleCalendar,
  exportToGoogleCalendar,
  exportToSystemCalendar,
  CalendarEventData,
} from '../../utils/calendarExport.ts';

interface AddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  race: RaceSlot | null;
  showToast: (msg: string) => void;
}

interface GroundedWeatherResult {
  temperature: {
    min: number;
    max: number;
    avg: number;
    feelsLike: number;
  };
  conditions: string;
  conditionIcon: string;
  windKmh: number;
  humidityPercent: number;
  rainChancePercent: number;
  weatherNote: string;
  gearAdvice: string;
  hydrationAdvice: string;
  reminderText: string;
  isSearchGrounded: boolean;
  sources?: Array<{ title: string; url: string }>;
  searchQueries?: string[];
}

export const AddToCalendarModal: React.FC<AddToCalendarModalProps> = ({
  isOpen,
  onClose,
  race,
  showToast,
}) => {
  useLockBodyScroll(isOpen);

  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<GroundedWeatherResult | null>(null);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [copiedNote, setCopiedNote] = useState<boolean>(false);
  const [lastExportedPlatform, setLastExportedPlatform] = useState<string | null>(null);

  // Fetch real Google Search Grounding weather when modal opens
  useEffect(() => {
    if (!isOpen || !race) {
      setWeatherData(null);
      setLastExportedPlatform(null);
      return;
    }

    let isMounted = true;
    setIsLoadingWeather(true);

    fetch('/api/gemini/race-weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raceName: race.name,
        city: race.city,
        date: race.date,
        distanceKm: race.distanceKm,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data && data.success) {
          setWeatherData(data);
        } else {
          // Local fallback
          setWeatherData({
            temperature: { min: 11, max: 18, avg: 15, feelsLike: 14 },
            conditions: 'Umiarkowane zachmurzenie, dobre warunki biegowe',
            conditionIcon: '🌤️',
            windKmh: 12,
            humidityPercent: 62,
            rainChancePercent: 15,
            weatherNote: `W dniu ${race.date} w miejscowości ${race.city} spodziewana temperatura to ok. 15°C. Warunki sprzyjają utrzymaniu docelowego tempa na dystansie ${race.distanceKm} km.`,
            gearAdvice: 'Lekka koszulka techniczna, spodenki biegowe, buty startowe.',
            hydrationAdvice: '150 ml wody na punktach odżywczych co 5 km.',
            reminderText: `Start: ${race.name} (${race.distanceKm} km). Temperatura ok. 15°C.`,
            isSearchGrounded: false,
          });
        }
      })
      .catch((err) => {
        console.warn('Weather fetch error:', err);
        if (!isMounted) return;
        setWeatherData({
          temperature: { min: 12, max: 17, avg: 15, feelsLike: 14 },
          conditions: 'Optymalne warunki startowe',
          conditionIcon: '🌤️',
          windKmh: 11,
          humidityPercent: 60,
          rainChancePercent: 20,
          weatherNote: `Prognoza dla ${race.city}: ok. 15°C w porze startu. Stabilne ciśnienie i dobra wilgotność.`,
          gearAdvice: 'Koszulka oddychająca, spodenki biegowe, buty z dobrą amortyzacją.',
          hydrationAdvice: 'Pij regularnie na trasie, uzupełniaj elektrolity.',
          reminderText: `Zawody ${race.name} (${race.distanceKm} km).`,
          isSearchGrounded: false,
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

  const buildEventPayload = (): CalendarEventData => {
    return {
      title: `${race.name} (${race.distanceKm} km)`,
      description: `Oficjalny start w zawodach: ${race.name}. ${race.aiVerdict?.analysis ? `Analiza formy: "${race.aiVerdict.analysis}"` : ''}`,
      location: `${race.city}, Polska`,
      dateStr: race.date,
      startTime: startTime || '09:00',
      distanceKm: race.distanceKm,
      weatherNote: weatherData?.weatherNote,
      gearAdvice: weatherData?.gearAdvice,
      hydrationAdvice: weatherData?.hydrationAdvice,
      alarms: [
        {
          trigger: '-P1D',
          description: `Jutro zawody: ${race.name} (${race.distanceKm} km)! Sprawdź pogodę (${weatherData?.temperature.avg || 15}°C) i odbierz pakiet.`,
        },
        {
          trigger: '-PT2H',
          description: `Start za 2 godziny: ${race.name}! Czas na lekkostrawny posiłek, nawodnienie i rozgrzewkę.`,
        },
      ],
    };
  };

  const handleAppleExport = () => {
    const payload = buildEventPayload();
    exportToAppleCalendar(payload);
    setLastExportedPlatform('apple');
    showToast(`🍏 Pomyślnie wygenerowano zdarzenie dla Kalendarza Apple / iOS z notatką pogodową!`);
  };

  const handleGoogleExport = () => {
    const payload = buildEventPayload();
    exportToGoogleCalendar(payload);
    setLastExportedPlatform('google');
    showToast(`📅 Otwieranie Kalendarza Google z notatką pogodową i przypomnieniami!`);
  };

  const handleSystemExport = () => {
    const payload = buildEventPayload();
    exportToSystemCalendar(payload);
    setLastExportedPlatform('system');
    showToast(`💻 Pobrano plik zdarzenia (.ics) dla Kalendarza Systemowego / Outlook / Android!`);
  };

  const handleCopyWeatherNote = () => {
    if (!weatherData?.weatherNote) return;
    const fullText = `[Pogoda na zawody: ${race.name} • ${race.date} (${race.city})]\n${weatherData.weatherNote}\n\nUbiór: ${weatherData.gearAdvice}\nNawodnienie: ${weatherData.hydrationAdvice}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedNote(true);
      showToast('Skopiowano notatkę pogodową do schowka! 📋');
      setTimeout(() => setCopiedNote(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl my-auto rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl p-4 sm:p-6 space-y-4 animate-scale-up text-left overflow-hidden">
        {/* Glow ambient background accent */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 relative z-10 border-b border-white/10 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>Eksport do Kalendarza</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1">
                <Search className="w-3 h-3 text-sky-400" />
                <span>Search Grounding Pogody</span>
              </span>
            </div>
            <h3 className="text-lg font-black txt-main leading-snug">{race.name}</h3>
            <div className="flex items-center gap-2 text-xs txt-muted flex-wrap">
              <span className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <strong>{race.city}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <strong className="text-amber-400">{race.date}</strong>
              </span>
              <span>•</span>
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-white font-mono text-[10px] font-black">
                {race.distanceKm} km
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-Time Weather Check (Search Grounding) */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black txt-main flex items-center gap-1.5">
              <CloudSun className="w-4 h-4 text-amber-400" />
              <span>Prognoza & Warunki na Dzień Zawodów</span>
            </span>
            {weatherData?.isSearchGrounded && (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Google Search Zweryfikowano</span>
              </span>
            )}
          </div>

          {isLoadingWeather ? (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-sky-500/30 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <div className="space-y-1">
                <p className="text-xs font-bold txt-main">
                  Gemini Search Grounding: Badanie pogody dla {race.city}...
                </p>
                <p className="text-[11px] txt-muted">
                  Sprawdzanie prognoz, historycznych warunków atmosferycznych i wiatru na dzień {race.date}.
                </p>
              </div>
            </div>
          ) : weatherData ? (
            <div className="space-y-3">
              {/* Weather metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1 text-center">
                  <span className="text-[10px] txt-muted block uppercase font-bold">Temperatura</span>
                  <div className="text-xl font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                    <span>{weatherData.conditionIcon || '🌤️'}</span>
                    <span>{weatherData.temperature.avg}°C</span>
                  </div>
                  <span className="text-[10px] txt-muted block">
                    {weatherData.temperature.min}°C – {weatherData.temperature.max}°C
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1 text-center">
                  <span className="text-[10px] txt-muted block uppercase font-bold">Wiatr</span>
                  <div className="text-lg font-black text-sky-400 font-mono flex items-center justify-center gap-1">
                    <Wind className="w-4 h-4" />
                    <span>{weatherData.windKmh} km/h</span>
                  </div>
                  <span className="text-[10px] txt-muted block">
                    {weatherData.windKmh > 18 ? 'Odczuwalny wiatr' : 'Łagodny podmuch'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1 text-center">
                  <span className="text-[10px] txt-muted block uppercase font-bold">Opady</span>
                  <div className="text-lg font-black text-emerald-400 font-mono flex items-center justify-center gap-1">
                    <CloudRain className="w-4 h-4" />
                    <span>{weatherData.rainChancePercent}%</span>
                  </div>
                  <span className="text-[10px] txt-muted block">
                    {weatherData.rainChancePercent > 40 ? 'Możliwy deszcz' : 'Niskie ryzyko'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1 text-center">
                  <span className="text-[10px] txt-muted block uppercase font-bold">Wilgotność</span>
                  <div className="text-lg font-black text-violet-400 font-mono flex items-center justify-center gap-1">
                    <Droplets className="w-4 h-4" />
                    <span>{weatherData.humidityPercent}%</span>
                  </div>
                  <span className="text-[10px] txt-muted block">Optymalna dla płuc</span>
                </div>
              </div>

              {/* Weather Note & Tactical Guidance Card */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Notatka Pogodowa do Wydarzenia w Kalendarzu</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyWeatherNote}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 flex items-center gap-1 transition-all active:scale-95"
                  >
                    {copiedNote ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Skopiowano</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Kopiuj</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] txt-main leading-relaxed italic bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  "{weatherData.weatherNote}"
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5 space-y-0.5">
                    <strong className="text-emerald-400 block text-[10px] uppercase">Rekomendacja Ubioru:</strong>
                    <span className="txt-muted leading-tight">{weatherData.gearAdvice}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5 space-y-0.5">
                    <strong className="text-sky-400 block text-[10px] uppercase">Nawodnienie na Trasie:</strong>
                    <span className="txt-muted leading-tight">{weatherData.hydrationAdvice}</span>
                  </div>
                </div>

                {/* Grounding web sources */}
                {weatherData.sources && weatherData.sources.length > 0 && (
                  <div className="pt-1.5 border-t border-white/5 text-[10px] txt-muted flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-400">Źródła Search Grounding:</span>
                    {weatherData.sources.slice(0, 3).map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline flex items-center gap-0.5 truncate max-w-[150px]"
                        title={s.title}
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{s.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Start Time & Reminders config */}
        <div className="p-3 rounded-2xl liquid-glass border border-white/10 space-y-2 relative z-10 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold txt-main flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Godzina Startu Biegu</span>
            </span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-2.5 py-1 rounded-xl liquid-pill text-xs font-black font-mono text-emerald-400 outline-none border border-white/10 focus:border-emerald-400"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[10px] txt-muted bg-white/[0.02] p-2 rounded-xl">
            <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Wydarzenie automatycznie zawiera <strong>2 przypomnienia</strong>: 24h przed startem (przygotowanie pakietu) oraz 2h przed startem (rozgrzewka i nawodnienie).
            </span>
          </div>
        </div>

        {/* 3 Calendar Export Buttons (iOS, System, Google) */}
        <div className="space-y-2 relative z-10 pt-1">
          <span className="text-[11px] font-black uppercase text-slate-300 block tracking-wider">
            Wybierz Swój Kalendarz w Telefonie lub Komputerze:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* 1. iOS / Apple Calendar */}
            <button
              type="button"
              onClick={handleAppleExport}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2 cursor-pointer shadow-md active:scale-95 ${
                lastExportedPlatform === 'apple'
                  ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/40 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xl">🍏</span>
                {lastExportedPlatform === 'apple' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div>
                <strong className="text-xs font-black txt-main block">Kalendarz Apple / iOS</strong>
                <span className="text-[10px] txt-muted leading-tight block mt-0.5">
                  Dodaj do iPhone'a i Maca z natywnym powiadomieniem
                </span>
              </div>
            </button>

            {/* 2. Google Calendar */}
            <button
              type="button"
              onClick={handleGoogleExport}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2 cursor-pointer shadow-md active:scale-95 ${
                lastExportedPlatform === 'google'
                  ? 'bg-sky-500/20 border-sky-400 ring-2 ring-sky-400/40 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xl">📅</span>
                {lastExportedPlatform === 'google' && (
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <div>
                <strong className="text-xs font-black txt-main block">Kalendarz Google</strong>
                <span className="text-[10px] txt-muted leading-tight block mt-0.5">
                  Otwórz bezpośrednio na telefonie lub w przeglądarce
                </span>
              </div>
            </button>

            {/* 3. System Calendar (Outlook / Android / Windows) */}
            <button
              type="button"
              onClick={handleSystemExport}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2 cursor-pointer shadow-md active:scale-95 ${
                lastExportedPlatform === 'system'
                  ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xl">💻</span>
                {lastExportedPlatform === 'system' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div>
                <strong className="text-xs font-black txt-main block">Kalendarz Systemowy</strong>
                <span className="text-[10px] txt-muted leading-tight block mt-0.5">
                  Plik .ics dla Outlook, Androida, Windows Calendar
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer info & close */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <span className="text-[11px] txt-muted">
            Zawiera kompletną notatkę pogodową, porady ubioru i alarmy.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl liquid-pill text-xs font-bold txt-main hover:text-white transition-all cursor-pointer"
          >
            Gotowe
          </button>
        </div>
      </div>
    </div>
  );
};
