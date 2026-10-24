import React, { useState, useEffect } from 'react';
import {
  Flag,
  Trophy,
  Target,
  Compass,
  Sliders,
  Bot,
  Search,
  MapPin,
  Calendar,
  Star,
  Plus,
  ExternalLink,
  Globe,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Brain,
  Clock,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Timer,
  HeartPulse,
  Minus,
  Check,
} from 'lucide-react';
import { RaceSlot, RunnerProfile, RunLog, TrainingDay } from '../types.ts';
import { time5kToSeconds, formatSecondsToTime } from '../utils/runningMath.ts';
import { RouteSurfaceAnalyzer } from './RouteSurfaceAnalyzer.tsx';
import { RaceFitnessPredictor } from './RaceFitnessPredictor.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { getAlgorithmicRaces } from '../utils/knownRaces2027.ts';
import { RaceTacticsModal } from './RaceTacticsModal.tsx';

interface RaceCalendarViewProps {
  races: RaceSlot[];
  profile: RunnerProfile;
  runs?: RunLog[];
  plan?: TrainingDay[];
  onAddRace: (race: RaceSlot) => void;
  onDeleteRace: (id: string) => void;
  onSetMainGoal?: (goalName: string, targetTime?: string) => void;
  showToast: (msg: string) => void;
  onOpenSimulator?: () => void;
  onOpenRoutePlanner?: () => void;
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
  runs = [],
  plan = [],
  onAddRace,
  onDeleteRace,
  onSetMainGoal,
  showToast,
  onOpenSimulator,
  onOpenRoutePlanner,
}) => {
  const [subTab, setSubTab] = useState<'calendar' | 'simulator' | 'gels'>('calendar');
  const [predictorDistanceKm, setPredictorDistanceKm] = useState<number>(21.0975);
  const [filterCategory, setFilterCategory] = useState<'all' | '5k' | '10k' | 'half' | 'marathon' | 'ultra'>('all');
  const [selectedGelDistance, setSelectedGelDistance] = useState<'5k' | '10k' | 'half' | 'marathon'>('half');
  const [tacticsModalRace, setTacticsModalRace] = useState<RaceSlot | null>(null);

  // Interactive Calendar View State (tracks month, selected day, and section)
  const [calMonthDate, setCalMonthDate] = useState<Date>(() => new Date(2026, 9, 1));
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(18);
  const [calendarViewMode, setCalendarViewMode] = useState<'calendar_grid' | 'races_list'>('calendar_grid');

  const calYear = calMonthDate.getFullYear();
  const calMonthIdx = calMonthDate.getMonth();
  const MONTH_NAMES_PL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];
  const calMonthName = MONTH_NAMES_PL[calMonthIdx];
  const daysInCalMonth = new Date(calYear, calMonthIdx + 1, 0).getDate();
  const calFirstDayOffset = (new Date(calYear, calMonthIdx, 1).getDay() + 6) % 7; // Mon=0 .. Sun=6

  const planStartDate = profile?.planGeneratedAt || profile?.createdAt;

  const handlePrevCalMonth = () => {
    setCalMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextCalMonth = () => {
    setCalMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getCalendarDayData = (dayNum: number) => {
    const dayStr = String(dayNum).padStart(2, '0');
    const monthStr = String(calMonthIdx + 1).padStart(2, '0');
    const dateStr = `${calYear}-${monthStr}-${dayStr}`;

    const isBeforePlanStart = Boolean(planStartDate && dateStr < planStartDate);

    // 1. Registered real run from runs log
    const matchingRun = (runs || []).find((r) => {
      if (!r.date) return false;
      return r.date === dateStr || r.date.startsWith(dateStr);
    });

    // 2. Training day from plan (for matching weekday)
    const weekdayIdx = (calFirstDayOffset + (dayNum - 1)) % 7;
    const planItem = plan && plan.length > weekdayIdx ? plan[weekdayIdx] : null;

    // A day is marked as completed if:
    // a) A real run was logged on this date OR
    // b) The plan has marked this day as completed AND the date is NOT before plan generation date
    const hasCompletedWorkout = Boolean(
      matchingRun ||
      (!isBeforePlanStart && planItem?.completed && (planItem?.distanceKm || 0) > 0)
    );

    // 3. Races on this date
    const dayRaces = (races || []).filter((r) => r.date === dateStr);

    const isToday = calYear === 2026 && calMonthIdx === 9 && dayNum === 18;

    return {
      dayNum,
      dateStr,
      matchingRun,
      planItem,
      hasCompletedWorkout,
      isBeforePlanStart,
      dayRaces,
      isToday,
      weekdayIdx,
    };
  };

  // AI Live Search Filters — default to comprehensive 2027 country-wide search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [searchVoivodeship, setSearchVoivodeship] = useState<string>('Wszystkie województwa');
  const [searchDateMonth, setSearchDateMonth] = useState<string>('');
  const [searchDistance, setSearchDistance] = useState<'all' | '5k' | '10k' | 'half' | 'marathon'>('all');
  const [activeChip, setActiveChip] = useState<string>('all');
  const [isSearchingAI, setIsSearchingAI] = useState<boolean>(false);
  const [aiSearchResults, setAiSearchResults] = useState<RaceSlot[]>(() =>
    getAlgorithmicRaces('', '', 'all', profile)
  );

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
    try {
      const base5k = time5kToSeconds(profile?.time5k || '25:00');
      const validDist = typeof distanceKm === 'number' && !isNaN(distanceKm) && distanceKm > 0 ? distanceKm : 5;
      const predictedSec = base5k * Math.pow(validDist / 5, 1.06);
      return formatSecondsToTime(predictedSec);
    } catch {
      return '55:00';
    }
  };

  // Execute search with given parameters
  const executeSearch = async (overrides?: {
    query?: string;
    city?: string;
    voivodeship?: string;
    monthOrDate?: string;
    distanceCategory?: string;
  }) => {
    setIsSearchingAI(true);
    const q = overrides?.query !== undefined ? overrides.query : searchQuery;
    const c = overrides?.city !== undefined ? overrides.city : searchLocation;
    const v = overrides?.voivodeship !== undefined ? overrides.voivodeship : searchVoivodeship;
    const m = overrides?.monthOrDate !== undefined ? overrides.monthOrDate : searchDateMonth;
    const d = overrides?.distanceCategory !== undefined ? overrides.distanceCategory : searchDistance;

    const localFallback = getAlgorithmicRaces(
      c,
      v === 'Wszystkie województwa' ? '' : v,
      d === 'all' ? '' : d,
      profile,
      q,
      m
    );

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/gemini/search-races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          city: c,
          voivodeship: v === 'Wszystkie województwa' ? '' : v,
          monthOrDate: m,
          distanceCategory: d === 'all' ? '' : d,
          profile,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.races && Array.isArray(data.races) && data.races.length > 0) {
          setAiSearchResults(data.races);
          if (showToast && overrides) {
            showToast(`Znaleziono ${data.races.length} oficjalnych startów 2027! 🏆`);
          }
          return;
        }
      }
      setAiSearchResults(localFallback);
    } catch {
      // Clean fallback without throwing or unhandled console errors
      setAiSearchResults(localFallback);
      if (showToast && overrides) {
        showToast(`Załadowano ${localFallback.length} zweryfikowanych startów 2027! 🏆`);
      }
    } finally {
      setIsSearchingAI(false);
    }
  };

  // Query on mount to refresh races
  useEffect(() => {
    executeSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Perform AI Live Search & Readiness Analysis from form submit
  const handleSearchRacesAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch();
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
    showToast(`Dodano ${newRace.name} do Kalendarza 2027!`);
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

  // Open official organizer registration site
  const handleOpenOrganizerRegistration = (race: RaceSlot) => {
    let url = race.registrationUrl;
    if (!url || !url.startsWith('http')) {
      url = `https://www.google.com/search?q=zapisy+oficjalne+${encodeURIComponent(race.name + ' ' + race.city)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`Otwieranie strony organizatora dla: ${race.name}`);
  };

  const filteredRaces = races.filter((r) => {
    if (filterCategory !== 'all' && r.distanceCategory !== filterCategory) return false;
    return true;
  });

  return (
    <div className="space-y-4 px-4 pb-36 animate-ios">
      {/* Sub-Tabs with Vector Icons */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 liquid-pill border border-white/10 text-xs">
        <button
          type="button"
          onClick={() => setSubTab('calendar')}
          className={`py-2 px-1.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'calendar' ? 'accent-tab-active shadow-md' : 'txt-sub hover:text-white'
          }`}
        >
          <Flag className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Biegi 2027</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('simulator')}
          className={`py-2 px-1.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'simulator' ? 'accent-tab-active shadow-md' : 'txt-sub hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Symulator</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('gels')}
          className={`py-2 px-1.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'gels' ? 'accent-tab-active shadow-md' : 'txt-sub hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Żele & Strategia</span>
        </button>
      </div>

      {subTab === 'simulator' ? (
        <div className="space-y-4">
          <div className="liquid-glass p-4 space-y-3">
            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  SYMULATOR DYSTANSÓW 5K / 10K / 21K / 42K
                </span>
                <h3 className="text-base font-black txt-main">Prognoza Czasów na Mecie i Droga Treningowa</h3>
                <p className="text-[11px] txt-muted leading-relaxed">
                  Przelicznik VDOT / VO2Max ({profile.vo2max || 52}) z uwzględnieniem Twojej wagi ({profile.weight} kg)
                </p>
              </div>
              {onOpenSimulator && (
                <button
                  type="button"
                  onClick={onOpenSimulator}
                  className="w-full mt-3 accent-bg text-black px-3.5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Uruchom Symulator Co-Jeśli</span>
                </button>
              )}
            </div>

            {/* 4 Distances Training Milestones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {[
                { dist: '5 km', km: 5, target: profile.time5k || '25:00', pace: '5:00 /km', weekly: '25-30 km/tydz.', phase: 'Szybkość & VO2Max' },
                { dist: '10 km', km: 10, target: getPredictedTime(10), pace: '5:15 /km', weekly: '35-42 km/tydz.', phase: 'Próg Mleczanowy (LT)' },
                { dist: 'Półmaraton (21.1 km)', km: 21.0975, target: getPredictedTime(21.0975), pace: '5:32 /km', weekly: '45-55 km/tydz.', phase: 'Wytrzymałość Tempowa' },
                { dist: 'Maraton (42.2 km)', km: 42.195, target: getPredictedTime(42.195), pace: '5:55 /km', weekly: '60-75 km/tydz.', phase: 'Ekonomia Tłuszczowa & Długie Wybiegania' },
              ].map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black txt-main">{m.dist}</span>
                    <span className="text-xs font-black text-amber-400 font-mono">{m.target}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] txt-muted">
                    <span>Średnie tempo: <strong className="text-white">{m.pace}</strong></span>
                    <span>Baza: <strong className="text-emerald-300">{m.weekly}</strong></span>
                  </div>
                  <div className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                    Faza: {m.phase}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ErrorBoundary fallbackTitle="Predyktor Formy Biegowej">
            <RaceFitnessPredictor
              profile={profile}
              runs={runs || []}
              races={races || []}
              initialDistanceKm={predictorDistanceKm || 21.0975}
              onSetMainGoal={onSetMainGoal}
              showToast={showToast}
            />
          </ErrorBoundary>
        </div>
      ) : subTab === 'gels' ? (
        <div className="space-y-4">
          <div className="liquid-glass p-4 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              STRATEGIA ŻELOWA & ENERGIA W BIEGU
            </span>
            <h3 className="text-base font-black txt-main">Kalkulator Żeli i Węglowodanów</h3>
            <p className="text-[11px] txt-muted leading-relaxed">
              Prawidłowe dożywianie na trasie zapobiega zjawisku „ściany” (ang. hitting the wall) i wyczerpaniu glikogenu.
            </p>

            {/* Distance selector */}
            <div className="grid grid-cols-4 gap-1 pt-2">
              {(['5k', '10k', 'half', 'marathon'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedGelDistance(d)}
                  className={`py-2 text-[10px] font-black rounded-lg border transition-all ${
                    selectedGelDistance === d
                      ? 'bg-amber-400 text-black border-amber-300'
                      : 'border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                >
                  {d === '5k' ? '5 KM' : d === '10k' ? '10 KM' : d === 'half' ? 'PÓŁMARATON' : 'MARATON'}
                </button>
              ))}
            </div>
          </div>

          {/* Gel recommendations card */}
          <div className="liquid-glass p-4 space-y-3 border border-amber-400/30">
            {selectedGelDistance === '5k' && (
              <div className="space-y-2">
                <h4 className="text-xs font-black txt-main text-amber-400 uppercase">Dystans 5 km (&lt; 30 min)</h4>
                <p className="text-xs txt-muted leading-relaxed">
                  Na dystansie 5 km zapasy glikogenu w mięśniach są w 100% wystarczające. Żele w trakcie biegu NIE są potrzebne.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] txt-muted space-y-1">
                  <div><strong>Przed biegiem (15 min):</strong> 1 szklanka wody lub lekki izotonik.</div>
                  <div><strong>W trakcie biegu:</strong> Płukanie ust węglowodanami lub mały łyk wody.</div>
                </div>
              </div>
            )}

            {selectedGelDistance === '10k' && (
              <div className="space-y-2">
                <h4 className="text-xs font-black txt-main text-amber-400 uppercase">Dystans 10 km (40 - 60 min)</h4>
                <p className="text-xs txt-muted leading-relaxed">
                  Zalecany 1 żel energetyczny (ok. 25-30g węglowodanów) w połowie dystansu.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] txt-muted space-y-1">
                  <div><strong>Kilometr 5 (ok. 25-28 min):</strong> 1 żel energetyczny + popicie wodą na punkcie nawadniania.</div>
                  <div><strong>Nawodnienie:</strong> 150-200 ml wody na 5. kilometrze.</div>
                </div>
              </div>
            )}

            {selectedGelDistance === 'half' && (
              <div className="space-y-2">
                <h4 className="text-xs font-black txt-main text-amber-400 uppercase">Półmaraton (1:45 - 2:15 h)</h4>
                <p className="text-xs txt-muted leading-relaxed">
                  Zalecane <strong>3 żele energetyczne</strong> (ok. 75-90g węglowodanów łącznie) przyjęte w stałych odstępach czasowych.
                </p>
                <div className="space-y-1.5 pt-1">
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs">
                    <span>1. Żel (Km 6 / 35 min)</span>
                    <span className="font-bold text-amber-400">25g węgli + woda</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs">
                    <span>2. Żel (Km 12 / 70 min)</span>
                    <span className="font-bold text-amber-400">25g węgli + izotonik</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs">
                    <span>3. Żel (Km 17 / 100 min, z kofeiną)</span>
                    <span className="font-bold text-amber-400">25g węgli + 50mg kofeiny</span>
                  </div>
                </div>
              </div>
            )}

            {selectedGelDistance === 'marathon' && (
              <div className="space-y-2">
                <h4 className="text-xs font-black txt-main text-amber-400 uppercase">Królewski Dystans: Maraton (3:30 - 4:30 h)</h4>
                <p className="text-xs txt-muted leading-relaxed">
                  Zalecane <strong>6 do 8 żeli energetycznych</strong> (60g węglowodanów / godzinę) podawanych co 30-35 minut od samego startu!
                </p>
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">Km 7 (35 min): Żel #1</div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">Km 14 (70 min): Żel #2</div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">Km 21 (105 min): Żel #3</div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">Km 27 (135 min): Żel #4</div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">Km 33 (165 min): Żel #5 (Kofeina)</div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">Km 38 (195 min): Żel #6 (Finish)</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Planer Tras Biegowych GPS (OpenStreetMap, Przewyższenia & Klasyfikator Nawierzchni) */}
          <div className="liquid-glass p-4 border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center border border-emerald-400/40 shrink-0">
                <Compass className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                    Planer Tras Biegowych GPS
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    OpenStreetMap • Przewyższenia • GPX
                  </span>
                </div>
                <h4 className="text-sm font-black txt-main mt-0.5">
                  Planuj Pętle Biegowe, Przewyższenia i Badaj Nawierzchnię
                </h4>
                <p className="text-[11px] txt-muted leading-relaxed">
                  Rysuj trasę na interaktywnej mapie, analizuj udział asfaltu, szutru i ścieżek leśnych, profil wzniesień oraz eksportuj gotowy ślad GPX do zegarka lub telefonu.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onOpenRoutePlanner) {
                  onOpenRoutePlanner();
                } else {
                  showToast('Otwieranie planera tras GPS...');
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4 text-black" />
              <span>Zaplanuj Nową Trasę GPS (OpenStreetMap)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Widok Kalendarza Treningów i Startów z Oznaczeniem 'Ukończony' */}
          {(() => {
            const currentMonthWorkouts = Array.from({ length: daysInCalMonth }, (_, i) => getCalendarDayData(i + 1)).filter((d) => d.hasCompletedWorkout);
            const currentMonthRaces = (races || []).filter((r) => {
              if (!r.date) return false;
              const parts = r.date.split('-');
              if (parts.length >= 2) {
                return parseInt(parts[0], 10) === calYear && parseInt(parts[1], 10) === calMonthIdx + 1;
              }
              return false;
            });
            const currentMonthTotalKm = currentMonthWorkouts.reduce((acc, d) => {
              const rawKm = d.matchingRun ? d.matchingRun.distanceKm : (d.planItem?.distanceKm || 0);
              const km = Number(rawKm) || 0;
              return acc + km;
            }, 0);

            return (
              <div className="liquid-glass p-4 rounded-2xl border border-white/10 space-y-3.5 shadow-xl">
                {/* Header with Navigation and View Toggles */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Kalendarz Treningów & Startów</span>
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Auto-oznaczanie treningów
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <h3 className="text-base sm:text-lg font-black txt-main">
                        {calMonthName} {calYear}
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handlePrevCalMonth}
                          className="p-1.5 rounded-lg liquid-pill font-black text-xs hover:border-emerald-400 text-white transition-all active:scale-90"
                          title="Poprzedni miesiąc"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextCalMonth}
                          className="p-1.5 rounded-lg liquid-pill font-black text-xs hover:border-emerald-400 text-white transition-all active:scale-90"
                          title="Następny miesiąc"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Legend & Stats */}
                  <div className="flex items-center gap-2 flex-wrap text-[10px]">
                    <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-bold shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{currentMonthWorkouts.length} Ukończonych</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 font-bold shadow-sm">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{currentMonthRaces.length} Startów</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center gap-1.5 font-bold shadow-sm">
                      <Footprints className="w-3.5 h-3.5 text-sky-400" />
                      <span>{(Number(currentMonthTotalKm) || 0).toFixed(1)} km</span>
                    </div>
                  </div>
                </div>

                {/* View Mode Toggle: Kalendarz Siatkowy vs Lista Treningów & Startów */}
                <div className="grid grid-cols-2 gap-1.5 p-1 liquid-pill text-xs">
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode('calendar_grid')}
                    className={`py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                      calendarViewMode === 'calendar_grid' ? 'accent-tab-active shadow-sm font-black' : 'txt-sub hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Widok Kalendarza Dni</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode('races_list')}
                    className={`py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                      calendarViewMode === 'races_list' ? 'accent-tab-active shadow-sm font-black' : 'txt-sub hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ukończone Treningi ({runs.length})</span>
                  </button>
                </div>

                {calendarViewMode === 'calendar_grid' ? (
                  <div className="space-y-3">
                    {/* 7 Columns Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black txt-muted border-b border-white/5 pb-1">
                      {['Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((d, i) => (
                        <div key={d} className={i >= 5 ? 'text-amber-400/80' : ''}>
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                      {/* Empty cells for offset */}
                      {Array.from({ length: calFirstDayOffset }).map((_, i) => (
                        <div key={`cal-offset-${i}`} className="min-h-[58px] sm:min-h-[66px] rounded-xl bg-white/[0.01] border border-transparent opacity-20" />
                      ))}

                      {/* Month days */}
                      {Array.from({ length: daysInCalMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dayData = getCalendarDayData(dayNum);
                        const isSelected = selectedDayNumber === dayNum;

                        return (
                          <button
                            key={`cal-day-${dayNum}`}
                            type="button"
                            onClick={() => setSelectedDayNumber(dayNum)}
                            className={`min-h-[58px] sm:min-h-[66px] w-full p-1 rounded-xl flex flex-col items-center justify-between transition-all relative overflow-hidden text-left cursor-pointer ${
                              isSelected
                                ? 'border-2 border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/50 z-10 shadow-lg'
                                : dayData.hasCompletedWorkout
                                ? 'border-2 border-emerald-400 bg-emerald-950/40 shadow-md ring-1 ring-emerald-400/40 hover:bg-emerald-900/40'
                                : dayData.dayRaces.length > 0
                                ? 'border-2 border-amber-400 bg-amber-500/20 shadow-md ring-1 ring-amber-400/50 hover:bg-amber-500/30'
                                : dayData.isToday
                                ? 'border-2 border-amber-400/70 bg-amber-500/10'
                                : dayData.isBeforePlanStart
                                ? 'bg-white/[0.02] border border-white/5 opacity-40 hover:opacity-80'
                                : 'bg-white/5 border border-white/10 hover:border-white/20'
                            }`}
                          >
                            {/* Day number & status icon */}
                            <div className="flex items-center justify-between w-full px-0.5 text-[9px] font-bold leading-none">
                              <span
                                className={
                                  dayData.isToday
                                    ? 'text-amber-300 font-black'
                                    : dayData.hasCompletedWorkout
                                    ? 'text-emerald-300 font-black'
                                    : dayData.dayRaces.length > 0
                                    ? 'text-amber-300 font-black'
                                    : dayData.isBeforePlanStart
                                    ? 'text-slate-500 font-medium'
                                    : 'txt-main'
                                }
                              >
                                {dayNum}
                              </span>
                              {dayData.isToday ? (
                                <span className="text-[6px] font-black bg-amber-400 text-slate-950 px-1 py-0.2 rounded leading-none shrink-0 shadow-sm">
                                  DZIŚ
                                </span>
                              ) : dayData.hasCompletedWorkout ? (
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 stroke-[2.5] shrink-0" />
                              ) : dayData.dayRaces.length > 0 ? (
                                <Trophy className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              ) : null}
                            </div>

                            {/* Prominent Visual Indicator 'Ukończony' or 'Start' directly on calendar cell */}
                            <div className="w-full flex items-center justify-center my-0.5">
                              {dayData.hasCompletedWorkout ? (
                                <span className="w-full text-center text-[7px] font-black text-emerald-300 bg-emerald-500/25 px-1 py-0.5 rounded-full border border-emerald-500/40 tracking-tight flex items-center justify-center gap-0.5 shadow-sm">
                                  <CheckCircle2 className="w-2 h-2 text-emerald-400 shrink-0" />
                                  <span>Ukończony</span>
                                </span>
                              ) : dayData.dayRaces.length > 0 ? (
                                <span className="w-full text-center text-[7px] font-black text-amber-300 bg-amber-500/25 px-1 py-0.5 rounded-full border border-amber-500/40 tracking-tight flex items-center justify-center gap-0.5">
                                  <Flag className="w-2 h-2 text-amber-400 shrink-0" />
                                  <span>Start</span>
                                </span>
                              ) : dayData.isBeforePlanStart ? (
                                <Minus className="w-2.5 h-2.5 text-slate-600" />
                              ) : dayData.planItem && dayData.planItem.distanceKm > 0 ? (
                                <span className="text-[7px] text-slate-400 font-bold truncate max-w-full">
                                  {dayData.planItem.type.slice(0, 5)}
                                </span>
                              ) : (
                                <span className="text-[7px] text-slate-600">Wolne</span>
                              )}
                            </div>

                            {/* Distance Label */}
                            <div className="w-full text-center text-[8px] font-mono leading-none">
                              {dayData.hasCompletedWorkout ? (
                                <strong className="text-emerald-300 font-black">
                                  {dayData.matchingRun ? `${dayData.matchingRun.distanceKm}k` : `${dayData.planItem?.distanceKm}k`}
                                </strong>
                              ) : dayData.dayRaces.length > 0 ? (
                                <strong className="text-amber-300 font-black">
                                  {dayData.dayRaces[0].distanceKm}k
                                </strong>
                              ) : dayData.isBeforePlanStart ? (
                                <span className="text-slate-600">—</span>
                              ) : dayData.planItem && dayData.planItem.distanceKm > 0 ? (
                                <span className="text-slate-400">{dayData.planItem.distanceKm}k</span>
                              ) : (
                                <span className="text-slate-600">0k</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Day Details Panel in Calendar View */}
                    {(() => {
                      const sData = getCalendarDayData(selectedDayNumber > daysInCalMonth ? 1 : selectedDayNumber);
                      return (
                        <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2.5 mt-2 animate-ios">
                          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-xs font-black txt-main">
                                {selectedDayNumber} {calMonthName} {calYear}
                              </span>
                            </div>

                            {sData.hasCompletedWorkout ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Ukończony
                              </span>
                            ) : sData.dayRaces.length > 0 ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-black flex items-center gap-1.5 shadow-sm">
                                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                Dzień Startu
                              </span>
                            ) : sData.isBeforePlanStart ? (
                              <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[10px] font-bold">
                                Przed utworzeniem planu
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[10px] font-bold">
                                Dzień w planie
                              </span>
                            )}
                          </div>

                          {/* Content of selected day */}
                          {sData.matchingRun ? (
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black txt-main text-sm">
                                  {sData.matchingRun.title || `Bieg z ${sData.dateStr}`}
                                </h4>
                                <span className="font-mono text-emerald-400 font-bold">
                                  {sData.matchingRun.distanceKm} km • {sData.matchingRun.durationMin} min
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 p-2 rounded-xl liquid-pill text-center text-[10px]">
                                <div>
                                  <span className="txt-muted block uppercase">Tempo</span>
                                  <strong className="txt-main">{sData.matchingRun.avgPace}</strong>
                                </div>
                                <div>
                                  <span className="txt-muted block uppercase">Śr. Tętno</span>
                                  <strong className="text-rose-400">{sData.matchingRun.avgHr || '—'} bpm</strong>
                                </div>
                                <div>
                                  <span className="txt-muted block uppercase">Buty</span>
                                  <strong className="txt-sub truncate block">{sData.matchingRun.shoeName || 'Domyślne'}</strong>
                                </div>
                              </div>
                              {sData.matchingRun.coachFeedback && (
                                <p className="text-[11px] text-emerald-300/90 italic bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                                  "{sData.matchingRun.coachFeedback}"
                                </p>
                              )}
                            </div>
                          ) : sData.hasCompletedWorkout && sData.planItem ? (
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black txt-main text-sm">
                                  {sData.planItem.dayName}: {sData.planItem.type}
                                </h4>
                                <span className="font-mono text-emerald-400 font-bold">
                                  {sData.planItem.distanceKm} km • {sData.planItem.targetPace}
                                </span>
                              </div>
                              <p className="text-[11px] txt-sub leading-relaxed">
                                {sData.planItem.description}
                              </p>
                            </div>
                          ) : sData.dayRaces.length > 0 ? (
                            <div className="space-y-2 text-xs">
                              {sData.dayRaces.map((r) => (
                                <div key={r.id} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-black text-amber-300">{r.name}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400 text-black">
                                      {r.distanceKm} km
                                    </span>
                                  </div>
                                  <div className="text-[11px] txt-muted flex items-center gap-2">
                                    <span>{r.city}</span>
                                    <span>•</span>
                                    <span>Prognoza: <strong className="text-white">{getPredictedTime(r.distanceKm)}</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : sData.isBeforePlanStart ? (
                            <p className="text-xs txt-muted leading-relaxed">
                              Ten dzień przypada przed wygenerowaniem Twojego planu treningowego ({planStartDate || 'brak daty'}). Dni wstecz nie zawierają zaplanowanych jednostek ani sztucznych oznaczeń.
                            </p>
                          ) : sData.planItem && sData.planItem.distanceKm > 0 ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold txt-main">{sData.planItem.type} ({sData.planItem.distanceKm} km)</span>
                                <span className="txt-muted font-mono">{sData.planItem.targetPace}</span>
                              </div>
                              <p className="text-[11px] txt-muted leading-relaxed">
                                {sData.planItem.description}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs txt-muted leading-relaxed">
                              Dzień regeneracyjny. Odpoczynek, mobilność i sen.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Chronological Feed of Completed Runs & Races with 'Ukończony' badge */
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {runs.length === 0 ? (
                      <div className="p-6 text-center text-xs txt-muted space-y-1">
                        <Footprints className="w-6 h-6 mx-auto text-slate-500 opacity-60" />
                        <p>Brak jeszcze zarejestrowanych biegów w historii.</p>
                      </div>
                    ) : (
                      runs.map((r) => (
                        <div
                          key={r.id}
                          className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400 transition-all flex items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Ukończony
                              </span>
                              <span className="text-xs font-black txt-main truncate">
                                {r.title || `Bieg ${r.distanceKm} km`}
                              </span>
                            </div>
                            <div className="text-[10px] txt-muted flex items-center gap-2">
                              <span className="font-mono text-white">{r.date}</span>
                              <span>•</span>
                              <span>{r.durationMin} min</span>
                              <span>•</span>
                              <span>{r.avgPace}</span>
                              {r.shoeName && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{r.shoeName}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-mono font-black text-emerald-400">
                              {r.distanceKm} km
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 1. Wyszukiwarka Live AI Biegów 2027 */}
          <div className="liquid-glass p-4 space-y-3 border border-[var(--accent)]/40 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Wyszukiwarka Live AI & Doradca Formy 2027</span>
                </span>
                <h3 className="text-base font-black txt-main">Znajdź Start w Polsce na Sezon 2027</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                Live Gemini
              </span>
            </div>

            {/* Quick Filter Chips for 2027 Season (All race types: official, parkruns, forest trails, local town runs, charity) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 pb-2 border-b border-white/10">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Baza biegów 2027:</span>
              {[
                { id: 'all', label: '🇵🇱 Wszystkie starty 2027', cat: 'all', month: '', query: '' },
                { id: 'parkrun', label: '🌳 Parkruny (5 km bezpłatne)', cat: '5k', month: '', query: 'parkrun' },
                { id: 'trail', label: '🌲 Biegi leśne & Trail', cat: 'all', month: '', query: 'trail' },
                { id: 'charity', label: '🎗️ Charytatywne (Wings/WOSP)', cat: 'all', month: '', query: 'charytatywn' },
                { id: 'local', label: '🏙️ Lokalne i miejskie', cat: '10k', month: '', query: 'miejski' },
                { id: 'half', label: '🏅 Półmaratony', cat: 'half', month: '', query: '' },
                { id: 'marathon', label: '👑 Maratony', cat: 'marathon', month: '', query: '' },
                { id: 'spring', label: '🌸 Wiosna 2027', cat: 'all', month: '2027-03', query: '' },
                { id: 'autumn', label: '🍂 Jesień 2027', cat: 'all', month: '2027-09', query: '' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setActiveChip(chip.id);
                    setSearchDistance(chip.cat as any);
                    setSearchDateMonth(chip.month);
                    setSearchQuery(chip.query);
                    executeSearch({
                      distanceCategory: chip.cat,
                      monthOrDate: chip.month,
                      query: chip.query,
                    });
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    activeChip === chip.id
                      ? 'bg-emerald-400 text-slate-950 font-black shadow-md'
                      : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
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
                    className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] txt-muted block mb-1">Województwo</label>
                  <select
                    value={searchVoivodeship}
                    onChange={(e) => setSearchVoivodeship(e.target.value)}
                    className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none"
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
                    className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] txt-muted block mb-1">Kategoria Dystansu</label>
                  <select
                    value={searchDistance}
                    onChange={(e) => setSearchDistance(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none"
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
                className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-60 transition-all"
              >
                {isSearchingAI ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>AI przeszukuje kalendarz PZLA i analizuje Twoją formę...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-black" />
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
                        className="liquid-glass p-4 space-y-3 border border-white/10 hover:border-emerald-400 transition-all animate-ios rounded-2xl"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black txt-main">{race.name}</h4>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-white">
                                {race.distanceKm} km
                              </span>
                            </div>
                            <div className="text-[11px] txt-muted mt-0.5 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{race.city} ({race.voivodeship || 'Polska'})</span>
                              <span>•</span>
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <strong className="txt-main">{race.date}</strong>
                            </div>
                          </div>

                          {/* AI Readiness Badge */}
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 flex items-center gap-1 ${
                              isRecommended
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : isWarning
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            }`}
                          >
                            {isRecommended ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Rekomendowany</span>
                              </>
                            ) : isWarning ? (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                <span>Wymaga bazy</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                <span>Zbyt duże ryzyko</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* AI Viability & Physiological Analysis */}
                        {verdict && (
                          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-black accent-text flex items-center gap-1.5">
                                <Brain className="w-3.5 h-3.5 text-emerald-400" />
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
                            className="py-2 px-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                            title="Ustaw ten bieg jako Główny Cel Sezonu A"
                          >
                            <Star className="w-3 h-3 text-slate-950 fill-current" />
                            <span>Cel Główny A</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAddFoundRace(race)}
                            className="py-2 px-2 rounded-xl border border-white/20 bg-white/5 text-white font-bold text-[11px] hover:bg-white/15 flex items-center justify-center gap-1 transition-all active:scale-95"
                            title="Dodaj bieg do Twojego Kalendarza Sezonu 2027"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Do Kalendarza</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenOrganizerRegistration(race)}
                            className="py-2 px-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold text-[11px] hover:bg-emerald-500/20 flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
                            title="Zapisz się bezpośrednio na stronie organizatora"
                          >
                            <ExternalLink className="w-3 h-3" />
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
          <div className="liquid-glass p-4 space-y-3 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Twój Osobisty Harmonogram</span>
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
                  <Flag className="w-6 h-6 mx-auto text-slate-500 opacity-60" />
                  <p>Brak zapisanych biegów w tej kategorii. Skorzystaj z wyszukiwarki AI powyżej, aby znaleźć start!</p>
                </div>
              ) : (
                filteredRaces.map((race) => (
                  <div
                    key={race.id}
                    className="liquid-glass p-3.5 space-y-2 border border-white/10 hover:border-emerald-400 transition-all rounded-2xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black txt-main">{race.name}</h4>
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full accent-badge">
                            {race.role}
                          </span>
                        </div>
                        <div className="text-[11px] txt-muted mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{race.city}</span>
                          <span>•</span>
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{race.date} ({getDaysUntil(race.date)})</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteRace(race.id)}
                        className="text-xs txt-muted hover:text-rose-400 p-1 rounded-lg transition-colors"
                        title="Usuń bieg z kalendarza"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 rounded-xl liquid-pill text-center text-[10px]">
                      <div>
                        <span className="txt-muted block uppercase">Dystans</span>
                        <strong className="txt-main">{race.distanceKm} km</strong>
                      </div>
                      <div>
                        <span className="txt-muted block uppercase">Prognoza Czasów na Mecie</span>
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

                    {/* Actions: Direct link button to organizer registration, Fitness Predictor & Tactics */}
                    <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setTacticsModalRace(race)}
                          className="py-1.5 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold text-[10px] hover:bg-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <span>🎯</span>
                          <span>Taktyka & Pogoda</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPredictorDistanceKm(race.distanceKm);
                            setSubTab('simulator');
                            showToast(`Otwarto kalkulator prognozy formy dla dystansu ${race.distanceKm} km (${race.name})!`);
                          }}
                          className="py-1.5 px-3 rounded-xl border border-sky-400/30 bg-sky-500/10 text-sky-300 font-bold text-[10px] hover:bg-sky-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Prognoza formy na {race.distanceKm} km</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenOrganizerRegistration(race)}
                        className="py-1.5 px-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold text-[10px] hover:bg-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Zapisy organizatora</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Race Day Weather & Tactical Pacing Modal */}
      <RaceTacticsModal
        isOpen={Boolean(tacticsModalRace)}
        onClose={() => setTacticsModalRace(null)}
        race={tacticsModalRace}
        profile={profile}
        showToast={showToast}
      />
    </div>
  );
};
