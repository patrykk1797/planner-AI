import React, { useState } from 'react';
import {
  Dumbbell,
  Stethoscope,
  Footprints,
  Utensils,
  Compass,
  Activity,
  Flame,
  Zap,
  ShieldCheck,
  RotateCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { RunnerProfile, RunLog, Shoe, WeatherData, PainZone } from '../types.ts';
import { STRENGTH_EXERCISES, PAIN_ZONES_DATABASE, soundEngine } from '../utils/defaults.ts';
import {
  calculateNicotineRecovery,
  calculateWeatherAdjustment,
  calculateCarbLoading,
  calculateFuelingPlan,
  calculateDailyHydration,
} from '../utils/runningMath.ts';
import { HumanExerciseAnimation2D5 } from '../components/analytics/HumanExerciseAnimation2D5.tsx';
import { ShoeBrandLogo } from '../components/icons/ShoeBrandLogo.tsx';
import { GearFuelView } from './GearFuelView.tsx';
import { useTrainingData } from '../contexts/TrainingDataContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';

interface BodyGearViewProps {
  profile?: RunnerProfile;
  runs?: RunLog[];
  shoes?: Shoe[];
  weather?: WeatherData | null;
  onUpdateProfile?: (updated: Partial<RunnerProfile>) => void;
  onAddShoe?: (shoe: Shoe) => void;
  onUpdateShoe?: (shoe: Shoe) => void;
  onDeleteShoe?: (id: string) => void;
  onSelectMainShoe?: (id: string) => void;
  onEarnBamboos?: (amount: number, reason: string) => void;
  showToast?: (msg: string) => void;
}

export type BodyGearSubTab = 'strength' | 'technique' | 'physio' | 'shoes' | 'nutrition';

export const BodyGearView: React.FC<BodyGearViewProps> = (props) => {
  const dataCtx = useTrainingData();
  const uiCtx = useUI();

  const profile = props.profile ?? dataCtx.profile;
  const runs = props.runs ?? dataCtx.runs;
  const shoes = props.shoes ?? dataCtx.shoes;
  const weather = props.weather !== undefined ? props.weather : dataCtx.weather;
  const onUpdateProfile = props.onUpdateProfile ?? dataCtx.handleUpdateProfile;
  const onAddShoe = props.onAddShoe ?? dataCtx.handleAddShoe;
  const onUpdateShoe = props.onUpdateShoe ?? dataCtx.handleUpdateShoe;
  const onDeleteShoe = props.onDeleteShoe ?? dataCtx.handleDeleteShoe;
  const onSelectMainShoe = props.onSelectMainShoe ?? dataCtx.handleSelectMainShoe;
  const onEarnBamboos = props.onEarnBamboos ?? dataCtx.handleEarnBamboos;
  const showToast = props.showToast ?? uiCtx.showToast;

  const [subTab, setSubTab] = useState<BodyGearSubTab>('strength');

  // Exercise filters & sets
  const [selectedPackage, setSelectedPackage] = useState<'all' | 'itbs' | 'achilles' | 'core'>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<'all' | 'dom' | 'band' | 'gym'>('all');
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});

  // Physio & Pain Zone selection
  const [selectedPainId, setSelectedPainId] = useState<string | null>('pz-knee-itbs');

  const handleLogSet = (exerciseId: string, exName: string) => {
    const nextCount = (completedSets[exerciseId] || 0) + 1;
    setCompletedSets((prev) => ({ ...prev, [exerciseId]: nextCount }));
    soundEngine.playClick(true);
    onEarnBamboos(2, 'Seria ćwiczenia siłowego');
    showToast(`Odhaczono serię (${nextCount}/3): ${exName}! +2 🎋`);
  };

  const handleSelectPain = (pain: PainZone) => {
    const isCurrentlyActive = selectedPainId === pain.id || profile.activePainZones?.includes(pain.id);

    if (isCurrentlyActive) {
      setSelectedPainId(null);
      const updated = (profile.activePainZones || []).filter((id) => id !== pain.id);
      onUpdateProfile({ activePainZones: updated });
      soundEngine.playClick(true);
      showToast(`Odkliknięto ból: ${pain.label} - wyczyszczono protokół! 👍`);
    } else {
      setSelectedPainId(pain.id);
      const updated = [...(profile.activePainZones || []).filter((id) => id !== pain.id), pain.id];
      onUpdateProfile({ activePainZones: updated });
      soundEngine.playClick(true);
      showToast(`Aktywowano protokół rehabilitacyjny dla: ${pain.label}`);
    }
  };

  const handleClearAllPain = () => {
    setSelectedPainId(null);
    onUpdateProfile({ activePainZones: [] });
    soundEngine.playClick(true);
    showToast('Wyczyszczono wszystkie obszary bólowe! Wracasz do pełnego planu! 🟢');
  };

  const filteredExercises = STRENGTH_EXERCISES.filter((ex) => {
    if (selectedPackage !== 'all' && ex.package !== selectedPackage) return false;
    if (equipmentFilter !== 'all' && ex.equipment !== equipmentFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 px-4 pb-36 animate-ios">
      {/* Top 5-Subtab Selector */}
      <div className="grid grid-cols-5 gap-1 p-1 liquid-pill border border-white/10 text-[11px]">
        <button
          type="button"
          onClick={() => {
            setSubTab('strength');
            soundEngine.playClick(true);
          }}
          className={`py-2 px-1 text-center font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
            subTab === 'strength' ? 'accent-tab-active shadow-md' : 'txt-sub hover:text-white'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span className="text-[9px] truncate">Siła SVG</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('technique');
            soundEngine.playClick(true);
          }}
          className={`py-2 px-1 text-center font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
            subTab === 'technique' ? 'accent-tab-active shadow-md' : 'txt-sub hover:text-white'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="text-[9px] truncate">Technika</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('physio');
            soundEngine.playClick(true);
          }}
          className={`py-2 px-1 text-center font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
            subTab === 'physio' ? 'accent-tab-active shadow-md' : 'txt-sub hover:text-white'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span className="text-[9px] truncate">Fizjo/Ból</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('shoes');
            soundEngine.playClick(true);
          }}
          className={`py-2 px-1 text-center font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
            subTab === 'shoes' ? 'accent-tab-active shadow-md' : 'txt-sub hover:text-white'
          }`}
        >
          <Footprints className="w-3.5 h-3.5" />
          <span className="text-[9px] truncate">Szafa ({shoes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('nutrition');
            soundEngine.playClick(true);
          }}
          className={`py-2 px-1 text-center font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
            subTab === 'nutrition' ? 'accent-tab-active shadow-md' : 'txt-sub hover:text-white'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span className="text-[9px] truncate">Fitatu/Żele</span>
        </button>
      </div>

      {/* 1. ĆWICZENIA SIŁOWE Z ANIMACJAMI SVG */}
      {subTab === 'strength' && (
        <div className="space-y-4">
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  TRENING UZUPEŁNIAJĄCY DLA BIEGACZA
                </span>
                <h3 className="text-base font-black txt-main">Ćwiczenia Siłowe z Animacją Ruchu</h3>
                <p className="text-[11px] txt-muted">Ochrona pasma ITBS, ścięgna Achillesa i stabilizacja bioder</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                <Dumbbell className="w-5 h-5" />
              </div>
            </div>

            {/* Pakiet filter pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { id: 'all', label: 'Wszystkie' },
                { id: 'itbs', label: '🛡️ ITBS (Biodro/Kolano)' },
                { id: 'achilles', label: '⚡ Achilles & Rozcięgno' },
                { id: 'core', label: '🧱 Core & Brzuch' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPackage(p.id as any)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                    selectedPackage === p.id
                      ? 'bg-orange-500 text-black border-orange-400 font-black'
                      : 'border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise Cards */}
          <div className="space-y-3">
            {filteredExercises.map((ex) => {
              const setsDone = completedSets[ex.id] || 0;
              return (
                <div key={ex.id} className="liquid-glass p-3.5 space-y-3 border border-white/10">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          {ex.targetMuscle}
                        </span>
                        <span className="text-[9px] txt-muted font-mono">{ex.repsSets}</span>
                      </div>
                      <h4 className="text-xs font-black txt-main mt-1">{ex.name}</h4>
                      <p className="text-[11px] txt-muted mt-0.5 leading-relaxed">{ex.gctBenefit}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLogSet(ex.id, ex.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 active:scale-95 flex items-center gap-1 ${
                        setsDone >= 3
                          ? 'bg-emerald-500 text-black'
                          : 'bg-orange-500 hover:bg-orange-400 text-black'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{setsDone >= 3 ? 'Zrobione 3/3' : `Seria ${setsDone + 1}/3`}</span>
                    </button>
                  </div>

                  {/* 2.5D Animated SVG Exercise Skeleton */}
                  <div className="rounded-xl overflow-hidden border border-white/5 bg-slate-950/60 p-2 flex justify-center">
                    <HumanExerciseAnimation2D5 exerciseId={ex.id} exerciseName={ex.name} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. AKADEMIA TECHNIKI BIEGU */}
      {subTab === 'technique' && (
        <div className="space-y-4">
          <div className="liquid-glass p-4 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              BIOMECHANIKA & FIZJOLOGIA
            </span>
            <h3 className="text-base font-black txt-main">Akademia Techniki Biegu</h3>
            <p className="text-[11px] txt-muted leading-relaxed">
              Kluczowe wskaźniki biegowe (Kadencja, Czas Kontaktu z Podłożem GCT, Oscylacja Pionowa) decydują o ekonomii biegu i zmniejszają ryzyko kontuzji o 60%.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="liquid-glass p-3.5 space-y-2 border border-sky-400/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-sky-400">Kadencja Kroków</span>
                <span className="text-xs font-black text-sky-300">170 - 185 SPM</span>
              </div>
              <p className="text-[11px] txt-muted leading-relaxed">
                Wyższa kadencja skraca długość kroku i eliminuje lądowanie na wyprostowanej nodze daleko przed środkiem ciężkości (overstriding).
              </p>
              <div className="text-[10px] font-bold text-sky-300 bg-sky-500/10 p-2 rounded-lg">
                💡 Wskazówka: Zwiększaj rytm o 3-5 kroków co 2 tygodnie. Używaj metronomu lub playlisty 175 BPM.
              </div>
            </div>

            <div className="liquid-glass p-3.5 space-y-2 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-400">Czas Kontaktu z Podłożem (GCT)</span>
                <span className="text-xs font-black text-emerald-300">&lt; 240 ms</span>
              </div>
              <p className="text-[11px] txt-muted leading-relaxed">
                Im krótszy kontakt stopy z asfaltem, tym większy zwrot energii elastycznej ze ścięgna Achillesa i mniejsze obciążenie kolan.
              </p>
              <div className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 p-2 rounded-lg">
                💡 Wskazówka: Pomyśl o asfalcie jak o gorącej blasze – stopa ma się sprężyście odbijać, nie kleić.
              </div>
            </div>

            <div className="liquid-glass p-3.5 space-y-2 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-purple-400">Oscylacja Pionowa</span>
                <span className="text-xs font-black text-purple-300">6.0 - 8.5 cm</span>
              </div>
              <p className="text-[11px] txt-muted leading-relaxed">
                Podskakiwanie do góry marnuje cenne kalorie i glikogen. Wektor siły powinien pchać Twoje ciało do przodu, a nie w sufit.
              </p>
              <div className="text-[10px] font-bold text-purple-300 bg-purple-500/10 p-2 rounded-lg">
                💡 Wskazówka: Utrzymuj lekkie pochylenie całego ciała z kostek (ok. 5-7°), nie z biodra!
              </div>
            </div>

            <div className="liquid-glass p-3.5 space-y-2 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">Praca Rąk i Barków</span>
                <span className="text-xs font-black text-amber-300">Kąt 90°</span>
              </div>
              <p className="text-[11px] txt-muted leading-relaxed">
                Ręce stabilizują rotację tułowia. Dłonie rozluźnione (jakbyś trzymał chipsa), łokcie pracują wzdłuż żeber w tył i przód.
              </p>
              <div className="text-[10px] font-bold text-amber-300 bg-amber-500/10 p-2 rounded-lg">
                💡 Wskazówka: Nie krzyżuj rąk przed klatką piersiową, bo wymusza to rotację kolan i bioder.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. FIZJO / MAPA BÓLU I REHABILITACJA */}
      {subTab === 'physio' && (
        <div className="space-y-4">
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  FIZJOTERAPIA & PROFILAKTYKA KONTUZJI
                </span>
                <h3 className="text-base font-black txt-main">Interaktywna Mapa Bólu Biegacza</h3>
                <p className="text-[11px] txt-muted">Dotknij strefę bólu, aby uruchomić protokół powrotu do zdrowia</p>
              </div>
              {(profile.activePainZones || []).length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllPain}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30"
                >
                  Wyczyść bóle
                </button>
              )}
            </div>

            {/* Pain zones selector grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {PAIN_ZONES_DATABASE.map((zone) => {
                const isActive = (profile.activePainZones || []).includes(zone.id) || selectedPainId === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => handleSelectPain(zone)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-rose-500/20 border-rose-500 text-white font-bold'
                        : 'border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{zone.label}</span>
                      {isActive && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                    <div className="text-[10px] txt-muted mt-0.5 truncate">{zone.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Pain Detail Card */}
          {selectedPainId && (() => {
            const currentZone = PAIN_ZONES_DATABASE.find((z) => z.id === selectedPainId);
            if (!currentZone) return null;
            return (
              <div className="liquid-glass p-4 space-y-3 border border-rose-500/30 bg-rose-950/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-rose-400">Aktywny Protokół Fizjo</span>
                    <h4 className="text-sm font-black txt-main">{currentZone.label}</h4>
                    <p className="text-[11px] text-rose-300 font-bold">{currentZone.name}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Ostrożnie z obciążeniem
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-amber-300 uppercase">Modyfikacja Planu Biegu:</span>
                    <p className="text-[11px] txt-muted leading-relaxed">{currentZone.planAdjustment}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-sky-300 uppercase">Protokół Rehabilitacyjny i Ćwiczenia:</span>
                    <p className="text-[11px] txt-muted leading-relaxed">{currentZone.protocol}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick launch card for Physiologist OCR Chat (Blood Tests & Training Plans) */}
          <div className="liquid-glass p-4 space-y-2.5 border border-emerald-500/30 bg-emerald-950/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-400">
                    Moduł OCR • Morfologia & Plany
                  </span>
                  <h4 className="text-xs font-black txt-main">
                    Konsultacja OCR z Fizjologiem AI
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => uiCtx.setIsChatDrawerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10.5px] shrink-0 active:scale-95 transition-all shadow-md"
              >
                Otwórz Czat OCR ›
              </button>
            </div>
            <p className="text-[11px] txt-muted leading-relaxed">
              Prześlij zdjęcie swoich wyników badań krwi (morfologia, ferrytyna, witamina D3, CK) lub zewnętrznego planu treningowego, a Fizjolog AI odczyta tekst przez OCR i przygotuje szczegółową analizę.
            </p>
          </div>
        </div>
      )}

      {/* 4. SZAFA BUTÓW (12 MAREK, PRZEBIEGI, NASTĘPCY AI) */}
      {subTab === 'shoes' && (
        <GearFuelView
          shoes={shoes}
          runs={runs}
          profile={profile}
          onAddShoe={onAddShoe}
          onUpdateShoe={onUpdateShoe}
          onDeleteShoe={onDeleteShoe}
          onSelectMainShoe={onSelectMainShoe}
          showToast={showToast}
        />
      )}

      {/* 5. FITATU / ŻELE I NAWODNIENIE */}
      {subTab === 'nutrition' && (
        <div className="space-y-4">
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  FITATU & STRATEGIA ŻELOWA (2027)
                </span>
                <h3 className="text-base font-black txt-main">Żele Energetyczne i Węglowodany</h3>
                <p className="text-[11px] txt-muted">Kalkulator zapotrzebowania na węgle wg masy ciała ({profile.weight} kg)</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Utensils className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Węglowodany / Godz.</span>
                <div className="text-lg font-black txt-main">60 - 90 g/h</div>
                <div className="text-[10px] txt-muted">2-3 żele na 60 minut biegu</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-sky-400 uppercase">Nawodnienie / Dzień</span>
                <div className="text-lg font-black txt-main">{(((Number(profile.weight) || 70) * 35) / 1000).toFixed(1)} L</div>
                <div className="text-[10px] txt-muted">Baza + 500ml na każdą godzinę biegu</div>
              </div>
            </div>
          </div>

          {/* Carb Loading 3-day Protocol */}
          <div className="liquid-glass p-4 space-y-3">
            <h4 className="text-xs font-black txt-main uppercase tracking-wider text-amber-400">
              Protokół Ładowania Węglowodanów (Carb-Loading na 3 dni przed startem)
            </h4>
            <div className="text-[11px] txt-muted space-y-1.5 leading-relaxed">
              <p>
                Cel: Nasycenie glikogenu mięśniowego i wątrobowego na poziomie <strong>{Math.round(profile.weight * 8)} - {Math.round(profile.weight * 10)} g węglowodanów / dzień</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-[10px] font-bold text-amber-300">Dzień -3</span>
                  <div className="text-xs font-bold txt-main mt-0.5">8g / kg ({Math.round(profile.weight * 8)}g)</div>
                  <div className="text-[9px] txt-muted">Ryż basmati, owsianka, banany</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-[10px] font-bold text-amber-300">Dzień -2</span>
                  <div className="text-xs font-bold txt-main mt-0.5">9g / kg ({Math.round(profile.weight * 9)}g)</div>
                  <div className="text-[9px] txt-muted">Makarony, bataty, sok winogronowy</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-[10px] font-bold text-amber-300">Dzień -1 (Przed startem)</span>
                  <div className="text-xs font-bold txt-main mt-0.5">8g / kg ({Math.round(profile.weight * 8)}g)</div>
                  <div className="text-[9px] txt-muted">Niski błonnik, lekkostrawne posiłki</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
