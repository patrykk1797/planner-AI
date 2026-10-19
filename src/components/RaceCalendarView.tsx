import React, { useState } from 'react';
import { RaceSlot, RunnerProfile } from '../types.ts';
import { time5kToSeconds, formatSecondsToTime } from '../utils/runningMath.ts';

interface RaceCalendarViewProps {
  races: RaceSlot[];
  profile: RunnerProfile;
  onAddRace: (race: RaceSlot) => void;
  onDeleteRace: (id: string) => void;
  onSetMainGoal?: (goalName: string, targetTime?: string) => void;
  showToast: (msg: string) => void;
}

const VOIVODESHIPS = [
  'Wszystkie województwa',
  'Łódzkie',
  'Mazowieckie',
  'Wielkopolskie',
  'Dolnośląskie',
  'Małopolskie',
  'Śląskie',
  'Pomorskie',
  'Kujawsko-Pomorskie',
  'Lubelskie',
  'Podkarpackie',
  'Zachodniopomorskie',
];

export const RaceCalendarView: React.FC<RaceCalendarViewProps> = ({
  races,
  profile,
  onAddRace,
  onDeleteRace,
  onSetMainGoal,
  showToast,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | '5k' | '10k' | 'half' | 'marathon' | 'ultra'>('all');
  const [searchCity, setSearchCity] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // AI Live Search Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLocation, setSearchLocation] = useState<string>(profile.city || 'Zgierz');
  const [searchVoivodeship, setSearchVoivodeship] = useState<string>('Łódzkie');
  const [searchDateMonth, setSearchDateMonth] = useState<string>('2027-04');
  const [searchDistance, setSearchDistance] = useState<'all' | '5k' | '10k' | 'half' | 'marathon'>('half');
  const [isSearchingAI, setIsSearchingAI] = useState<boolean>(false);
  const [aiSearchResults, setAiSearchResults] = useState<RaceSlot[]>([]);

  // Calculate days until race
  const getDaysUntil = (raceDateStr: string) => {
    const raceDate = new Date(raceDateStr);
    const today = new Date(2026, 9, 18);
    const diffTime = raceDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Dziś start!';
    const weeks = Math.floor(diffDays / 7);
    return `${diffDays} dni (${weeks} tyg.)`;
  };

  // Live forecast based on profile 5k
  const getPredictedTime = (distanceKm: number) => {
    const base5k = time5kToSeconds(profile.time5k);
    const predictedSec = base5k * Math.pow(distanceKm / 5, 1.06);
    return formatSecondsToTime(predictedSec);
  };

  // Perform AI Live Search & Readiness Analysis
  const handleSearchRacesAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingAI(true);

    try {
      const res = await fetch('/api/gemini/search-races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          city: searchLocation,
          voivodeship: searchVoivodeship === 'Wszystkie województwa' ? '' : searchVoivodeship,
          monthOrDate: searchDateMonth,
          distanceCategory: searchDistance === 'all' ? '' : searchDistance,
          profile,
        }),
      });

      const data = await res.json();
      if (data.races && Array.isArray(data.races)) {
        setAiSearchResults(data.races);
        showToast(`AI znalazło ${data.races.length} startów w 2027 wraz z diagnozą formy!`);
      } else {
        showToast('Nie znaleziono bezpośrednich zawodów dla podanych kryteriów.');
      }
    } catch (err) {
      console.error(err);
      showToast('Wystąpił błąd podczas wyszukiwania biegów przez AI.');
    } finally {
      setIsSearchingAI(false);
    }
  };

  // Add race to user's saved calendar
  const handleAddFoundRace = (race: RaceSlot) => {
    if (races.some((r) => r.name.toLowerCase() === race.name.toLowerCase() && r.date === race.date)) {
      showToast(`Bieg "${race.name}" znajduje się już w Twoim kalendarzu!`);
      return;
    }

    const newRace: RaceSlot = {
      ...race,
      id: `race-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    onAddRace(newRace);
    showToast(`Dodano ${newRace.name} do Kalendarza 2027! 🏁`);
  };

  // Set race as primary A-Race goal
  const handleSetMainRace = (race: RaceSlot) => {
    handleAddFoundRace(race);
    const goalTitle = `${race.name} (${race.distanceKm} km)`;
    if (onSetMainGoal) {
      onSetMainGoal(goalTitle, race.aiVerdict?.estimatedFinishTime);
    }
    showToast(`Ustawiono "${race.name}" jako GŁÓWNY CEL SEZONU 2027! Plan AI dostosowuje periodyzację.`);
  };

  // Simulate official registration
  const handleToggleRegistration = (raceId: string, currentStatus?: boolean) => {
    const nextStatus = !currentStatus;
    showToast(nextStatus ? 'Zapisano na bieg! Zgłoszenie zarejestrowane ✅' : 'Wycofano zapis z biegu.');
  };

  const filteredRaces = races.filter((r) => {
    if (filterCategory !== 'all' && r.distanceCategory !== filterCategory) return false;
    if (searchCity && !r.city.toLowerCase().includes(searchCity.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Wyszukiwarka Live AI Biegów 2027 */}
      <div className="liquid-glass p-4 space-y-3 border border-[var(--accent)]/40">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1.5">
              <span>🤖</span>
              <span>Wyszukiwarka Live AI & Doradca Formy 2027</span>
            </span>
            <h3 className="text-base font-black txt-main">Znajdź Start w Polsce na Sezon 2027</h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
            Live Gemini
          </span>
        </div>

        <form onSubmit={handleSearchRacesAI} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] txt-muted block mb-1">Miejscowość / Miasto</label>
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="np. Zgierz, Łódź, Warszawa, Poznań..."
                className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] txt-muted block mb-1">Województwo</label>
              <select
                value={searchVoivodeship}
                onChange={(e) => setSearchVoivodeship(e.target.value)}
                className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold"
              >
                {VOIVODESHIPS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] txt-muted block mb-1">Miesiąc / Termin w 2027</label>
              <input
                type="month"
                value={searchDateMonth}
                onChange={(e) => setSearchDateMonth(e.target.value)}
                min="2027-01"
                max="2027-12"
                className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] txt-muted block mb-1">Długość / Kategoria Dystansu</label>
              <select
                value={searchDistance}
                onChange={(e) => setSearchDistance(e.target.value as any)}
                className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold"
              >
                <option value="all">Wszystkie dystanse</option>
                <option value="5k">5 km (Szybka piątka)</option>
                <option value="10k">10 km (Bieg dycha)</option>
                <option value="half">Półmaraton (21.097 km)</option>
                <option value="marathon">Maraton (42.195 km)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSearchingAI}
            className="w-full py-3 px-4 rounded-2xl accent-btn-gradient text-xs font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-60"
          >
            {isSearchingAI ? (
              <>
                <span className="animate-spin text-sm">⟳</span>
                <span>AI przeszukuje kalendarz PZLA i analizuje Twoją formę...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Wyszukaj Biegi Live i Sprawdź Gotowość Formy AI</span>
              </>
            )}
          </button>
        </form>

        {/* AI Results Section */}
        {aiSearchResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white/90">
                Znalezione starty w 2027 ({aiSearchResults.length}):
              </span>
              <span className="text-[10px] txt-muted">
                Analiza pod Twoją wagę ({profile.weight} kg) i VO2max ({profile.vo2max})
              </span>
            </div>

            <div className="space-y-3">
              {aiSearchResults.map((race) => {
                const verdict = race.aiVerdict;
                const isRecommended = verdict?.recommendation === 'rekomendowany';
                const isWarning = verdict?.recommendation === 'wymaga_przygotowan';

                return (
                  <div
                    key={race.id}
                    className="liquid-glass p-4 space-y-3 border border-white/10 hover:border-[var(--accent)] transition-all animate-ios"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black txt-main">{race.name}</h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-white">
                            {race.distanceKm} km
                          </span>
                        </div>
                        <div className="text-[11px] txt-muted mt-0.5">
                          📍 {race.city} ({race.voivodeship || 'Polska'}) • Data: <strong className="txt-main">{race.date}</strong>
                        </div>
                      </div>

                      {/* AI Readiness Badge */}
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${
                          isRecommended
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        }`}
                      >
                        {isRecommended ? '⭐ Rekomendowany' : isWarning ? '⚠️ Wymaga bazy' : '⛔ Zbyt duże ryzyko'}
                      </span>
                    </div>

                    {/* AI Viability & Physiological Analysis */}
                    {verdict && (
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-black accent-text flex items-center gap-1">
                            <span>🧠</span>
                            <span>Ocena Trenera AI: {verdict.recommendationLabel}</span>
                          </span>
                          <span className="font-bold text-emerald-400">
                            Szansa: {verdict.successChancePercent}%
                          </span>
                        </div>

                        <p className="text-[11px] txt-sub leading-relaxed">
                          {verdict.analysis}
                        </p>

                        <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-center">
                          <div className="p-1.5 rounded-xl liquid-pill">
                            <span className="txt-muted block">Czas do startu</span>
                            <strong className="txt-main">{verdict.weeksToPrep} tyg.</strong>
                          </div>
                          <div className="p-1.5 rounded-xl liquid-pill">
                            <span className="txt-muted block">Wymagany km/tydz.</span>
                            <strong className="txt-main">{verdict.minWeeklyKmNeeded} km</strong>
                          </div>
                          <div className="p-1.5 rounded-xl liquid-pill">
                            <span className="txt-muted block">Szacowany czas</span>
                            <strong className="accent-text">{verdict.estimatedFinishTime}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons: Save, Set as Main Goal, Register */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSetMainRace(race)}
                        className="py-2 px-2 rounded-xl accent-bg text-black font-black text-[11px] hover:brightness-110 flex items-center justify-center gap-1 shadow-md"
                        title="Ustaw ten bieg jako Główny Cel Sezonu A i dostosuj mikrocykl AI"
                      >
                        <span>⭐</span>
                        <span>Cel Główny A</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddFoundRace(race)}
                        className="py-2 px-2 rounded-xl border border-white/20 bg-white/5 text-white font-bold text-[11px] hover:bg-white/15 flex items-center justify-center gap-1"
                        title="Dodaj bieg do Twojego Kalendarza Sezonu 2027"
                      >
                        <span>➕</span>
                        <span>Do Kalendarza</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleRegistration(race.id)}
                        className="py-2 px-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold text-[11px] hover:bg-emerald-500/20 flex items-center justify-center gap-1"
                        title="Zapisz się na bieg oficjalnie"
                      >
                        <span>🔗</span>
                        <span>Zapisz się</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Twój Kalendarz Sezonu 2027 */}
      <div className="liquid-glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Twój Osobisty Harmonogram
            </span>
            <h3 className="text-base font-black txt-main">Zapisane Starty 2027 ({races.length})</h3>
          </div>

          <div className="flex gap-1.5 text-xs">
            {(['all', '5k', '10k', 'half', 'marathon'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  filterCategory === cat
                    ? 'accent-bg text-black'
                    : 'liquid-pill txt-sub hover:text-white'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Races List */}
        <div className="space-y-3">
          {filteredRaces.length === 0 ? (
            <div className="p-6 text-center text-xs txt-muted space-y-2">
              <div>🏁</div>
              <p>Brak zapisanych biegów w tej kategorii. Skorzystaj z wyszukiwarki AI powyżej, aby znaleźć start!</p>
            </div>
          ) : (
            filteredRaces.map((race) => (
              <div
                key={race.id}
                className="liquid-glass p-3.5 space-y-2 border border-white/10 hover:border-[var(--accent)] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black txt-main">{race.name}</h4>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full accent-badge">
                        {race.role}
                      </span>
                    </div>
                    <div className="text-[11px] txt-muted mt-0.5">
                      📍 {race.city} • {race.date} ({getDaysUntil(race.date)})
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteRace(race.id)}
                    className="text-xs txt-muted hover:text-rose-400 p-1"
                    title="Usuń bieg z kalendarza"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 rounded-xl liquid-pill text-center text-[10px]">
                  <div>
                    <span className="txt-muted block uppercase">Dystans</span>
                    <strong className="txt-main">{race.distanceKm} km</strong>
                  </div>
                  <div>
                    <span className="txt-muted block uppercase">Prognoza Mety</span>
                    <strong className="text-emerald-400">{getPredictedTime(race.distanceKm)}</strong>
                  </div>
                  <div>
                    <span className="txt-muted block uppercase">Profil Trasy</span>
                    <strong className="txt-sub">{race.profile}</strong>
                  </div>
                </div>

                {race.aiVerdict?.analysis && (
                  <p className="text-[10px] text-white/80 italic border-l-2 border-[var(--accent)] pl-2">
                    "{race.aiVerdict.analysis}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
